import http from './http'

export interface User {
  id: number
  userName: string
  gender: string
  contact: string
  addedTime: string
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
  >('/api/users', { params })
}

export async function createUser(
  data: Pick<User, 'userName' | 'gender' | 'contact'> & Partial<Pick<User, 'addedTime'>>,
) {
  return http.post<User, User>('/api/users', data)
}

export async function updateUser(
  id: number,
  data: Pick<User, 'userName' | 'gender' | 'contact'> & Partial<Pick<User, 'addedTime'>>,
) {
  return http.put<User, User>(`/api/users/${id}`, data)
}

export async function deleteUser(id: number) {
  return http.delete<string, string>(`/api/users/${id}`)
}

