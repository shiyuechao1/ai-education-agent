import { defineStore } from 'pinia'
import { api, type Role, type User } from '../api/client'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: null as User | null
  }),
  getters: {
    role: (state): Role | undefined => state.user?.role
  },
  actions: {
    async login(username: string, password: string) {
      const form = new URLSearchParams()
      form.set('username', username)
      form.set('password', password)
      const { data } = await api.post('/auth/login', form)
      this.token = data.access_token
      localStorage.setItem('token', this.token)
      await this.loadMe()
    },
    async loadMe() {
      if (!this.token) return
      const { data } = await api.get<User>('/auth/me')
      this.user = data
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
    }
  }
})
