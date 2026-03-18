import http from './http'

export interface User {
  id: number
  userName: string
  gender: string
  contact: string
  addedTime: string
  roleId?: number | null
  roleName?: string | null
}

export interface UserQueryParams {
  userName?: string
  addedFrom?: string
  addedTo?: string
  contact?: string
  page?: number
  pageSize?: number
}

export async function fetchUsers(params: UserQueryParams) {
  return http.get<
    { total: number; page: number; pageSize: number; items: User[] },
    { total: number; page: number; pageSize: number; items: User[] }
  >('/users', { params })
}

export async function createUser(
  data: { userName: string; password: string; gender: string; contact: string; roleId?: number; realName?: string },
) {
  return http.post<User, User>('/users', data)
}

export async function updateUser(
  id: number,
  data: { userName: string; password?: string; gender: string; contact: string; realName?: string },
) {
  return http.put<User, User>(`/users/${id}`, data)
}

export async function deleteUser(id: number) {
  return http.delete<string, string>(`/users/${id}`)
}

export async function updateUserRole(id: number, roleId: number) {
  return http.put<string, string>(`/users/${id}/role`, { roleId })
}

export async function checkUserExists(userName: string, excludeId?: number) {
  return http.get<{ exists: boolean }, { exists: boolean }>('/users/check', {
    params: { userName: userName?.trim(), excludeId },
  })
}

