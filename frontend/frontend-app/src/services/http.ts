import axios from 'axios'

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

const AUTH_STORAGE_KEY = 'quickhouse_auth'

function getToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { token?: string }
    return data?.token ?? null
  } catch {
    return null
  }
}

const LOADING_EVENT = 'quickhouse:loading'
let pendingCount = 0

function setLoading(loading: boolean) {
  window.dispatchEvent(new CustomEvent(LOADING_EVENT, { detail: { loading } }))
}

const debounceMs = 800
const recentWrites = new Map<string, number>()

const http = axios.create({

  baseURL: '/api', // 改成相对路径，剩下的交给 Nginx 转发
  
  timeout: 10000,
  
  })

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }

  // Global loading (all requests)
  pendingCount += 1
  if (pendingCount === 1) setLoading(true)

  // Debounce writes
  const method = (config.method || 'get').toLowerCase()
  const isWrite = method !== 'get'
  if (isWrite) {
    const key = `${method}:${config.baseURL ?? ''}${config.url ?? ''}`
    const now = Date.now()
    const last = recentWrites.get(key) ?? 0
    if (now - last < debounceMs) {
      pendingCount -= 1
      if (pendingCount <= 0) {
        pendingCount = 0
        setLoading(false)
      }
      return Promise.reject(new Error('操作太频繁，请稍后再试'))
    }
    recentWrites.set(key, now)
  }

  return config
})

http.interceptors.response.use(
  (response) => {
    pendingCount -= 1
    if (pendingCount <= 0) {
      pendingCount = 0
      setLoading(false)
    }

    const body = response.data as ApiResponse<unknown>
    if (body && typeof body.code === 'number' && body.code !== 200) {
      return Promise.reject(new Error(body.message || '请求失败'))
    }
    if (body && typeof body.code === 'number') {
      return body.data
    }
    return response.data
  },
  (error) => {
    pendingCount -= 1
    if (pendingCount <= 0) {
      pendingCount = 0
      setLoading(false)
    }
    return Promise.reject(error)
  },
)

export default http
export const QUICKHOUSE_LOADING_EVENT = LOADING_EVENT

