<script setup lang="ts">
import {
  BarChart3, BookOpen, Bot, ClipboardCheck, ClipboardList,
  FileUp, FolderOpen, GraduationCap, Key, Library, ListChecks,
  LogOut, MessageSquare, MessageSquareReply, MessagesSquare,
  PenTool, PlusSquare, Shield, Sparkles, UserPlus, Users, Wand2, X
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api/client'
import { roleFeatures } from '../router/features'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

// 密码修改
const showPwdModal = ref(false)
const pwdForm = ref({ old_password: '', new_password: '', confirm_password: '' })
const pwdError = ref('')
const pwdSuccess = ref('')

async function changePassword() {
  pwdError.value = ''
  pwdSuccess.value = ''
  if (pwdForm.value.new_password !== pwdForm.value.confirm_password) {
    pwdError.value = '两次输入的新密码不一致'
    return
  }
  if (pwdForm.value.new_password.length < 6) {
    pwdError.value = '新密码至少6位'
    return
  }
  try {
    await api.put('/auth/password', pwdForm.value)
    pwdSuccess.value = '密码修改成功'
    pwdForm.value = { old_password: '', new_password: '', confirm_password: '' }
    setTimeout(() => { showPwdModal.value = false; pwdSuccess.value = '' }, 1500)
  } catch (err: any) {
    pwdError.value = err?.response?.data?.detail || '修改失败'
  }
}

const iconMap = {
  BarChart3,
  BookOpen,
  Bot,
  ClipboardCheck,
  ClipboardList,
  FileUp,
  FolderOpen,
  GraduationCap,
  Library,
  ListChecks,
  MessageSquare,
  MessageSquareReply,
  MessagesSquare,
  PenTool,
  PlusSquare,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  Wand2
}

const roleName = computed(() => {
  if (auth.user?.role === 'teacher') return '教师端'
  if (auth.user?.role === 'student') return '学生端'
  return '管理员端'
})

const features = computed(() => (auth.user ? roleFeatures[auth.user.role] : []))
const currentFeature = computed(() => String(route.params.feature || ''))
const currentMeta = computed(() => features.value.find((item) => item.key === currentFeature.value))

function navigate(feature: string) {
  router.push(`/${auth.user?.role}/${feature}`)
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <main class="shell">
    <aside class="sidebar">
      <div class="brand-block">
        <div class="brand-mark">AI</div>
        <div>
          <div class="brand">智能教育平台</div>
          <div class="brand-subtitle">{{ roleName }}</div>
        </div>
      </div>

      <nav class="feature-nav">
        <button
          v-for="item in features"
          :key="item.key"
          class="nav-button"
          :class="{ active: currentFeature === item.key }"
          @click="navigate(item.key)"
        >
          <component :is="iconMap[item.icon as keyof typeof iconMap]" :size="18" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <section class="content">
      <header class="topbar">
        <div>
          <p class="eyebrow">{{ roleName }} / {{ currentMeta?.label }}</p>
          <h1>{{ currentMeta?.label }}</h1>
          <p class="muted">{{ currentMeta?.description }}</p>
        </div>
        <div class="user-chip">
          <span>{{ auth.user?.name }}</span>
          <small>{{ auth.user?.user_no }}</small>
          <button class="icon-button secondary" title="修改密码" @click="showPwdModal = true">
            <Key :size="14" />
          </button>
          <button class="icon-button secondary" title="退出登录" @click="logout">
            <LogOut :size="18" />
          </button>
        </div>
      </header>
      <router-view />
    </section>

    <!-- 修改密码弹窗 -->
    <div v-if="showPwdModal" class="modal-overlay" @click.self="showPwdModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>修改密码</h3>
          <button class="icon-button secondary" @click="showPwdModal = false"><X :size="16" /></button>
        </div>
        <form class="form-stack" @submit.prevent="changePassword">
          <input v-model="pwdForm.old_password" type="password" placeholder="当前密码" required />
          <input v-model="pwdForm.new_password" type="password" placeholder="新密码（至少6位）" required minlength="6" />
          <input v-model="pwdForm.confirm_password" type="password" placeholder="确认新密码" required />
          <p v-if="pwdError" class="login-error">{{ pwdError }}</p>
          <p v-if="pwdSuccess" class="success-msg">{{ pwdSuccess }}</p>
          <button type="submit"><Key :size="16" />确认修改</button>
        </form>
      </div>
    </div>
  </main>
</template>
