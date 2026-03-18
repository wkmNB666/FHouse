import http from './http'

export interface LoginResponse {
  token: string
  user: {
    id?: number
    userName: string
    realName?: string | null
    contact?: string | null
    role?: string
    permissions?: string
  }
}

export async function login(userName: string, password: string) {
  return http.post<LoginResponse, LoginResponse>('/auth/login', { userName, password })
}

export async function fetchMe() {
  return http.get<
    { id?: number; userName: string; realName?: string | null; contact?: string | null; role?: string; permissions?: string },
    { id?: number; userName: string; realName?: string | null; contact?: string | null; role?: string; permissions?: string }
  >('/auth/me')
}

export async function updateProfile(data: { realName?: string | null; contact?: string | null }) {
  return http.put<string, string>('/auth/profile', data)
}

export async function changePassword(data: { oldPassword: string; newPassword: string }) {
  return http.put<string, string>('/auth/change-password', data)
}

