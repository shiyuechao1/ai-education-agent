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
const qa = ref({ question: '', answer: '', session_id: undefined as number | undefined })
const recommend = ref({ knowledge_point: '', result: null as any })
const feedback = ref({ rating: 5, content: '' })
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
}

async function submitAssignment() {
  if (!selectedAssignmentId.value) return
  await api.post('/assignments/submit', {
    assignment_id: selectedAssignmentId.value,
    answers: questions.value.map((question) => ({
      question_id: question.id,
      content: answers.value[question.id] || ''
    }))
  })
  alert('提交成功')
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
}

function answered(questionId: number) {
  return Boolean(answers.value[questionId])
}

onMounted(load)
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
            class="secondary"
            @click="answers[questions[current].id] = option.label"
          >
            {{ option.label }}. {{ option.text }}
          </button>
        </div>
        <div v-else-if="questions[current].type === 'judge'" class="row">
          <button class="secondary" @click="answers[questions[current].id] = 'true'">正确</button>
          <button class="secondary" @click="answers[questions[current].id] = 'false'">错误</button>
        </div>
        <textarea v-else v-model="answers[questions[current].id]" placeholder="填空题输入答案；简答题可填写图片地址或说明" />
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
    <div v-else class="empty-state">请选择一份作业开始答题。</div>
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
  </section>
</template>
