<script setup lang="ts">
import { LogIn } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const username = ref('admin')
const password = ref('admin123')
const error = ref('')

async function submit() {
  error.value = ''
  try {
    await auth.login(username.value, password.value)
    await router.push(`/${auth.user?.role}`)
  } catch (err: any) {
    error.value = err?.response?.data?.detail || '登录失败'
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <h1>AI 教育智能体</h1>
      <p class="muted">智能备课与个性化学习辅导平台</p>
      <form class="form-stack" @submit.prevent="submit">
        <label>
          用户名或八位编号
          <input v-model="username" autocomplete="username" />
        </label>
        <label>
          密码
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>
        <button type="submit"><LogIn :size="18" />登录</button>
        <p v-if="error" class="muted">{{ error }}</p>
      </form>
    </section>
  </main>
</template>
