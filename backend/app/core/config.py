"""
应用配置模块
使用 pydantic-settings 从 .env 文件和环境变量加载配置

环境适配说明：
- 开发环境默认使用 SQLite + ChromaDB，零外部依赖即可启动
- 生产环境可切换为 MySQL + Milvus（修改 .env 即可）
"""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ========== 基础 ==========
    app_name: str = "AI Education Assistant"
    app_env: str = "dev"
    secret_key: str = "dev-secret-change-in-production"
    access_token_expire_minutes: int = 1440  # 24 小时

    # ========== 数据库 ==========
    # 默认 SQLite（本地开发零配置）
    # 切换 MySQL 时设置: mysql+mysql://root:password@127.0.0.1:3306/ai_education
    database_url: str = "sqlite:///./ai_education.db"

    # MySQL 配置（仅在切换为 MySQL 时需要）
    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = "33550336"
    mysql_database: str = "ai_education"

    # ========== LLM (千问 / OpenAI 兼容) ==========
    qwen_api_key: str = ""
    qwen_model: str = "qwen-plus"
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"

    # ========== 向量数据库 ==========
    # 默认 ChromaDB（本地轻量级，零配置）
    chroma_persist_dir: str = "./chroma_data"

    # Milvus 配置（仅在切换为 Milvus 时需要）
    milvus_uri: str = "http://127.0.0.1:19530"
    milvus_collection: str = "ai_education_knowledge"

    # ========== Embedding ==========
    # 可选值: "local"（本地 sentence-transformers，零配置）或 "dashscope"（千问 API）
    embedding_provider: str = "local"
    # 本地 Embedding 模型名（HuggingFace 格式）
    local_embedding_model: str = "shibing624/text2vec-base-chinese"

    # ========== Redis（可选，缓存 & 限流） ==========
    redis_host: str = "127.0.0.1"
    redis_port: int = 6379
    redis_enabled: bool = True            # 设为 False 可关闭 Redis（Redis 不可用时自动降级）

    # ========== 文件上传 ==========
    upload_dir: str = "./app/storage/uploads"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def chroma_path(self) -> Path:
        path = Path(self.chroma_persist_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()
