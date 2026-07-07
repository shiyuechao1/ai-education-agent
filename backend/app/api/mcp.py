from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.entities import User
from app.services.agent import agent_service


router = APIRouter(prefix="/mcp", tags=["mcp"])


class JsonRpcRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: str | int | None = None
    method: str
    params: dict[str, Any] = {}


@router.post("/rpc")
def mcp_rpc(
    request: JsonRpcRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        if request.method == "initialize":
            result = {
                "protocolVersion": "2024-11-05",
                "serverInfo": {"name": "ai-education-agent", "version": "1.0.0"},
                "capabilities": {"tools": {}},
            }
        elif request.method == "tools/list":
            result = {"tools": agent_service.list_tools()}
        elif request.method == "tools/call":
            name = request.params.get("name")
            arguments = request.params.get("arguments", {})
            task = agent_service.run_with_task_record(
                user_id=current_user.id,
                name=name,
                payload=arguments,
                db=db,
            )
            result = {"task_id": task.id, "status": task.status, "content": task.output_payload}
        else:
            raise ValueError(f"不支持的 MCP 方法：{request.method}")
        return {"jsonrpc": "2.0", "id": request.id, "result": result}
    except Exception as exc:
        return {"jsonrpc": "2.0", "id": request.id, "error": {"code": -32000, "message": str(exc)}}
