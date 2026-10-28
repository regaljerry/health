export type Period = 'morning' | 'evening'
export type Reading = {
  date: string
  period: Period
  systolic: number
  diastolic: number
  pulse: number
  updatedAt: string
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00`)
  return !Number.isNaN(parsed.getTime()) && localDate(parsed) === value && value >= '1900-01-01' && value <= localDate()
}

export function validateReading(value: unknown): asserts value is Reading {
  if (!value || typeof value !== 'object') throw new Error('记录格式不正确')
  const reading = value as Reading
  if (!validDate(reading.date)) throw new Error('请选择有效日期，不能记录未来日期')
  if (!['morning', 'evening'].includes(reading.period)) throw new Error('请选择早晨或晚间')
  for (const [label, number, min, max] of [
    ['高压', reading.systolic, 50, 300],
    ['低压', reading.diastolic, 30, 200],
    ['心率', reading.pulse, 25, 250],
  ] as const) {
    if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label}须为 ${min}–${max} 之间的整数`)
  }
  if (reading.systolic <= reading.diastolic) throw new Error('高压必须大于低压，请核对输入')
  if (typeof reading.updatedAt !== 'string' || Number.isNaN(Date.parse(reading.updatedAt))) throw new Error('记录更新时间无效')
}

export function readingKey(reading: Pick<Reading, 'date' | 'period'>): string {
  return `${reading.date}/${reading.period}`
}

export function mergeReadings(existing: Reading[], incoming: Reading[]): Reading[] {
  const records = new Map(existing.map(reading => [readingKey(reading), reading]))
  for (const reading of incoming) {
    validateReading(reading)
    records.set(readingKey(reading), reading)
  }
  return [...records.values()].sort((first, second) => readingKey(second).localeCompare(readingKey(first)))
}

export function parseBackup(text: string): Reading[] {
  const backup = JSON.parse(text)
  if (backup?.app !== 'chenxi-bp' || backup.version !== 1 || !Array.isArray(backup.readings)) throw new Error('请选择本应用导出的 JSON 备份')
  if (backup.readings.length > 100000) throw new Error('备份记录过多')
  return mergeReadings([], backup.readings)
}

export function createBackup(readings: Reading[]): string {
  return JSON.stringify({ app: 'chenxi-bp', version: 1, exportedAt: new Date().toISOString(), readings }, null, 2)
}

export function summarize(readings: Reading[], metric: 'systolic' | 'diastolic' | 'pulse') {
  if (!readings.length) return null
  const values = readings.map(reading => reading[metric])
  return { average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length), min: Math.min(...values), max: Math.max(...values) }
}

export function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${start}T12:00:00`)
  while (localDate(cursor) <= end && dates.length < 3660) {
    dates.push(localDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}