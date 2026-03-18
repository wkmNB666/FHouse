import http from './http'

export interface Role {
  id: number
  roleName: string
  description: string
  permissions: string
  createTime: string
}

export interface RoleQueryParams {
  roleName?: string
  createFrom?: string
  createTo?: string
}

export async function fetchRoles(params?: RoleQueryParams) {
  return http.get<Role[], Role[]>('/roles', { params })
}

export async function createRole(data: { roleName: string; description?: string; permissions?: string }) {
  return http.post<{ id: number }, { id: number }>('/roles', data)
}

export async function updateRole(id: number, data: { roleName: string; description?: string; permissions?: string }) {
  return http.put<string, string>(`/roles/${id}`, data)
}

export async function deleteRole(id: number) {
  return http.delete<string, string>(`/roles/${id}`)
}

export async function fetchRoleMembers(id: number) {
  return http.get<{ id: number; userName: string; realName?: string | null }[], { id: number; userName: string; realName?: string | null }[]>(
    `/roles/${id}/members`,
  )
}

export async function updateRoleMembers(id: number, userIds: number[]) {
  return http.put<string, string>(`/roles/${id}/members`, { userIds })
}

export async function checkRoleNameExists(roleName: string, excludeId?: number) {
  return http.get<{ exists: boolean }, { exists: boolean }>('/roles/check', {
    params: { roleName: roleName?.trim(), excludeId },
  })
}

