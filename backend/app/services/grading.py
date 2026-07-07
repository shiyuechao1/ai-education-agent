from app.models.entities import Question, QuestionType


def normalize_answer(value: str | None) -> str:
    return (value or "").strip().lower()


def auto_grade(question: Question, answer: str | None) -> tuple[bool | None, float]:
    if question.type == QuestionType.short:
        return None, 0
    is_correct = normalize_answer(answer) == normalize_answer(question.answer)
    return is_correct, question.score if is_correct else 0
