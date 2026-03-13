import http from './http'

export async function fetchWeather(cityAdcode?: string) {
  return http.get<{ live: string; forecast: string }, { live: string; forecast: string }>('/api/weather', {
    params: cityAdcode ? { cityAdcode } : undefined,
  })
}

export async function fetchStatsSummary(date?: string) {
  return http.get<
    { date: string; houseCount: number; newUserCount: number; signedCount: number; revenue: number },
    { date: string; houseCount: number; newUserCount: number; signedCount: number; revenue: number }
  >('/api/stats/summary', { params: date ? { date } : undefined })
}

export async function fetchStatsSeries(from: string, to: string) {
  return http.get<
    { dates: string[]; houseCount: number[]; newUserCount: number[]; signedCount: number[]; revenue: number[] },
    { dates: string[]; houseCount: number[]; newUserCount: number[]; signedCount: number[]; revenue: number[] }
  >('/api/stats/series', { params: { from, to } })
}

export type SeriesByHour = {
  date: string
  hours: string[]
  houseCount: number[]
  newUserCount: number[]
  signedCount: number[]
  revenue: number[]
}

export async function fetchStatsSeriesByHour(date: string) {
  return http.get<SeriesByHour, SeriesByHour>('/api/stats/series-by-hour', { params: { date } })
}

