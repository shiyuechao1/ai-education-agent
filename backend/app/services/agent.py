from collections.abc import Callable
from typing import Any

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.entities import AgentTask
from app.services.llm import invoke_json
from app.services.rag import rag_service


ToolFunc = Callable[[dict[str, Any], Session], dict[str, Any]]


class McpAgentService:
    """MCP-style tool registry for teaching workflows.

    这里使用 MCP 的工具抽象方式封装能力：每个工具都有 name、description、
    input_schema，并通过 call_tool 执行。后续如果接入真正的 MCP Server，
    可以将 list_tools/call_tool 映射到 JSON-RPC 的 tools/list 与 tools/call。
    """

    def __init__(self) -> None:
        self._tools: dict[str, tuple[str, dict[str, Any], ToolFunc]] = {}
        self.register(
            "knowledge_retrieval",
            "检索课程知识库",
            {"course_id": "int", "question": "str"},
            self._knowledge_retrieval,
        )
        self.register(
            "question_generation",
            "按知识点生成 5 道练习题",
            {"knowledge_point": "str"},
            self._question_generation,
        )
        self.register(
            "learning_path",
            "生成个性化学习路径",
            {"student_profile": "str", "weak_points": "list[str]"},
            self._learning_path,
        )
        self.register(
            "report_generation",
            "生成学习或教学报告",
            {"topic": "str", "data": "object"},
            self._report_generation,
        )
        self.register(
            "teaching_data_sql",
            "只读教学数据 SQL Agent",
            {"sql": "str"},
            self._teaching_data_sql,
        )
        self.register(
            "streaming_voice_qa",
            "语音问答文本转写后的流式问答入口",
            {"course_id": "int", "transcript": "str"},
            self._streaming_voice_qa,
        )

    def register(self, name: str, description: str, input_schema: dict[str, Any], func: ToolFunc) -> None:
        self._tools[name] = (description, input_schema, func)

    def list_tools(self) -> list[dict[str, Any]]:
        return [
            {"name": name, "description": desc, "input_schema": schema}
            for name, (desc, schema, _) in self._tools.items()
        ]

    def call_tool(self, name: str, payload: dict[str, Any], db: Session) -> dict[str, Any]:
        if name not in self._tools:
            raise ValueError(f"未知工具：{name}")
        return self._tools[name][2](payload, db)

    def run_with_task_record(self, *, user_id: int, name: str, payload: dict[str, Any], db: Session) -> AgentTask:
        task = AgentTask(user_id=user_id, tool_name=name, input_payload=payload, status="running")
        db.add(task)
        db.commit()
        try:
            task.output_payload = self.call_tool(name, payload, db)
            task.status = "succeeded"
        except Exception as exc:
            task.retry_count += 1
            task.status = "failed"
            task.error_message = str(exc)
        db.commit()
        db.refresh(task)
        return task

    def _knowledge_retrieval(self, payload: dict[str, Any], _: Session) -> dict[str, Any]:
        return rag_service.answer(course_id=int(payload["course_id"]), question=payload["question"])

    def _question_generation(self, payload: dict[str, Any], _: Session) -> dict[str, Any]:
        prompt = f"""围绕知识点“{payload['knowledge_point']}”生成 5 道题。
输出 JSON：{{"questions":[{{"type":"","stem":"","options":[],"answer":"","analysis":"","score":0}}]}}"""
        return invoke_json(prompt, {"questions": []})

    def _learning_path(self, payload: dict[str, Any], _: Session) -> dict[str, Any]:
        prompt = f"""为学生制定学习路径。
学生画像：{payload.get('student_profile')}
薄弱点：{payload.get('weak_points')}
输出 JSON：{{"summary":"","stages":[],"resources":[],"practice_plan":[]}}"""
        return invoke_json(prompt, {"summary": "", "stages": [], "resources": [], "practice_plan": []})

    def _report_generation(self, payload: dict[str, Any], _: Session) -> dict[str, Any]:
        prompt = f"""根据数据生成报告。
主题：{payload.get('topic')}
数据：{payload.get('data')}
输出 JSON：{{"title":"","highlights":[],"risks":[],"suggestions":[]}}"""
        return invoke_json(prompt, {"title": "", "highlights": [], "risks": [], "suggestions": []})

    def _teaching_data_sql(self, payload: dict[str, Any], db: Session) -> dict[str, Any]:
        sql = str(payload.get("sql", "")).strip()
        if not sql.lower().startswith("select"):
            raise ValueError("SQL Agent 仅允许 SELECT 查询")
        rows = db.execute(text(sql)).mappings().fetchmany(100)
        return {"rows": [dict(row) for row in rows]}

    def _streaming_voice_qa(self, payload: dict[str, Any], _: Session) -> dict[str, Any]:
        course_id = int(payload["course_id"])
        transcript = str(payload.get("transcript", ""))
        result = rag_service.answer(course_id=course_id, question=transcript)
        return {"mode": "voice_transcript", **result}


agent_service = McpAgentService()
