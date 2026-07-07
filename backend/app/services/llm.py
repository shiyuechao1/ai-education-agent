import json
from typing import Any

from app.core.config import get_settings


settings = get_settings()


def get_chat_model():
    """Return a Qwen chat model using DashScope's OpenAI-compatible endpoint.

    The import is intentionally local so the rest of the backend can still start
    when AI dependencies are not installed yet.
    """
    if not settings.qwen_api_key:
        return None
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        api_key=settings.qwen_api_key,
        base_url=settings.qwen_base_url,
        model=settings.qwen_model,
        temperature=0.3,
    )


def invoke_text(prompt: str) -> str:
    model = get_chat_model()
    if model is None:
        return "未配置 QWEN_API_KEY，当前返回占位内容。请在 .env 中配置千问 API Key 后重试。"
    return model.invoke(prompt).content


def invoke_json(prompt: str, fallback: dict[str, Any]) -> dict[str, Any]:
    text = invoke_text(prompt)
    try:
        cleaned = text.strip().removeprefix("```json").removesuffix("```").strip()
        return json.loads(cleaned)
    except Exception:
        fallback["raw"] = text
        return fallback


LESSON_PLAN_PROMPT = """你是资深教师，请根据课程信息生成结构化教案。
主题：{topic}
教学目标：{objectives}
时长：{duration_minutes} 分钟
请输出 JSON，字段包含 title、objectives、key_points、steps、activities、homework、assessment。
"""

QUESTION_RECOMMEND_PROMPT = """你是个性化学习辅导智能体。
知识点：{knowledge_point}
请生成 5 道题，题型覆盖 choice、blank、judge、short。输出 JSON 数组。
每题包含 type、stem、options、answer、analysis、score。
"""

ANSWER_EXPLAIN_PROMPT = """请讲解这道题的答案，并指出常见错因。
题目：{stem}
参考答案：{answer}
学生答案：{student_answer}
"""
