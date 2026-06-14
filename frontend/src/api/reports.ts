import client from './client'

export async function getDailyReport(date?: string) {
  const { data } = await client.get('/reports/daily/', {
    params: date ? { date } : {},
  })
  return data
}

export async function getWeeklyReport() {
  const { data } = await client.get('/reports/weekly/')
  return data
}

export async function getMonthlyReport(year?: number, month?: number) {
  const params: Record<string, number> = {}
  if (year) params.year = year
  if (month) params.month = month
  const { data } = await client.get('/reports/monthly/', { params })
  return data
}
