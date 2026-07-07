<script setup lang="ts">
import {
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
  LogOut,
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
} from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { roleFeatures } from '../router/features'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

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
          <button class="icon-button secondary" title="退出登录" @click="logout">
            <LogOut :size="18" />
          </button>
        </div>
      </header>
      <router-view />
    </section>
  </main>
</template>
