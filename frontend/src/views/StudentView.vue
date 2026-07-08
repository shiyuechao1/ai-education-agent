<script setup lang="ts">
import { CheckCircle2, Download, FileUp, MessageSquare, Send, Sparkles } from 'lucide-vue-next'
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
