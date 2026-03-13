import http from './http'

export interface ContractItem {
  id: number
  communityName: string
  landlordName: string
  landlordContact: string
  tenantName: string
  tenantContact: string
  location: string
  contractPrice: number
  houseInfo: string
  building?: string
  unit?: string
  floor?: string
  houseImages: string
  signedAt: string
  houseId: number
}

export interface PaginatedResult<T> {
  total: number
  page: number
  pageSize: number
  items: T[]
}

export interface ContractQueryParams {
  communityName?: string
  landlordName?: string
  tenantName?: string
  signedFrom?: string
  signedTo?: string
  page?: number
  pageSize?: number
}

export async function fetchContracts(params: ContractQueryParams) {
  return http.get<PaginatedResult<ContractItem>, PaginatedResult<ContractItem>>('/api/contracts', { params })
}

export async function createContract(data: {
  houseId: number
  communityName: string
  landlordName: string
  landlordContact: string
  tenantName: string
  tenantContact: string
  location: string
  contractPrice: number
  signedAt: string
}) {
  return http.post<{ id: number }, { id: number }>('/api/contracts', data)
}

export async function updateContract(
  id: number,
  data: {
    houseId: number
    communityName: string
    landlordName: string
    landlordContact: string
    tenantName: string
    tenantContact: string
    location: string
    contractPrice: number
    signedAt: string
  },
) {
  return http.put<string, string>(`/api/contracts/${id}`, data)
}

export async function deleteContract(id: number) {
  return http.delete<string, string>(`/api/contracts/${id}`)
}

