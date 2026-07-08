"""
LangChain + ChromaDB RAG 服务。

处理流程：
1. 解析上传资料，按文件类型提取文本（PDF / Word / TXT / MD）。
2. 清洗空白字符与异常片段。
3. 使用 RecursiveCharacterTextSplitter 分块（chunk_size=800, overlap=120）。
4. 使用 Embedding 模型向量化后写入 ChromaDB。
5. 检索时取 top-k 文档，通过关键词命中重排优先保留最相关的片段。
6. 若检索不到有效上下文，触发拒答逻辑，避免脱离课程知识库乱答。
7. Redis 语义缓存：相同问题 1 小时内秒回，Redis 不可用时自动降级。
"""
import hashlib
import json
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.core.redis import cache_get, cache_set
from app.services.llm import invoke_text

settings = get_settings()


def _get_embeddings():
    """根据配置返回 Embedding 实例。

    - local: HuggingFaceEmbeddings（本地 CPU 推理，离线可用）
    - dashscope: DashScopeEmbeddings（需千问 API Key）
    """
    if settings.embedding_provider == "dashscope" and settings.qwen_api_key:
        from langchain_community.embeddings import DashScopeEmbeddings

        return DashScopeEmbeddings(dashscope_api_key=settings.qwen_api_key)

    # 默认走本地 Embedding
    from langchain_community.embeddings import HuggingFaceEmbeddings

    return HuggingFaceEmbeddings(
        model_name=settings.local_embedding_model,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )


class RagService:
    """LangChain + ChromaDB RAG service。

    使用方法：
        rag = RagService()
        rag.ingest_file(course_id=1, file_id=10, file_path="/tmp/doc.pdf", filename="数学第一章.pdf")
        result = rag.answer(course_id=1, question="什么是勾股定理")
    """

    def _load_docs(self, file_path: str) -> list:
        """解析文件为 Document 列表，PDF 保留页码。"""
        from langchain_core.documents import Document
        path = Path(file_path)
        suffix = path.suffix.lower()

        if suffix in {".txt", ".md"}:
            text = path.read_text(encoding="utf-8", errors="ignore")
            return [Document(page_content=text, metadata={"page": 0})]

        if suffix == ".pdf":
            from langchain_community.document_loaders import PyPDFLoader
            return PyPDFLoader(str(path)).load()

        if suffix == ".docx":
            from langchain_community.document_loaders import Docx2txtLoader
            return Docx2txtLoader(str(path)).load()

        from langchain_community.document_loaders import UnstructuredFileLoader
        return UnstructuredFileLoader(str(path)).load()

    def _clean(self, text: str) -> str:
        """基础文本清洗：去空行、去首尾空白。"""
        return "\n".join(line.strip() for line in text.splitlines() if line.strip())

    def _vector_store(self):
        """获取 ChromaDB 向量存储实例。

        每次调用重新实例化，ChromaLib 内部会复用持久化数据。
        """
        from langchain_chroma import Chroma

        return Chroma(
            embedding_function=_get_embeddings(),
            collection_name="ai_education_knowledge",
            persist_directory=str(settings.chroma_path),
        )

    # ---------- 公开方法 ----------

    def ingest_file(self, *, course_id: int, file_id: int, file_path: str, filename: str) -> int:
        """将文件解析、分块、写入 ChromaDB，PDF 保留页码。

        返回：写入的 chunk 数量。
        """
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        raw_docs = self._load_docs(file_path)
        if not raw_docs:
            return 0

        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=80)
        total = 0
        for doc in raw_docs:
            text = self._clean(doc.page_content)
            if not text.strip():
                continue
            page = doc.metadata.get("page", 0)
            chunks = splitter.create_documents(
                [text],
                metadatas=[{
                    "course_id": course_id,
                    "file_id": file_id,
                    "filename": filename,
                    "page": page,
                }],
            )
            if chunks:
                self._vector_store().add_documents(chunks)
                total += len(chunks)
        return total

    def retrieve(self, *, course_id: int, question: str, top_k: int = 3) -> list[dict[str, Any]]:
        """从 ChromaDB 检索与问题最相关的课程文档片段。

        策略：
        1. 先拿 top_k * 2 条候选
        2. 按问题关键词在文档中命中次数重排
        3. 取 top_k 条非空结果
        """
        store = self._vector_store()
        docs = store.similarity_search(
            question,
            k=top_k * 2,
            filter={"course_id": course_id},
        )

        terms = set(question.lower().split())
        ranked = sorted(
            docs,
            key=lambda doc: sum(1 for term in terms if term in doc.page_content.lower()),
            reverse=True,
        )
        return [
            {"content": doc.page_content, "metadata": doc.metadata, "page": doc.metadata.get("page", 0)}
            for doc in ranked[:top_k]
            if doc.page_content.strip()
        ]

    def get_page_image(self, file_path: str, page: int) -> bytes | None:
        """用 PyMuPDF 渲染 PDF 指定页为 PNG 字节。"""
        try:
            import fitz  # PyMuPDF
            pdf = fitz.open(file_path)
            if page < 0 or page >= pdf.page_count:
                pdf.close()
                return None
            p = pdf[page]
            # 720 DPI 高清晰度
            pix = p.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")
            pdf.close()
            return img_bytes
        except Exception:
            return None

    def answer(self, *, course_id: int, question: str) -> dict[str, Any]:
        """RAG 问答：检索 + 大模型生成回答。

        返回：{"answer": str, "citations": list[dict]}
        Redis 缓存：相同问题 1 小时内秒回，Redis 不可用时自动降级。
        """
        # 查 Redis 缓存
        cache_key = f"rag:{course_id}:{hashlib.md5(question.encode()).hexdigest()}"
        cached = cache_get(cache_key)
        if cached:
            try:
                return json.loads(cached)
            except json.JSONDecodeError:
                pass

        contexts = self.retrieve(course_id=course_id, question=question)
        if not contexts:
            return {
                "answer": "课程知识库中没有找到足够相关的内容，暂时无法基于资料回答该问题。",
                "citations": [],
            }

        context_text = "\n\n".join(
            f"[{idx + 1}] {item['content']}" for idx, item in enumerate(contexts)
        )
        prompt = (
            "请只根据课程知识库回答问题。若资料不足，请明确说明不能回答。\n"
            f"问题：{question}\n"
            f"资料：\n{context_text}\n"
            "请给出简明回答，并在末尾标注引用编号。"
        )
        result = {
            "answer": invoke_text(prompt),
            "citations": [item["metadata"] for item in contexts],
            "pages": list(set(item.get("page", 0) for item in contexts)),
        }
        # 写入缓存
        cache_set(cache_key, json.dumps(result, ensure_ascii=False), ttl_seconds=3600)
        return result


# 全局单例 — 所有 API 模块共用同一实例
rag_service = RagService()
