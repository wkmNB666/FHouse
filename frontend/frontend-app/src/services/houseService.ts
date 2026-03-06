import http from './http'

export interface House {
  id: number
  communityName: string
  houseAge: number
  price: number
  listedTime: string
}

export interface PaginatedResult<T> {
  total: number
  page: number
  pageSize: number
  items: T[]
}

export interface HouseQueryParams {
  communityName?: string
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

export async function createHouse(
  data: Pick<House, 'communityName' | 'houseAge' | 'price'> & Partial<Pick<House, 'listedTime'>>,
) {
  return http.post<House, House>('/api/houses', data)
}

export async function updateHouse(
  id: number,
  data: Pick<House, 'communityName' | 'houseAge' | 'price'> & Partial<Pick<House, 'listedTime'>>,
) {
  return http.put<House, House>(`/api/houses/${id}`, data)
}

export async function deleteHouse(id: number) {
  return http.delete<string, string>(`/api/houses/${id}`)
}

