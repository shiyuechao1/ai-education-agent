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
const selectedRecordAssignmentId = ref<number>()
const submissionRecords = ref<any[]>([])
const gradingDrafts = ref<Record<number, { score: number; teacher_comment: string }>>({})
const sessions = ref<any[]>([])
const questionBanks = ref<any[]>([])
const selectedBankId = ref<number>()
const selectedQuestionBankId = ref<number>()
const bankQuestions = ref<any[]>([])
const feedback = ref({ rating: 5, content: '' })
const lesson = ref({ topic: '', objectives: '', duration_minutes: 45 })
const lessonResult = ref<any>(null)
const bank = ref({
  name: '默认题库',
  description: '',
  questions: [
    {
      type: 'choice',
      stem: '',
      options: [
        { label: 'A', text: '' },
        { label: 'B', text: '' }
      ] as any[],
      answer: '',
      analysis: '',
      score: 5
    }
  ]
})
const assignment = ref({ title: '', description: '', question_ids: '' })
const uploadEditable = ref(false)
const uploadFile = ref<File | null>(null)

const selectedCourse = computed(() => courses.value.find((item) => item.id === courseId.value))
const selectedBank = computed(() => questionBanks.value.find((item) => item.id === selectedBankId.value))
const editingQuestion = computed(() => bank.value.questions[0])

async function load() {
  const { data } = await api.get<Course[]>('/courses/my')
  courses.value = data
  courseId.value = courseId.value || data[0]?.id
  await refreshCourseData()
}

async function refreshCourseData() {
  if (!courseId.value) return
  const [knowledgeRes, assignmentRes, sessionRes, bankRes] = await Promise.all([
    api.get(`/knowledge/${courseId.value}`),
    api.get(`/assignments/course/${courseId.value}`),
    api.get(`/qa/course/${courseId.value}/sessions`),
    api.get(`/assignments/banks/course/${courseId.value}`)
  ])
  files.value = knowledgeRes.data
  assignments.value = assignmentRes.data
  sessions.value = sessionRes.data
  questionBanks.value = bankRes.data
  if (!questionBanks.value.some((item) => item.id === selectedBankId.value)) {
    selectedBankId.value = questionBanks.value[0]?.id
  }
  if (!questionBanks.value.some((item) => item.id === selectedQuestionBankId.value)) {
    selectedQuestionBankId.value = questionBanks.value[0]?.id
  }
  await loadBankQuestions()
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

function relabelOptions() {
  editingQuestion.value.options = editingQuestion.value.options.map((option, index) => ({
    ...option,
    label: String.fromCharCode(65 + index)
  }))
}

function addChoiceOption() {
  editingQuestion.value.options.push({
    label: String.fromCharCode(65 + editingQuestion.value.options.length),
    text: ''
  })
}

function removeChoiceOption(index: number) {
  const removed = editingQuestion.value.options[index]
  editingQuestion.value.options.splice(index, 1)
  relabelOptions()
  if (editingQuestion.value.answer === removed?.label) {
    editingQuestion.value.answer = ''
  }
}

function setAnswer(answer: string) {
  editingQuestion.value.answer = answer
}

function handleQuestionTypeChange() {
  editingQuestion.value.answer = ''
  if (editingQuestion.value.type === 'choice' && editingQuestion.value.options.length < 2) {
    editingQuestion.value.options = [
      { label: 'A', text: '' },
      { label: 'B', text: '' }
    ]
  }
}

async function createBank() {
  if (!courseId.value) return
  const { data } = await api.post('/assignments/banks', {
    course_id: courseId.value,
    name: bank.value.name,
    description: bank.value.description,
    questions: []
  })
  bank.value.name = ''
  bank.value.description = ''
  selectedQuestionBankId.value = data.id
  selectedBankId.value = data.id
  await refreshCourseData()
}

async function addQuestionToSelectedBank() {
  if (!selectedQuestionBankId.value) return
  const question = editingQuestion.value
  await api.post(`/assignments/banks/${selectedQuestionBankId.value}/questions`, {
    ...question,
    options: question.type === 'choice' ? question.options : null
  })
  editingQuestion.value.stem = ''
  editingQuestion.value.answer = ''
  editingQuestion.value.analysis = ''
  editingQuestion.value.options = [
    { label: 'A', text: '' },
    { label: 'B', text: '' }
  ]
  await refreshCourseData()
}

async function deleteQuestionBank(bankId: number) {
  if (!window.confirm('确定删除该题库吗？未被作业使用的题目会一并删除。')) return
  try {
    await api.delete(`/assignments/banks/${bankId}`)
    if (selectedBankId.value === bankId) {
      selectedBankId.value = undefined
      bankQuestions.value = []
    }
    if (selectedQuestionBankId.value === bankId) {
      selectedQuestionBankId.value = undefined
    }
    await refreshCourseData()
  } catch (error: any) {
    alert(error?.response?.data?.detail || '删除题库失败')
  }
}

async function deleteQuestion(questionId: number) {
  if (!window.confirm('确定删除该题目吗？已被作业或作答记录使用的题目不能删除。')) return
  try {
    await api.delete(`/assignments/questions/${questionId}`)
    await refreshCourseData()
  } catch (error: any) {
    alert(error?.response?.data?.detail || '删除题目失败')
  }
}

async function loadBankQuestions(bankId = selectedBankId.value) {
  if (!bankId) {
    bankQuestions.value = []
    return
  }
  selectedBankId.value = bankId
  const { data } = await api.get(`/assignments/banks/${bankId}/questions`)
  bankQuestions.value = data
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

function formatOptions(options: any[] | null) {
  if (!options?.length) return '无'
  return options.map((item) => `${item.label}. ${item.text}`).join('；')
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

async function loadSubmissionRecords(assignmentId = selectedRecordAssignmentId.value) {
  if (!assignmentId) {
    submissionRecords.value = []
    return
  }
  selectedRecordAssignmentId.value = assignmentId
  const { data } = await api.get(`/assignments/${assignmentId}/submissions/detail`)
  submissionRecords.value = data
  const drafts: Record<number, { score: number; teacher_comment: string }> = {}
  for (const record of data) {
    for (const answer of record.answers) {
      if (answer.type === 'short') {
        drafts[answer.answer_id] = {
          score: answer.score || 0,
          teacher_comment: answer.teacher_comment || ''
        }
      }
    }
  }
  gradingDrafts.value = drafts
}

async function gradeShortAnswer(answer: any) {
  const draft = gradingDrafts.value[answer.answer_id]
  if (!draft) return
  await api.put('/assignments/grade', {
    answer_id: answer.answer_id,
    score: Number(draft.score),
    teacher_comment: draft.teacher_comment
  })
  await loadSubmissionRecords()
}

async function openProtectedFile(url: string) {
  const apiPath = url.startsWith('/api') ? url.slice(4) : url
  const { data } = await api.get(apiPath, { responseType: 'blob' })
  const objectUrl = URL.createObjectURL(data)
  window.open(objectUrl, '_blank')
}

function answerStatusText(answer: any) {
  if (answer.type === 'short' && (answer.is_correct === null || answer.is_correct === undefined)) return '待批改'
  if (answer.is_correct === null || answer.is_correct === undefined) return '未判定'
  return answer.is_correct ? '正确' : '错误'
}

function answerStatusClass(answer: any) {
  return {
    success: answer.is_correct === true,
    danger: answer.is_correct === false
  }
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

  <section v-else-if="feature === 'question-bank-create'" class="workspace-card">
    <div class="section-title">
      <h2>添加题库</h2>
      <span>创建课程题库</span>
    </div>
    <div class="bank-create-panel">
      <label>
        题库名称
        <input v-model="bank.name" placeholder="例如：第一章基础题库" />
      </label>
      <label>
        题库描述
        <textarea v-model="bank.description" placeholder="输入题库适用章节、知识点范围或使用说明" />
      </label>
      <button type="button" class="bank-create-submit" @click="createBank"><Plus :size="16" />添加题库</button>
    </div>
  </section>

  <section v-else-if="feature === 'question-add'" class="workspace-card">
    <div class="section-title">
      <h2>添加题目</h2>
      <span>选择现有题库后录入题目</span>
    </div>
    <div class="form-stack compact">
        <select v-model.number="selectedQuestionBankId">
          <option :value="undefined">请选择题库</option>
          <option v-for="item in questionBanks" :key="item.id" :value="item.id">
            {{ item.name }} · {{ item.question_count }} 道题
          </option>
        </select>
        <select v-model="bank.questions[0].type" @change="handleQuestionTypeChange">
          <option value="choice">选择题</option>
          <option value="blank">填空题</option>
          <option value="judge">判断题</option>
          <option value="short">简答题</option>
        </select>
        <textarea v-model="bank.questions[0].stem" placeholder="题干" />
        <div v-if="bank.questions[0].type === 'choice'" class="option-editor">
          <div v-for="(option, index) in bank.questions[0].options" :key="option.label" class="option-row">
            <button
              type="button"
              class="answer-option"
              :class="{ selected: bank.questions[0].answer === option.label }"
              @click="setAnswer(option.label)"
            >
              {{ option.label }}
            </button>
            <input v-model="option.text" :placeholder="`选项 ${option.label} 内容`" />
            <button
              type="button"
              class="secondary"
              :disabled="bank.questions[0].options.length <= 2"
              @click="removeChoiceOption(index)"
            >
              删除
            </button>
          </div>
          <button type="button" class="secondary" @click="addChoiceOption"><Plus :size="18" />添加选项</button>
        </div>
        <div v-else-if="bank.questions[0].type === 'judge'" class="row">
          <button
            type="button"
            class="answer-option"
            :class="{ selected: bank.questions[0].answer === 'true' }"
            @click="setAnswer('true')"
          >
            正确
          </button>
          <button
            type="button"
            class="answer-option"
            :class="{ selected: bank.questions[0].answer === 'false' }"
            @click="setAnswer('false')"
          >
            错误
          </button>
        </div>
        <input v-model.number="bank.questions[0].score" type="number" placeholder="分值" />
        <input
          v-if="bank.questions[0].type === 'blank' || bank.questions[0].type === 'short'"
          v-model="bank.questions[0].answer"
          placeholder="参考答案"
        />
        <div v-else class="selected-answer">当前参考答案：{{ bank.questions[0].answer || '请点击上方按钮设置' }}</div>
        <textarea v-model="bank.questions[0].analysis" placeholder="解析" />
        <button :disabled="!selectedQuestionBankId" @click="addQuestionToSelectedBank">
          <Plus :size="18" />添加题目到题库
        </button>
    </div>
  </section>

  <section v-else-if="feature === 'question-bank-view'" class="workspace-card">
    <div class="section-title">
      <h2>题库查看</h2>
      <span>{{ questionBanks.length }} 个题库 · {{ bankQuestions.length }} 道题</span>
    </div>
    <div class="bank-manage-panel">
        <div v-if="questionBanks.length" class="bank-browser">
          <aside class="bank-list">
            <div
              v-for="item in questionBanks"
              :key="item.id"
              class="bank-button"
              :class="{ active: selectedBankId === item.id }"
              @click="loadBankQuestions(item.id)"
            >
              <span>
                <strong>{{ item.name }}</strong>
                <span>{{ item.question_count }} 道题</span>
              </span>
              <button
                type="button"
                class="danger mini-button"
                @click.stop="deleteQuestionBank(item.id)"
              >
                删除
              </button>
            </div>
          </aside>
          <div class="question-list">
            <div class="bank-summary">
              <div>
                <p class="eyebrow">当前题库</p>
                <h3>{{ selectedBank?.name }}</h3>
              </div>
              <span class="badge success">{{ selectedBank?.question_count || 0 }} 道题</span>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>题型</th>
                  <th>题干</th>
                  <th>选项</th>
                  <th>答案</th>
                  <th>分值</th>
                  <th>解析</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="question in bankQuestions" :key="question.id">
                  <td>{{ question.id }}</td>
                  <td><span class="badge">{{ questionTypeName(question.type) }}</span></td>
                  <td>{{ question.stem }}</td>
                  <td>{{ formatOptions(question.options) }}</td>
                  <td>{{ question.answer }}</td>
                  <td>{{ question.score }}</td>
                  <td>{{ question.analysis || '无' }}</td>
                  <td>
                    <button type="button" class="danger" @click="deleteQuestion(question.id)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="!bankQuestions.length" class="empty-state">当前题库还没有题目。</div>
          </div>
        </div>
        <div v-else class="empty-state">当前课程暂无题库，请先到“添加题库”模块创建。</div>
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

  <section v-else-if="feature === 'submission-records'" class="workspace-card">
    <div class="section-title">
      <h2>作答记录</h2>
      <span>{{ submissionRecords.length }} 份提交</span>
    </div>
    <div class="toolbar">
      <select @change="loadSubmissionRecords(Number(($event.target as HTMLSelectElement).value))">
        <option value="">选择作业</option>
        <option v-for="item in assignments" :key="item.id" :value="item.id">{{ item.title }}</option>
      </select>
    </div>

    <div v-if="submissionRecords.length" class="submission-list">
      <article v-for="record in submissionRecords" :key="record.id" class="submission-card">
        <div class="submission-header">
          <div>
            <h3>{{ record.student.name }}</h3>
            <p class="muted">{{ record.student.user_no }} · {{ record.student.username }}</p>
          </div>
          <div class="score-pill">总分 {{ record.total_score }}</div>
        </div>

        <div class="answer-records">
          <section v-for="answer in record.answers" :key="answer.answer_id" class="answer-record">
            <div class="answer-record-head">
              <span class="badge">{{ questionTypeName(answer.type) }}</span>
              <span class="badge" :class="answerStatusClass(answer)">{{ answerStatusText(answer) }}</span>
              <strong>{{ answer.score }} / {{ answer.max_score }} 分</strong>
            </div>
            <p class="question-stem">{{ answer.stem }}</p>
            <div class="answer-meta">
              <div>
                <span>学生答案</span>
                <p>{{ answer.student_answer || '未作答' }}</p>
                <button
                  v-if="answer.image_path"
                  class="secondary"
                  type="button"
                  @click="openProtectedFile(answer.image_path)"
                >
                  查看上传数据
                </button>
              </div>
              <div>
                <span>参考答案</span>
                <p>{{ answer.reference_answer }}</p>
              </div>
              <div>
                <span>解析</span>
                <p>{{ answer.analysis || '无' }}</p>
              </div>
            </div>

            <div v-if="answer.type === 'short'" class="grading-box">
              <input
                v-model.number="gradingDrafts[answer.answer_id].score"
                type="number"
                min="0"
                :max="answer.max_score"
                placeholder="简答题得分"
              />
              <input
                v-model="gradingDrafts[answer.answer_id].teacher_comment"
                placeholder="教师评语"
              />
              <button @click="gradeShortAnswer(answer)">保存评分</button>
            </div>
          </section>
        </div>
      </article>
    </div>
    <div v-else class="empty-state">请选择作业查看学生作答记录。</div>
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
