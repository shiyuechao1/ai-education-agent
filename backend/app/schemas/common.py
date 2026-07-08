from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


RoleLiteral = Literal["admin", "teacher", "student"]
QuestionTypeLiteral = Literal["choice", "blank", "judge", "short"]


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: RoleLiteral


class UserBase(BaseModel):
    username: str
    name: str
    role: RoleLiteral
    entry_year: int = 2026


class UserCreate(UserBase):
    password: str = Field(min_length=6)
    confirm_password: str = Field(min_length=6)


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_no: str
    is_active: bool
    created_at: datetime


class PasswordChange(BaseModel):
    username: str | None = None
    old_password: str
    new_password: str = Field(min_length=6)
    confirm_password: str = Field(min_length=6)


class CourseCreate(BaseModel):
    name: str
    description: str | None = None
    teacher_id: int
    student_ids: list[int] = []


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    teacher_id: int
    created_at: datetime


class KnowledgeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    filename: str
    content_type: str | None
    editable_by_students: bool
    indexed: bool
    created_at: datetime


class QuestionCreate(BaseModel):
    type: QuestionTypeLiteral
    stem: str
    options: list[dict[str, Any]] | None = None
    answer: str
    analysis: str | None = None
    score: float = Field(ge=0)


class QuestionOut(QuestionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bank_id: int


class QuestionBankCreate(BaseModel):
    course_id: int
    name: str
    questions: list[QuestionCreate] = []


class QuestionBankOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    name: str
    created_by: int
    created_at: datetime


class AssignmentCreate(BaseModel):
    course_id: int
    title: str
    description: str | None = None
    question_ids: list[int]


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    description: str | None
    published: bool
    created_at: datetime


class AnswerIn(BaseModel):
    question_id: int
    content: str | None = None
    image_path: str | None = None


class SubmissionCreate(BaseModel):
    assignment_id: int
    answers: list[AnswerIn]


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assignment_id: int
    student_id: int
    total_score: float
    submitted_at: datetime


class AnswerResult(BaseModel):
    question_id: int
    type: QuestionTypeLiteral
    stem: str
    student_answer: str | None
    image_path: str | None = None
    reference_answer: str
    is_correct: bool | None
    score: float
    max_score: float
    analysis: str | None = None
    teacher_comment: str | None = None


class SubmissionResult(SubmissionOut):
    answers: list[AnswerResult]


class ManualGrade(BaseModel):
    answer_id: int
    score: float = Field(ge=0)
    teacher_comment: str | None = None


class ChatAsk(BaseModel):
    course_id: int
    question: str
    session_id: int | None = None


class ChatAnswer(BaseModel):
    session_id: int
    answer: str
    citations: list[dict[str, Any]] = []
    pages: list[int] = []


class FeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    content: str


class FeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    rating: int
    content: str
    reply: str | None
    created_at: datetime


class FeedbackReply(BaseModel):
    reply: str


class LessonPlanRequest(BaseModel):
    course_id: int
    topic: str          # 章节主题，如"勾股定理"
    grade: str = ""     # 年级，如"八年级"
    subject: str = ""   # 学科，如"数学"
    chapter: str = ""   # 章节，如"第十七章 勾股定理"
    objectives: str     # 教学目标
    duration_minutes: int = 45


class RecommendationRequest(BaseModel):
    course_id: int
    knowledge_point: str


class AgentRunRequest(BaseModel):
    tool_name: str
    payload: dict[str, Any] = {}


# ---- 错题收藏 ----
class ErrorCreate(BaseModel):
    question_id: int
    wrong_answer: str | None = None


class ErrorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    question_id: int
    wrong_answer: str | None
    created_at: datetime
    # 附加题目信息
    stem: str | None = None
    type: str | None = None
    answer: str | None = None
    analysis: str | None = None


# ---- 学习记录 ----
class LearningRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    course_id: int
    activity_type: str
    detail: dict[str, Any] | None
    created_at: datetime


# ---- 错题分析与辅导方案 ----
class ErrorAnalysisRequest(BaseModel):
    course_id: int
    error_ids: list[int] = []       # 指定错题 ID，留空则分析全部错题
    include_weak_points: bool = True  # 是否输出薄弱点诊断


class TutoringPlanOut(BaseModel):
    summary: str                          # 总体评价
    weak_points: list[str] = []           # 薄弱知识点
    error_analysis: list[dict[str, Any]] = []  # 每题解析
    suggestions: list[str] = []           # 学习建议
    practice_plan: list[dict[str, Any]] = []  # 练习计划
    recommended_questions: list[dict[str, Any]] = []  # 推荐补充练习
