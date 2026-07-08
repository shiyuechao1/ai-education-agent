import type { Role } from '../api/client'

export interface FeatureItem {
  key: string
  label: string
  description: string
  icon: string
}

export const roleFeatures: Record<Role, FeatureItem[]> = {
  teacher: [
    { key: 'courses', label: '课程选择', description: '切换当前课程并查看课程基础信息', icon: 'BookOpen' },
    { key: 'knowledge', label: '知识库上传', description: '上传教材、教案等资料并同步构建 RAG 索引', icon: 'FileUp' },
    { key: 'lesson', label: '智能教案', description: '基于课程主题、目标和课时生成结构化教案', icon: 'Wand2' },
    { key: 'question-bank-create', label: '添加题库', description: '创建课程题库并填写题库描述', icon: 'PlusSquare' },
    { key: 'question-add', label: '添加题目', description: '选择现有题库并录入题目', icon: 'ListChecks' },
    { key: 'question-bank-view', label: '题库查看', description: '查看题库明细并管理题目', icon: 'Library' },
    { key: 'assignments', label: '作业发布', description: '组合题目并发布给课程学生作答', icon: 'ClipboardList' },
    { key: 'submission-records', label: '作答记录', description: '查看每个学生的作业作答记录并批改简答题', icon: 'ClipboardCheck' },
    { key: 'qa-history', label: '问答记录', description: '查看学生智能问答历史并导出 PDF', icon: 'MessagesSquare' },
    { key: 'feedback', label: '反馈评价', description: '向管理员提交系统使用反馈', icon: 'MessageSquare' }
  ],
  student: [
    { key: 'courses', label: '课程选择', description: '选择课程并进入对应学习空间', icon: 'BookOpen' },
    { key: 'knowledge', label: '知识库浏览', description: '查看、下载教师上传的课程资料', icon: 'FolderOpen' },
    { key: 'qa', label: '智能问答', description: '基于课程知识库进行问答', icon: 'Bot' },
    { key: 'assignment', label: '在线答题', description: '完成选择、填空、判断和简答题作业', icon: 'PenTool' },
    { key: 'recommendation', label: '练习推荐', description: '输入知识点获取 5 道个性化练习', icon: 'Sparkles' },
    { key: 'errors', label: '错题本', description: '查看错题收藏，获取错因分析与个性化辅导方案', icon: 'ClipboardCheck' },
    { key: 'records', label: '学习记录', description: '查看自己的学习活动历史', icon: 'GraduationCap' },
    { key: 'learning-path', label: '学习路径', description: 'AI 根据薄弱点生成个性化学习路径与计划', icon: 'Bot' },
    { key: 'agent-report', label: '学习报告', description: 'AI 生成学习报告与改进建议', icon: 'BarChart3' },
    { key: 'feedback', label: '反馈评价', description: '向管理员提交系统使用反馈', icon: 'MessageSquare' }
  ],
  admin: [
    { key: 'create-user', label: '用户创建', description: '创建教师或学生账号并生成八位编号', icon: 'UserPlus' },
    { key: 'create-course', label: '课程创建', description: '选择教师和学生组建课程', icon: 'PlusSquare' },
    { key: 'dashboard', label: '可视化看板', description: '查看平台用户、课程、知识库和作业数据', icon: 'BarChart3' },
    { key: 'users', label: '用户信息', description: '查看所有教师和学生注册信息', icon: 'Users' },
    { key: 'courses', label: '课程列表', description: '查看平台课程基础信息', icon: 'Library' },
    { key: 'sql-agent', label: '数据查询', description: '使用自然语言或 SQL 查询教学数据', icon: 'Bot' },
    { key: 'feedback', label: '反馈回复', description: '接收并回复教师、学生反馈', icon: 'MessageSquareReply' }
  ]
}

export function defaultFeature(role: Role): string {
  return roleFeatures[role][0].key
}

export function hasFeature(role: Role, feature: string): boolean {
  return roleFeatures[role].some((item) => item.key === feature)
}
