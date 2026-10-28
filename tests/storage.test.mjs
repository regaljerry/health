import 'fake-indexeddb/auto'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { changeReadings, loadReadings } from '../src/storage.ts'

test('IndexedDB saves, replaces, merges and removes records transactionally', async () => {
  const morning = { date: '2026-01-02', period: 'morning', systolic: 120, diastolic: 80, pulse: 70, updatedAt: '2026-01-02T08:00:00Z' }
  const evening = { ...morning, period: 'evening', systolic: 125 }
  assert.deepEqual(await loadReadings(), [])
  await changeReadings([morning])
  assert.deepEqual(await loadReadings(), [morning])
  await changeReadings([evening, { ...morning, pulse: 75 }])
  assert.equal((await loadReadings()).length, 2)
  await assert.rejects(() => changeReadings([{ ...morning, systolic: -1 }]))
  assert.equal((await loadReadings()).length, 2)
  await changeReadings([], '2026-01-02/morning')
  assert.deepEqual(await loadReadings(), [evening])
})