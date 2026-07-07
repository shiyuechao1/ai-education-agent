from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.services.llm import invoke_text


settings = get_settings()


class RagService:
    """LangChain + Milvus RAG service.

    处理流程：
    1. 解析上传资料，按文件类型提取文本。
    2. 清洗空白字符与异常片段。
    3. 使用 RecursiveCharacterTextSplitter 分块。
    4. 使用 DashScope Embedding 写入 Milvus。
    5. 检索时取 top-k 文档，并由简单重排逻辑优先保留关键词命中高的片段。
    6. 若检索不到有效上下文，触发拒答逻辑，避免脱离课程知识库乱答。
    """

    def _load_text(self, file_path: str) -> str:
        path = Path(file_path)
        suffix = path.suffix.lower()
        if suffix in {".txt", ".md"}:
            return path.read_text(encoding="utf-8", errors="ignore")
        if suffix == ".pdf":
            from langchain_community.document_loaders import PyPDFLoader

            return "\n".join(page.page_content for page in PyPDFLoader(str(path)).load())
        from langchain_community.document_loaders import UnstructuredFileLoader

        return "\n".join(doc.page_content for doc in UnstructuredFileLoader(str(path)).load())

    def _clean(self, text: str) -> str:
        return "\n".join(line.strip() for line in text.splitlines() if line.strip())

    def _vector_store(self):
        from langchain_community.embeddings import DashScopeEmbeddings
        from langchain_milvus import Milvus

        embeddings = DashScopeEmbeddings(dashscope_api_key=settings.qwen_api_key)
        return Milvus(
            embedding_function=embeddings,
            collection_name=settings.milvus_collection,
            connection_args={"uri": settings.milvus_uri},
            auto_id=True,
        )

    def ingest_file(self, *, course_id: int, file_id: int, file_path: str, filename: str) -> int:
        if not settings.qwen_api_key:
            return 0
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        text = self._clean(self._load_text(file_path))
        splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)
        docs = splitter.create_documents(
            [text],
            metadatas=[{"course_id": course_id, "file_id": file_id, "filename": filename}],
        )
        self._vector_store().add_documents(docs)
        return len(docs)

    def retrieve(self, *, course_id: int, question: str, top_k: int = 5) -> list[dict[str, Any]]:
        if not settings.qwen_api_key:
            return []
        store = self._vector_store()
        docs = store.similarity_search(
            question,
            k=top_k * 2,
            expr=f"course_id == {course_id}",
        )
        terms = set(question.lower().split())
        ranked = sorted(
            docs,
            key=lambda doc: sum(1 for term in terms if term in doc.page_content.lower()),
            reverse=True,
        )
        return [
            {"content": doc.page_content, "metadata": doc.metadata}
            for doc in ranked[:top_k]
            if doc.page_content.strip()
        ]

    def answer(self, *, course_id: int, question: str) -> dict[str, Any]:
        contexts = self.retrieve(course_id=course_id, question=question)
        if not contexts:
            return {
                "answer": "课程知识库中没有找到足够相关的内容，暂时无法基于资料回答该问题。",
                "citations": [],
            }
        context_text = "\n\n".join(
            f"[{idx + 1}] {item['content']}" for idx, item in enumerate(contexts)
        )
        prompt = f"""请只根据课程知识库回答问题。若资料不足，请明确说明不能回答。
问题：{question}
资料：
{context_text}
请给出简明回答，并在末尾标注引用编号。"""
        return {"answer": invoke_text(prompt), "citations": [item["metadata"] for item in contexts]}


rag_service = RagService()
