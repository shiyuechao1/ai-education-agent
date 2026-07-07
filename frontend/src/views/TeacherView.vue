<script setup lang="ts">
import { Download, FileUp, MessageSquare, Plus, Send, Wand2 } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api, type Course } from '../api/client'

const route = useRoute()
const feature = computed(() => String(route.params.feature || 'courses'))

const courses = ref<Course[]>([])
const courseId = ref<number>()
const files = ref<any[]>([])
const assignments = ref<any[]>([])
const sessions = ref<any[]>([])
const feedback = ref({ rating: 5, content: '' })
const lesson = ref({ topic: '', objectives: '', duration_minutes: 45 })
const lessonResult = ref<any>(null)
const optionText = ref('A. 选项一\nB. 选项二')
const bank = ref({
  name: '默认题库',
  questions: [{ type: 'choice', stem: '', options: [] as any[], answer: '', analysis: '', score: 5 }]
})
const assignment = ref({ title: '', description: '', question_ids: '' })
const uploadEditable = ref(false)
const uploadFile = ref<File | null>(null)

const selectedCourse = computed(() => courses.value.find((item) => item.id === courseId.value))

async function load() {
  const { data } = await api.get<Course[]>('/courses/my')
  courses.value = data
  courseId.value = courseId.value || data[0]?.id
  await refreshCourseData()
}

async function refreshCourseData() {
  if (!courseId.value) return
  const [knowledgeRes, assignmentRes, sessionRes] = await Promise.all([
    api.get(`/knowledge/${courseId.value}`),
    api.get(`/assignments/course/${courseId.value}`),
    api.get(`/qa/course/${courseId.value}/sessions`)
  ])
  files.value = knowledgeRes.data
  assignments.value = assignmentRes.data
  sessions.value = sessionRes.data
}

async function uploadKnowledge() {
  if (!courseId.value || !uploadFile.value) return
  const form = new FormData()
  form.append('file', uploadFile.value)
  await api.post(`/knowledge/${courseId.value}/upload?editable_by_students=${uploadEditable.value}`, form)
  uploadFile.value = null
  await refreshCourseData()
}

async function generateLesson() {
  if (!courseId.value) return
  const { data } = await api.post('/ai/lesson-plan', { course_id: courseId.value, ...lesson.value })
  lessonResult.value = data
}

function parseOptions() {
  return optionText.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(/[.、]/)
      return { label: label.trim(), text: rest.join('.').trim() }
    })
}

async function createBank() {
  if (!courseId.value) return
  const payload = {
    course_id: courseId.value,
    name: bank.value.name,
    questions: [{ ...bank.value.questions[0], options: parseOptions() }]
  }
  await api.post('/assignments/banks', payload)
  bank.value.questions[0].stem = ''
  bank.value.questions[0].answer = ''
  bank.value.questions[0].analysis = ''
}

async function createAssignment() {
  if (!courseId.value) return
  await api.post('/assignments', {
    course_id: courseId.value,
    title: assignment.value.title,
    description: assignment.value.description,
    question_ids: assignment.value.question_ids.split(',').map((id) => Number(id.trim())).filter(Boolean)
  })
  assignment.value.title = ''
  assignment.value.question_ids = ''
  await refreshCourseData()
}

async function sendFeedback() {
  await api.post('/feedback', feedback.value)
  feedback.value.content = ''
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
        <p>{{ selectedCourse?.description || '选择课程后，其他功能将围绕当前课程执行。' }}</p>
      </div>
    </div>
  </section>

  <section v-else-if="feature === 'knowledge'" class="workspace-card">
    <div class="section-title">
      <h2>知识库上传</h2>
      <span>{{ files.length }} 个文件</span>
    </div>
    <div class="form-grid two">
      <div class="form-stack">
        <input type="file" @change="uploadFile = ($event.target as HTMLInputElement).files?.[0] || null" />
        <label class="check-line"><input v-model="uploadEditable" type="checkbox" />允许学生编辑知识库</label>
        <button @click="uploadKnowledge"><FileUp :size="18" />上传并索引</button>
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
    </div>
  </section>

  <section v-else-if="feature === 'lesson'" class="workspace-card">
    <div class="section-title">
      <h2>智能教案编写</h2>
      <span>结构化输出</span>
    </div>
    <div class="form-grid two">
      <div class="form-stack">
        <input v-model="lesson.topic" placeholder="课程主题" />
        <textarea v-model="lesson.objectives" placeholder="教学目标" />
        <input v-model.number="lesson.duration_minutes" type="number" />
        <button @click="generateLesson"><Wand2 :size="18" />生成教案</button>
      </div>
      <pre>{{ lessonResult || '生成结果将在这里展示' }}</pre>
    </div>
  </section>

  <section v-else-if="feature === 'question-bank'" class="workspace-card">
    <div class="section-title">
      <h2>题库管理</h2>
      <span>支持四类题型</span>
    </div>
    <div class="form-stack compact">
      <input v-model="bank.name" placeholder="题库名称" />
      <select v-model="bank.questions[0].type">
        <option value="choice">选择题</option>
        <option value="blank">填空题</option>
        <option value="judge">判断题</option>
        <option value="short">简答题</option>
      </select>
      <textarea v-model="bank.questions[0].stem" placeholder="题干" />
      <textarea v-if="bank.questions[0].type === 'choice'" v-model="optionText" placeholder="每行一个选项，如 A. 选项" />
      <input v-model.number="bank.questions[0].score" type="number" placeholder="分值" />
      <input v-model="bank.questions[0].answer" placeholder="参考答案" />
      <textarea v-model="bank.questions[0].analysis" placeholder="解析" />
      <button @click="createBank"><Plus :size="18" />创建题库</button>
    </div>
  </section>

  <section v-else-if="feature === 'assignments'" class="workspace-card">
    <div class="section-title">
      <h2>作业发布</h2>
      <span>{{ assignments.length }} 份作业</span>
    </div>
    <div class="form-grid two">
      <div class="form-stack">
        <input v-model="assignment.title" placeholder="作业标题" />
        <textarea v-model="assignment.description" placeholder="作业说明" />
        <input v-model="assignment.question_ids" placeholder="题目 ID，用英文逗号分隔" />
        <button @click="createAssignment"><Send :size="18" />发布作业</button>
      </div>
      <table class="table">
        <tbody>
          <tr v-for="item in assignments" :key="item.id">
            <td>{{ item.title }}</td>
            <td>{{ item.created_at }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section v-else-if="feature === 'qa-history'" class="workspace-card">
    <div class="section-title">
      <h2>学生问答记录</h2>
      <span>{{ sessions.length }} 条会话</span>
    </div>
    <table class="table">
      <tbody>
        <tr v-for="session in sessions" :key="session.id">
          <td>{{ session.title }}</td>
          <td>{{ session.created_at }}</td>
          <td><a :href="`/api/qa/sessions/${session.id}/export`">导出 PDF</a></td>
        </tr>
      </tbody>
    </table>
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
