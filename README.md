# 毕业实习项目

这是一个按 `demand.md` 生成的工程化项目，包含 Vue 前端、FastAPI 后端、MySQL 数据库脚本、LangChain + Milvus RAG 模块，以及 MCP 风格 Agent 工具封装。不使用 Docker。

## 项目结构

```text
backend/     FastAPI 后端服务
frontend/    Vue 3 + Vite 前端工程
database/    MySQL 初始化脚本
demand.md    原始需求
```

## 后端启动

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

先在 MySQL 执行：

```sql
source database/init.sql;
```

默认管理员账号会在首次启动时创建：

```text
用户名：admin
密码：admin123
```

千问 API Key 请写入 `backend/.env` 的 `QWEN_API_KEY`。为了避免密钥泄露，项目代码中没有硬编码真实密钥。

## 前端启动

```bash
cd frontend
npm install
npm run dev
```

默认访问：`http://127.0.0.1:5173`

## 已实现模块

- 基础登录、修改密码、JWT 鉴权
- 管理员：用户创建、课程创建、用户列表、反馈接收与回复、可视化看板
- 教师端：课程选择、知识库上传与授权、题库创建、教案生成、作业发布、问答记录导出 PDF、反馈评价
- 学生端：课程选择、知识库浏览/下载、授权后上传、RAG 智能问答、在线答题、题目推荐、反馈评价
- 后端业务对象：教师、学生、课程、课程成员、题库、题目、作业、提交、答案、学习问答记录、知识库、反馈、Agent 任务
- RAG：资料解析、文本清洗、分块、Milvus 索引、检索重排、引用展示、无关问题拒答
- 大模型：教案生成、题目推荐、答案讲解扩展入口
- Agent：知识检索、题目生成、学习路径规划、教学数据 SQL Agent、流式语音问答入口、报告生成工具，支持 MCP JSON-RPC 入口、任务状态记录与失败重试计数

## 注意事项

- PDF 中文字体可按部署环境继续配置，目前导出逻辑使用 ReportLab 默认字体。
- Milvus、MySQL、Node、Python 环境由你本地自行安装配置。
- 题干和选项图片上传的数据库字段已预留，前端目前提供基础录入入口，可继续扩展成独立图片上传控件。
