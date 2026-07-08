<script setup lang="ts">
import { Bot, CheckCircle2, Download, FileUp, GraduationCap, MessageSquare, Send, Sparkles, Trash2 } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api, type Course } from '../api/client'

const route = useRoute()
const feature = computed(() => String(route.params.feature || 'courses'))

const courses = ref<Course[]>([])
const courseId = ref<number>()
const files = ref<any[]>([])
const assignments = ref<any[]>([])
const selectedAssignmentId = ref<number>()
const questions = ref<any[]>([])
const current = ref(0)
const answers = ref<Record<number, string>>({})
const answerImages = ref<Record<number, string>>({})
const answerFileNames = ref<Record<number, string>>({})
const submissionResult = ref<any>(null)
const submissionHistory = ref<any[]>([])
const qa = ref({ question: '', answer: '', session_id: undefined as number | undefined })
const recommend = ref({ knowledge_point: '', result: null as any })
const feedback = ref({ rating: 5, content: '' })
const myFeedback = ref<any[]>([])
const uploadFile = ref<File | null>(null)
const errors = ref<any[]>([])
const tutoring = ref<any>(null)
const records = ref<any[]>([])
const learningPathForm = ref({ student_profile: '', weak_points: '' })
const learningPathResult = ref<any>(null)
const reportForm = ref({ topic: '', data: '' })
const reportResult = ref<any>(null)

const selectedCourse = computed(() => courses.value.find((item) => item.id === courseId.value))

async function load() {
  const { data } = await api.get<Course[]>('/courses/my')
  courses.value = data
  courseId.value = data[0]?.id
  await refreshCourseData()
}

async function refreshCourseData() {
  if (!courseId.value) return
  const [knowledgeRes, assignmentRes] = await Promise.all([
    api.get(`/knowledge/${courseId.value}`),
    api.get(`/assignments/course/${courseId.value}`)
  ])
  files.value = knowledgeRes.data
  assignments.value = assignmentRes.data
  await loadSubmissionHistory()
}

async function uploadKnowledge() {
  if (!courseId.value || !uploadFile.value) return
  const form = new FormData()
  form.append('file', uploadFile.value)
  await api.post(`/knowledge/${courseId.value}/upload`, form)
  uploadFile.value = null
  await refreshCourseData()
}

async function ask() {
  if (!courseId.value || !qa.value.question) return
  const { data } = await api.post('/qa/ask', {
    course_id: courseId.value,
    question: qa.value.question,
    session_id: qa.value.session_id
  })
  qa.value.answer = data.answer
  qa.value.session_id = data.session_id
}

async function loadQuestions(assignmentId: number) {
  selectedAssignmentId.value = assignmentId
  const { data } = await api.get(`/assignments/${assignmentId}/questions`)
  questions.value = data
  current.value = 0
  answers.value = {}
  answerImages.value = {}
  answerFileNames.value = {}
  submissionResult.value = null
}

async function submitAssignment() {
  if (!selectedAssignmentId.value) return
  const { data } = await api.post('/assignments/submit', {
    assignment_id: selectedAssignmentId.value,
    answers: questions.value.map((question) => ({
      question_id: question.id,
      content: answers.value[question.id] || '',
      image_path: answerImages.value[question.id] || undefined
    }))
  })
  submissionResult.value = data
  await loadSubmissionHistory()
}

async function uploadShortAnswerFile(questionId: number, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/assignments/answer-upload', form)
  answerImages.value[questionId] = data.image_path
  answerFileNames.value[questionId] = data.filename
}

async function openProtectedFile(url: string) {
  const apiPath = url.startsWith('/api') ? url.slice(4) : url
  const { data } = await api.get(apiPath, { responseType: 'blob' })
  const objectUrl = URL.createObjectURL(data)
  window.open(objectUrl, '_blank')
}

async function recommendQuestions() {
  if (!courseId.value) return
  const { data } = await api.post('/ai/recommend-questions', {
    course_id: courseId.value,
    knowledge_point: recommend.value.knowledge_point
  })
  recommend.value.result = data
}

async function sendFeedback() {
  await api.post('/feedback', feedback.value)
  feedback.value.content = ''
  await loadMyFeedback()
}

async function loadMyFeedback() {
  const { data } = await api.get('/feedback/my')
  myFeedback.value = data
}

async function loadSubmissionHistory() {
  if (!courseId.value) {
    submissionHistory.value = []
    return
  }
  const { data } = await api.get(`/assignments/my-submissions/course/${courseId.value}`)
  submissionHistory.value = data
}

function answered(questionId: number) {
  return Boolean(answers.value[questionId])
}

function questionTypeName(type: string) {
  const names: Record<string, string> = {
    choice: '选择题',
    blank: '填空题',
    judge: '判断题',
    short: '简答题'
  }
  return names[type] || type
}

function resultStatusText(result: any) {
  if (result.is_correct === null || result.is_correct === undefined) return '待教师批改'
  return result.is_correct ? '正确' : '错误'
}

async function loadErrors() {
  const { data } = await api.get('/errors/my')
  errors.value = data
}

async function removeError(id: number) {
  await api.delete(`/errors/${id}`)
  await loadErrors()
}

async function analyzeErrors() {
  if (!courseId.value) return
  const { data } = await api.post('/ai/error-analysis', {
    course_id: courseId.value,
    error_ids: [],
    include_weak_points: true
  })
  tutoring.value = data
}

async function loadRecords() {
  const { data } = await api.get('/learning/my')
  records.value = data
}

function recordLabel(type: string) {
  const labels: Record<string, string> = { qa: '智能问答', answer: '在线答题', recommend: '练习推荐' }
  return labels[type] || type
}

function questionTypeLabel(type: string) {
  const labels: Record<string, string> = { choice: '选择题', blank: '填空题', judge: '判断题', short: '简答题' }
  return labels[type] || type
}

async function generateLearningPath() {
  const { data } = await api.post('/ai/agent/run', {
    tool_name: 'learning_path',
    payload: {
      student_profile: learningPathForm.value.student_profile,
      weak_points: learningPathForm.value.weak_points.split(/[,，、\s]+/).filter(Boolean)
    }
  })
  learningPathResult.value = data.output || data
}

async function generateReport() {
  const { data } = await api.post('/ai/agent/run', {
    tool_name: 'report_generation',
    payload: {
      topic: reportForm.value.topic,
      data: reportForm.value.data ? JSON.parse(reportForm.value.data) : {}
    }
  })
  reportResult.value = data.output || data
}

function resultStatusClass(result: any) {
  return {
    success: result.is_correct === true,
    danger: result.is_correct === false
  }
}

onMounted(async () => {
  await load()
  await loadMyFeedback()
})
</script>

<template>
  <section v-if="feature === 'courses'" class="workspace-card">
    <div class="section-title">
      <h2>课程选择</h2>
      <span>{{ courses.length }} 门课程</span>
    </div>
    <div class="form-grid two">
      <label>
        当前课程
        <select v-model="courseId" @change="refreshCourseData">
          <option v-for="course in courses" :key="course.id" :value="course.id">{{ course.name }}</option>
        </select>
      </label>
      <div class="stat-tile">
        <strong>{{ selectedCourse?.name || '暂无课程' }}</strong>
        <p>{{ selectedCourse?.description || '选择课程后即可浏览知识库、答题和提问。' }}</p>
      </div>
    </div>
  </section>

  <section v-else-if="feature === 'knowledge'" class="workspace-card">
    <div class="section-title">
      <h2>知识库浏览</h2>
      <span>{{ files.length }} 个资料</span>
    </div>
    <table class="table">
      <tbody>
        <tr v-for="file in files" :key="file.id">
          <td>{{ file.filename }}</td>
          <td><span class="badge" :class="{ success: file.indexed }">{{ file.indexed ? '已索引' : '未索引' }}</span></td>
          <td><a :href="`/api/knowledge/${courseId}/download/${file.id}`"><Download :size="16" /></a></td>
        </tr>
      </tbody>
    </table>
    <div class="form-stack compact">
      <input type="file" @change="uploadFile = ($event.target as HTMLInputElement).files?.[0] || null" />
      <button @click="uploadKnowledge"><FileUp :size="18" />上传到知识库</button>
    </div>
  </section>

  <section v-else-if="feature === 'qa'" class="workspace-card">
    <div class="section-title">
      <h2>智能问答</h2>
      <span>基于课程知识库</span>
    </div>
    <div class="form-grid two">
      <div class="form-stack">
        <textarea v-model="qa.question" placeholder="向课程知识库提问" />
        <button @click="ask"><Send :size="18" />提问</button>
      </div>
      <div class="answer-box">{{ qa.answer || '回答会显示在这里。' }}</div>
    </div>
  </section>

  <section v-else-if="feature === 'assignment'" class="workspace-card">
    <div class="section-title">
      <h2>在线答题</h2>
      <span>{{ assignments.length }} 份作业</span>
    </div>
    <div class="toolbar">
      <select @change="loadQuestions(Number(($event.target as HTMLSelectElement).value))">
        <option value="">选择作业</option>
        <option v-for="item in assignments" :key="item.id" :value="item.id">{{ item.title }}</option>
      </select>
      <button v-if="selectedAssignmentId" @click="submitAssignment"><CheckCircle2 :size="18" />提交</button>
    </div>
    <div v-if="questions.length" class="answer-layout">
      <div class="question-panel">
        <h3>第 {{ current + 1 }} 题</h3>
        <p>{{ questions[current].stem }}</p>
        <div v-if="questions[current].type === 'choice'" class="form-stack">
          <button
            v-for="option in questions[current].options || []"
            :key="option.label"
            class="answer-option"
            :class="{ selected: answers[questions[current].id] === option.label }"
            @click="answers[questions[current].id] = option.label"
          >
            {{ option.label }}. {{ option.text }}
          </button>
        </div>
        <div v-else-if="questions[current].type === 'judge'" class="row">
          <button
            class="answer-option"
            :class="{ selected: answers[questions[current].id] === 'true' }"
            @click="answers[questions[current].id] = 'true'"
          >
            正确
          </button>
          <button
            class="answer-option"
            :class="{ selected: answers[questions[current].id] === 'false' }"
            @click="answers[questions[current].id] = 'false'"
          >
            错误
          </button>
        </div>
        <input
          v-else-if="questions[current].type === 'blank'"
          v-model="answers[questions[current].id]"
          class="answer-input"
          :class="{ selected: answered(questions[current].id) }"
          placeholder="请输入填空题答案"
        />
        <textarea
          v-else
          v-model="answers[questions[current].id]"
          placeholder="简答题可填写说明，并上传图片或文件"
        />
        <div v-if="questions[current].type === 'short'" class="upload-box">
          <input type="file" @change="uploadShortAnswerFile(questions[current].id, $event)" />
          <span v-if="answerFileNames[questions[current].id]" class="badge success">
            已上传：{{ answerFileNames[questions[current].id] }}
          </span>
        </div>
        <div class="row">
          <button class="secondary" :disabled="current === 0" @click="current--">上一题</button>
          <button class="secondary" :disabled="current === questions.length - 1" @click="current++">下一题</button>
        </div>
      </div>
      <aside class="question-map">
        <h3>题号总览</h3>
        <div class="question-index">
          <button
            v-for="(question, index) in questions"
            :key="question.id"
            :class="{ done: answered(question.id) }"
            @click="current = index"
          >
            {{ index + 1 }}
          </button>
        </div>
      </aside>
    </div>
    <div v-if="submissionResult" class="result-panel">
      <div class="section-title">
        <h3>答题结果</h3>
        <span>总分 {{ submissionResult.total_score }}</span>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>题型</th>
            <th>题干</th>
            <th>你的答案</th>
            <th>参考答案</th>
            <th>结果</th>
            <th>得分</th>
            <th>解析</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in submissionResult.answers" :key="item.question_id">
            <td><span class="badge">{{ questionTypeName(item.type) }}</span></td>
            <td>{{ item.stem }}</td>
            <td>
              <p>{{ item.student_answer || '未作答' }}</p>
              <button
                v-if="item.image_path"
                class="secondary"
                type="button"
                @click="openProtectedFile(item.image_path)"
              >
                查看上传文件
              </button>
            </td>
            <td>{{ item.reference_answer }}</td>
            <td>
              <span
                class="badge"
                :class="{ success: item.is_correct === true, danger: item.is_correct === false }"
              >
                {{ resultStatusText(item) }}
              </span>
            </td>
            <td>{{ item.score }} / {{ item.max_score }}</td>
            <td>{{ item.analysis || '无' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!questions.length" class="empty-state">请选择一份作业开始答题。</div>
  </section>

  <section v-else-if="feature === 'submission-history'" class="workspace-card">
    <div class="section-title">
      <h2>作答历史</h2>
      <span>{{ submissionHistory.length }} 份提交</span>
    </div>
    <div v-if="submissionHistory.length" class="submission-list">
      <article v-for="record in submissionHistory" :key="record.id" class="submission-card">
        <div class="submission-header">
          <div>
            <h3>{{ record.assignment_title }}</h3>
            <p class="muted">{{ record.assignment_description || '无作业说明' }}</p>
            <p class="muted">提交时间：{{ record.submitted_at }}</p>
          </div>
          <div class="score-pill">总分 {{ record.total_score }}</div>
        </div>

        <div class="answer-records">
          <section v-for="answer in record.answers" :key="answer.answer_id" class="answer-record">
            <div class="answer-record-head">
              <span class="badge">{{ questionTypeName(answer.type) }}</span>
              <span class="badge" :class="resultStatusClass(answer)">{{ resultStatusText(answer) }}</span>
              <strong>{{ answer.score }} / {{ answer.max_score }} 分</strong>
            </div>
            <p class="question-stem">{{ answer.stem }}</p>
            <div class="answer-meta">
              <div>
                <span>我的答案</span>
                <p>{{ answer.student_answer || '未作答' }}</p>
                <button
                  v-if="answer.image_path"
                  class="secondary"
                  type="button"
                  @click="openProtectedFile(answer.image_path)"
                >
                  查看上传文件
                </button>
              </div>
              <div>
                <span>参考答案</span>
                <p>{{ answer.reference_answer }}</p>
              </div>
              <div>
                <span>教师批阅</span>
                <p>{{ answer.teacher_comment || (answer.type === 'short' ? '教师暂未批阅' : '自动判分') }}</p>
              </div>
            </div>
            <div class="reply-box">解析：{{ answer.analysis || '无' }}</div>
          </section>
        </div>
      </article>
    </div>
    <div v-else class="empty-state">当前课程暂无历史作答记录。</div>
  </section>

  <section v-else-if="feature === 'recommendation'" class="workspace-card">
    <div class="section-title">
      <h2>题目推荐</h2>
      <span>一次生成 5 题</span>
    </div>
    <div class="form-grid two">
      <div class="form-stack">
        <input v-model="recommend.knowledge_point" placeholder="输入知识点" />
        <button @click="recommendQuestions"><Sparkles :size="18" />推荐练习</button>
      </div>
      <pre>{{ recommend.result || '推荐结果将在这里展示' }}</pre>
    </div>
  </section>

  <section v-else-if="feature === 'errors'" class="workspace-card">
    <div class="section-title">
      <h2>错题本</h2>
      <span>{{ errors.length }} 道错题</span>
    </div>
    <div class="toolbar">
      <button @click="loadErrors">刷新</button>
      <button v-if="errors.length" @click="analyzeErrors"><Bot :size="18" />智能分析</button>
    </div>

    <!-- 错题列表 -->
    <div v-if="errors.length" class="answer-records">
      <article v-for="err in errors" :key="err.id" class="answer-record">
        <div class="answer-record-head">
          <span class="badge">{{ questionTypeLabel(err.type) }}</span>
          <span class="badge" :class="{ danger: true }">✗ 错误</span>
          <button class="secondary mini-button" @click="removeError(err.id)"><Trash2 :size="14" /></button>
        </div>
        <p class="question-stem">{{ err.stem }}</p>
        <div class="answer-meta">
          <div><span>我的答案</span><p>{{ err.wrong_answer || '未作答' }}</p></div>
          <div><span>正确答案</span><p>{{ err.answer }}</p></div>
          <div><span>解析</span><p>{{ err.analysis || '无' }}</p></div>
        </div>
      </article>
    </div>
    <div v-else class="empty-state">暂无错题，完成练习后自动收集。</div>

    <!-- 个性化辅导方案 -->
    <div v-if="tutoring" class="tutoring-panel">
      <div class="section-title"><h2>🤖 个性化辅导方案</h2></div>
      <div class="lesson-section" v-if="tutoring.summary">
        <h4>📊 总体评价</h4><p>{{ tutoring.summary }}</p>
      </div>
      <div class="lesson-section" v-if="tutoring.weak_points?.length">
        <h4>⚠️ 薄弱知识点</h4>
        <ul><li v-for="w in tutoring.weak_points" :key="w">{{ w }}</li></ul>
      </div>
      <div class="lesson-section" v-if="tutoring.error_analysis?.length">
        <h4>🔍 每题解析</h4>
        <div v-for="(ea, i) in tutoring.error_analysis" :key="i" class="step-card">
          <p><strong>{{ ea.stem }}</strong></p>
          <p>错因：{{ ea.error_reason }}</p>
          <p>解析：{{ ea.explanation }}</p>
        </div>
      </div>
      <div class="lesson-section" v-if="tutoring.suggestions?.length">
        <h4>💡 学习建议</h4>
        <ul><li v-for="s in tutoring.suggestions" :key="s">{{ s }}</li></ul>
      </div>
      <div class="lesson-section" v-if="tutoring.recommended_questions?.length">
        <h4>📝 推荐巩固练习</h4>
        <div v-for="(q, i) in tutoring.recommended_questions" :key="i" class="step-card">
          <span class="badge">{{ questionTypeLabel(q.type) }}</span>
          <p><strong>{{ q.stem }}</strong></p>
          <p v-if="q.options?.length">选项：{{ q.options.map((o: any) => o.label + '. ' + o.text).join('；') }}</p>
          <details><summary>查看答案</summary><p>答案：{{ q.answer }} | {{ q.analysis }}</p></details>
        </div>
      </div>
    </div>
  </section>

  <section v-else-if="feature === 'learning-path'" class="workspace-card">
    <div class="section-title">
      <h2>个性化学习路径</h2>
      <span>AI 分析薄弱点生成学习计划</span>
    </div>
    <div class="form-grid two">
      <div class="form-stack">
        <textarea v-model="learningPathForm.student_profile" placeholder="你的学习情况（如：八年级，数学基础中等）" />
        <input v-model="learningPathForm.weak_points" placeholder="薄弱知识点（用逗号分隔，如：勾股定理,全等三角形）" />
        <button @click="generateLearningPath"><Bot :size="18" />生成学习路径</button>
      </div>
      <div class="lesson-preview" v-if="learningPathResult">
        <div class="lesson-section" v-if="learningPathResult.summary">
          <h4>📊 路径概览</h4><p>{{ learningPathResult.summary }}</p>
        </div>
        <div class="lesson-section" v-if="learningPathResult.stages?.length">
          <h4>🗺️ 学习阶段</h4>
          <div v-for="(s, i) in learningPathResult.stages" :key="i" class="step-card">
            <span class="badge">阶段 {{ i + 1 }}</span>
            <p>{{ s }}</p>
          </div>
        </div>
        <div class="lesson-section" v-if="learningPathResult.resources?.length">
          <h4>📚 推荐资源</h4>
          <ul><li v-for="(r, i) in learningPathResult.resources" :key="i">{{ r }}</li></ul>
        </div>
        <div class="lesson-section" v-if="learningPathResult.practice_plan?.length">
          <h4>📝 练习计划</h4>
          <div v-for="(p, i) in learningPathResult.practice_plan" :key="i" class="step-card">
            <span class="badge">{{ p }}</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">填写学习情况后生成个性化路径</div>
    </div>
  </section>

  <section v-else-if="feature === 'agent-report'" class="workspace-card">
    <div class="section-title">
      <h2>学习报告</h2>
      <span>AI 生成综合学习分析</span>
    </div>
    <div class="form-grid two">
      <div class="form-stack">
        <input v-model="reportForm.topic" placeholder="报告主题（如：期中学习总结）" />
        <textarea v-model="reportForm.data" placeholder='数据（JSON格式，如：{{"score":85,"days":30}}）' />
        <button @click="generateReport"><Bot :size="18" />生成报告</button>
      </div>
      <div class="lesson-preview" v-if="reportResult">
        <h3>{{ reportResult.title || '学习报告' }}</h3>
        <div class="lesson-section" v-if="reportResult.highlights?.length">
          <h4>🌟 亮点</h4>
          <ul><li v-for="(h, i) in reportResult.highlights" :key="i">{{ h }}</li></ul>
        </div>
        <div class="lesson-section" v-if="reportResult.risks?.length">
          <h4>⚠️ 需关注</h4>
          <ul><li v-for="(r, i) in reportResult.risks" :key="i">{{ r }}</li></ul>
        </div>
        <div class="lesson-section" v-if="reportResult.suggestions?.length">
          <h4>💡 建议</h4>
          <ul><li v-for="(s, i) in reportResult.suggestions" :key="i">{{ s }}</li></ul>
        </div>
      </div>
      <div v-else class="empty-state">填写报告主题生成学习报告</div>
    </div>
  </section>

  <section v-else-if="feature === 'records'" class="workspace-card">
    <div class="section-title">
      <h2>学习记录</h2>
      <span>{{ records.length }} 条记录</span>
    </div>
    <button class="secondary" @click="loadRecords">刷新</button>

    <table v-if="records.length" class="table" style="margin-top:12px">
      <thead>
        <tr><th>类型</th><th>详情</th><th>时间</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in records" :key="r.id">
          <td><span class="badge">{{ recordLabel(r.activity_type) }}</span></td>
          <td>{{ r.detail?.question || r.detail?.assignment_id ? '查看详情' : '-' }}</td>
          <td>{{ r.created_at }}</td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty-state">暂无学习记录，完成课程活动后自动生成。</div>
  </section>

  <section v-else class="workspace-card">
    <div class="section-title">
      <h2>反馈评价</h2>
      <span>提交给管理员</span>
    </div>
    <div class="form-stack compact">
      <input v-model.number="feedback.rating" type="number" min="1" max="5" />
      <textarea v-model="feedback.content" placeholder="向管理员反馈系统体验" />
      <button @click="sendFeedback"><MessageSquare :size="18" />提交反馈</button>
    </div>
    <div class="feedback-history">
      <h3>我的反馈记录</h3>
      <div v-if="myFeedback.length" class="feedback-list">
        <article v-for="item in myFeedback" :key="item.id" class="feedback-record">
          <div class="feedback-record-head">
            <span class="badge">评分 {{ item.rating }}</span>
            <span class="muted">{{ item.created_at }}</span>
          </div>
          <p>{{ item.content }}</p>
          <div class="reply-box">管理员回复：{{ item.reply || '暂未回复' }}</div>
        </article>
      </div>
      <div v-else class="empty-state">暂无反馈记录。</div>
    </div>
  </section>
</template>
