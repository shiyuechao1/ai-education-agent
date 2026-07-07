CREATE DATABASE IF NOT EXISTS ai_education
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE ai_education;

-- FastAPI 启动时会通过 SQLAlchemy 自动创建表。
-- 如需重建数据库，可先 DROP DATABASE ai_education; 再执行本脚本。
