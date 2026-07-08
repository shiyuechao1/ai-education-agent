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


LESSON_PLAN_PROMPT = """你是一位资深教师，请根据以下课程信息生成一份完整的结构化教案。

【基本信息】
年级：{grade}
学科：{subject}
章节：{chapter}
主题：{topic}
教学目标：{objectives}
课时：{duration_minutes} 分钟

【输出要求】
请严格按照 JSON 格式输出，包含以下 11 个字段：

{{
  "title": "教案标题",
  "grade": "{grade}",
  "subject": "{subject}",
  "objectives": ["教学目标1", "教学目标2"],
  "key_points": ["重点1", "重点2"],
  "difficult_points": ["难点1", "难点2"],
  "introduction": "课堂导入（3-5分钟）：设计情境、问题或活动引入新课，激发学生兴趣",
  "outline": ["讲授提纲步骤1：...", "步骤2：...", "步骤3：..."],
  "interactive_questions": ["互动问题1", "互动问题2"],
  "board_points": ["板书要点1：标题...", "要点2：核心公式/概念..."],
  "steps": [
    {{"phase": "导入", "duration": 5, "content": "具体活动描述", "teacher_activity": "教师行为", "student_activity": "学生行为"}},
    {{"phase": "新授", "duration": 20, "content": "核心内容讲解", "teacher_activity": "教师行为", "student_activity": "学生行为"}},
    {{"phase": "练习", "duration": 12, "content": "课堂练习活动", "teacher_activity": "教师行为", "student_activity": "学生行为"}},
    {{"phase": "总结", "duration": 5, "content": "本节课小结", "teacher_activity": "教师行为", "student_activity": "学生行为"}},
    {{"phase": "作业", "duration": 3, "content": "布置课后作业", "teacher_activity": "教师行为", "student_activity": "学生行为"}}
  ],
  "tiered_exercises": {{
    "basic": ["基础题1：适合所有学生", "基础题2"],
    "intermediate": ["提高题1：适合中等及以上学生", "提高题2"],
    "advanced": ["拓展题1：适合学有余力的学生"]
  }},
  "homework": "课后作业描述",
  "assessment": "课堂评价方式与标准"
}}

请用中文输出，内容具体、可操作，贴合{grade}{subject}教学实际。直接输出 JSON，不要额外解释。"""

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

ERROR_ANALYSIS_PROMPT = """你是一位个性化学习辅导专家。请根据学生的错题记录进行深度分析，输出个性化辅导方案。

【学生错题信息】
{error_questions}

【要求】
请输出 JSON：
{{
  "summary": "总体评价，概述学生当前学习状况（100字以内）",
  "weak_points": ["薄弱知识点1", "薄弱知识点2"],
  "error_analysis": [
    {{"stem": "原题", "student_answer": "学生答案", "correct_answer": "正确答案", "error_reason": "错因分析", "explanation": "详细解析"}}
  ],
  "suggestions": ["针对性学习建议1", "建议2", "建议3"],
  "practice_plan": [
    {{"phase": "阶段1", "focus": "重点内容", "duration_days": 3, "actions": ["具体行动1", "行动2"]}}
  ],
  "recommended_questions": [
    {{"type": "choice", "stem": "基于薄弱点的巩固题", "options": [{{"label":"A","text":"..."}}], "answer": "A", "analysis": "解析"}}
  ]
}}

请用中文输出，分析要具体、可操作。直接输出 JSON，不要额外解释。"""


def record_learning(db, student_id: int, course_id: int, activity_type: str, detail: dict | None = None):
    """记录学生学习行为。由各 API 在完成操作后调用。"""
    from app.models.entities import LearningRecord

    db.add(LearningRecord(
        student_id=student_id,
        course_id=course_id,
        activity_type=activity_type,
        detail=detail or {},
    ))
    # 不单独 commit，由调用方统一提交
