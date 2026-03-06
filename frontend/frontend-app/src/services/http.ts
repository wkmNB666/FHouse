import axios from 'axios'

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

const http = axios.create({
  baseURL: 'http://localhost:5200',
  timeout: 10000,
})

http.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>
    if (body && typeof body.code === 'number' && body.code !== 200) {
      return Promise.reject(new Error(body.message || '请求失败'))
    }
    if (body && typeof body.code === 'number') {
      return body.data
    }
    return response.data
  },
  (error) => Promise.reject(error),
)

export default http

