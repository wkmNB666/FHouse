import http from './http'

export interface LoginResponse {
  userName: string
}

export async function login(userName: string, password: string) {
  return http.post<LoginResponse, LoginResponse>('/api/auth/login', { userName, password })
}

