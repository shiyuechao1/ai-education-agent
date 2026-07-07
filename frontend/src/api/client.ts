import axios from 'axios'

export const api = axios.create({
  baseURL: '/api'
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export type Role = 'admin' | 'teacher' | 'student'

export interface User {
  id: number
  user_no: string
  username: string
  name: string
  role: Role
}

export interface Course {
  id: number
  name: string
  description?: string
  teacher_id: number
}
