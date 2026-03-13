import http from './http'

export interface House {
  id: number
  communityName: string
  houseAge: number
  price: number
  listedTime: string
  images: string
  location: string
  landlordName: string
  landlordContact?: string
  auditStatus: number
  auditRemark: string
  building: string
  unit: string
  floor: string
  isContracted?: boolean
}

export interface PaginatedResult<T> {
  total: number
  page: number
  pageSize: number
  items: T[]
}

export interface HouseQueryParams {
  communityName?: string
  region?: string
  listedFrom?: string
  listedTo?: string
  minPrice?: number
  maxPrice?: number
  page?: number
  pageSize?: number
}

export async function fetchHouses(params: HouseQueryParams) {
  return http.get<PaginatedResult<House>, PaginatedResult<House>>('/api/houses', { params })
}

export async function fetchHousesLite(params: { page?: number; pageSize?: number; communityName?: string }) {
  return http.get<PaginatedResult<House>, PaginatedResult<House>>('/api/houses', { params })
}

export async function createHouse(
  data: Partial<Omit<House, 'id'>>,
) {
  return http.post<House, House>('/api/houses', data)
}

export async function updateHouse(
  id: number,
  data: Partial<Omit<House, 'id'>>,
) {
  return http.put<House, House>(`/api/houses/${id}`, data)
}

export async function deleteHouse(id: number) {
  return http.delete<string, string>(`/api/houses/${id}`)
}

export async function auditHouse(id: number, data: { status: number; remark?: string }) {
  return http.put<House, House>(`/api/houses/${id}/audit`, data)
}

