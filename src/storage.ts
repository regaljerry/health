import { openDB } from 'idb'
import { mergeReadings, readingKey } from './data.ts'
import type { Reading } from './data'

const database = () => openDB('chenxi-bp', 1, {
  upgrade(db) { db.createObjectStore('records') },
})

export async function loadReadings(): Promise<Reading[]> {
  const db = await database()
  try { return mergeReadings([], (await db.get('records', 'all')) ?? []) }
  finally { db.close() }
}

export async function changeReadings(incoming: Reading[] = [], remove?: string): Promise<Reading[]> {
  const db = await database()
  try {
    const transaction = db.transaction('records', 'readwrite')
    const existing = mergeReadings([], (await transaction.store.get('all')) ?? [])
    const records = mergeReadings(existing.filter(reading => readingKey(reading) !== remove), incoming)
    await transaction.store.put(records, 'all')
    await transaction.done
    return records
  } finally { db.close() }
}