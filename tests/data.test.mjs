import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createBackup, parseBackup, validateReading, mergeReadings, summarize, dateRange, localDate } from '../src/data.ts'

const reading = { date: '2026-01-02', period: 'morning', systolic: 120, diastolic: 80, pulse: 70, updatedAt: '2026-01-02T08:00:00Z' }

test('validates numbers, order, dates and period', () => {
  assert.doesNotThrow(() => validateReading(reading))
  for (const change of [{ systolic: 80 }, { pulse: 0 }, { systolic: 120.5 }, { date: '2026-02-30' }, { date: '2099-01-01' }, { period: 'noon' }, { pulse: '70' }, { updatedAt: '' }]) {
    assert.throws(() => validateReading({ ...reading, ...change }))
  }
})

test('one entry per date and period, replacement preserves the other period', () => {
  const records = mergeReadings([reading, { ...reading, period: 'evening' }], [{ ...reading, systolic: 125 }])
  assert.equal(records.length, 2)
  assert.equal(records.find(record => record.period === 'morning').systolic, 125)
})

test('versioned backup round trip and invalid import rejection', () => {
  assert.deepEqual(parseBackup(createBackup([reading])), [reading])
  assert.throws(() => parseBackup('{"readings":[]}'))
  assert.throws(() => parseBackup(createBackup([{ ...reading, pulse: -1 }])))
})

test('summary uses only actual readings and empty data is not zero', () => {
  assert.equal(summarize([], 'systolic'), null)
  assert.deepEqual(summarize([reading, { ...reading, systolic: 130 }], 'systolic'), { average: 125, min: 120, max: 130 })
})

test('date range includes missing days and handles month boundary', () => {
  assert.deepEqual(dateRange('2026-01-31', '2026-02-02'), ['2026-01-31', '2026-02-01', '2026-02-02'])
  assert.equal(localDate(new Date(2026, 0, 2, 0, 1)), '2026-01-02')
})