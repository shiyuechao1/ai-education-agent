<script setup lang="ts">
import { MessageSquareReply, Plus, RefreshCcw, UserPlus } from 'lucide-vue-next'
import * as echarts from 'echarts'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api/client'

const route = useRoute()
const feature = computed(() => String(route.params.feature || 'create-user'))

const users = ref<any[]>([])
const courses = ref<any[]>([])
const feedback = ref<any[]>([])
const stats = ref<Record<string, number>>({})
const userForm = ref({
  username: '',
  name: '',
  role: 'student',
  entry_year: 2026,
  password: '',
  confirm_password: ''
})
const courseForm = ref({
  name: '',
  description: '',
  teacher_id: undefined as number | undefined,
  student_ids: [] as number[]
})

const teachers = computed(() => users.value.filter((item) => item.role === 'teacher'))
const students = computed(() => users.value.filter((item) => item.role === 'student'))

async function load() {
  const [userRes, courseRes, feedbackRes, statRes] = await Promise.all([
    api.get('/admin/users'),
    api.get('/admin/courses'),
    api.get('/admin/feedback'),
    api.get('/analytics/dashboard')
  ])
  users.value = userRes.data
  courses.value = courseRes.data
  feedback.value = feedbackRes.data
  stats.value = statRes.data
  await renderChartIfNeeded()
}

async function createUser() {
  await api.post('/admin/users', userForm.value)
  userForm.value.username = ''
  userForm.value.name = ''
  userForm.value.password = ''
  userForm.value.confirm_password = ''
  await load()
}

async function createCourse() {
  await api.post('/admin/courses', {
    name: courseForm.value.name,
    description: courseForm.value.description,
    teacher_id: Number(courseForm.value.teacher_id),
    student_ids: courseForm.value.student_ids
  })
  courseForm.value.name = ''
  courseForm.value.student_ids = []
  await load()
}

function toggleStudent(studentId: number) {
  const selected = courseForm.value.student_ids
  if (selected.includes(studentId)) {
    courseForm.value.student_ids = selected.filter((id) => id !== studentId)
    return
  }
  courseForm.value.student_ids = [...selected, studentId]
}

async function reply(item: any) {
  await api.put(`/admin/feedback/${item.id}/reply`, { reply: item.reply })
  await load()
}

async function renderChartIfNeeded() {
  if (feature.value !== 'dashboard') return
  await nextTick()
  const node = document.getElementById('dashboard-chart')
  if (!node) return
  const chart = echarts.getInstanceByDom(node) || echarts.init(node)
  chart.setOption({
    color: ['#146c94', '#2f8f5b'],
    grid: { top: 30, right: 20, bottom: 40, left: 40 },
    tooltip: {},
    xAxis: { type: 'category', data: Object.keys(stats.value), axisLabel: { rotate: 25 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', barWidth: 28, data: Object.values(stats.value) }]
  })
}

watch(feature, renderChartIfNeeded)
onMounted(load)
</script>

<template>
  <section v-if="feature === 'create-user'" class="workspace-card">
    <div class="section-title">
      <h2>用户创建</h2>
      <span>自动生成八位编号</span>
    </div>
    <div class="form-stack compact">
      <input v-model="userForm.username" placeholder="用户名" />
      <input v-model="userForm.name" placeholder="姓名" />
      <select v-model="userForm.role">
        <option value="teacher">教师</option>
        <option value="student">学生</option>
      </select>
      <input v-model.number="userForm.entry_year" type="number" />
      <input v-model="userForm.password" type="password" placeholder="登录密码" />
      <input v-model="userForm.confirm_password" type="password" placeholder="确认密码" />
      <button @click="createUser"><UserPlus :size="18" />创建用户</button>
    </div>
  </section>

  <section v-else-if="feature === 'create-course'" class="workspace-card">
    <div class="section-title">
      <h2>课程创建</h2>
      <span>{{ teachers.length }} 位教师可选</span>
    </div>
    <div class="form-stack compact">
      <input v-model="courseForm.name" placeholder="课程名称" />
      <textarea v-model="courseForm.description" placeholder="课程描述，可选" />
      <select v-model.number="courseForm.teacher_id">
        <option :value="undefined">选择教师</option>
        <option v-for="user in teachers" :key="user.id" :value="user.id">
          {{ user.name }} · {{ user.user_no }}
        </option>
      </select>
      <div class="student-picker">
        <button
          v-for="student in students"
          :key="student.id"
          type="button"
          class="student-option"
          :class="{ active: courseForm.student_ids.includes(student.id) }"
          @click="toggleStudent(student.id)"
        >
          <strong>{{ student.name }}</strong>
          <span>{{ student.user_no }} · {{ student.username }}</span>
        </button>
      </div>
      <button @click="createCourse"><Plus :size="18" />创建课程</button>
    </div>
  </section>

  <section v-else-if="feature === 'dashboard'" class="workspace-card">
    <div class="section-title">
      <h2>可视化看板</h2>
      <button class="secondary" @click="load"><RefreshCcw :size="18" />刷新</button>
    </div>
    <div class="metric-grid">
      <div v-for="(value, key) in stats" :key="key" class="metric-card">
        <span>{{ key }}</span>
        <strong>{{ value }}</strong>
      </div>
    </div>
    <div id="dashboard-chart" class="chart"></div>
  </section>

  <section v-else-if="feature === 'users'" class="workspace-card">
    <div class="section-title">
      <h2>用户信息</h2>
      <span>{{ users.length }} 个账号</span>
    </div>
    <table class="table">
      <thead>
        <tr>
          <th>姓名</th>
          <th>身份</th>
          <th>编号</th>
          <th>用户名</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.name }}</td>
          <td><span class="badge">{{ user.role }}</span></td>
          <td>{{ user.user_no }}</td>
          <td>{{ user.username }}</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section v-else-if="feature === 'courses'" class="workspace-card">
    <div class="section-title">
      <h2>课程列表</h2>
      <span>{{ courses.length }} 门课程</span>
    </div>
    <table class="table">
      <tbody>
        <tr v-for="course in courses" :key="course.id">
          <td>{{ course.name }}</td>
          <td>{{ course.description || '无描述' }}</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section v-else class="workspace-card">
    <div class="section-title">
      <h2>反馈回复</h2>
      <span>{{ feedback.length }} 条反馈</span>
    </div>
    <div v-for="item in feedback" :key="item.id" class="feedback-item">
      <p>{{ item.content }}</p>
      <div class="row">
        <input v-model="item.reply" placeholder="回复内容" />
        <button @click="reply(item)"><MessageSquareReply :size="18" />回复</button>
      </div>
    </div>
  </section>
</template>
