import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { Activity, ArrowDownToLine, ArrowUpFromLine, CalendarDays, ChartNoAxesCombined, Check, ChevronLeft, ChevronRight, CirclePlus, Download, Heart, HeartPulse, History, Info, LoaderCircle, LockKeyhole, Moon, Pencil, ShieldCheck, Sun, Trash2, X } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { createBackup, dateRange, localDate, parseBackup, readingKey, summarize, validateReading } from './data'
import type { Period, Reading } from './data'
import { changeReadings, loadReadings } from './storage'
import { registerSW } from 'virtual:pwa-register'
import './App.css'

type View = 'today' | 'trends' | 'history'
type Metric = 'systolic' | 'diastolic' | 'pulse'
const periodNames = { morning: '早晨', evening: '晚间' }
const metricNames = { systolic: '高压', diastolic: '低压', pulse: '心率' }
const weekday = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('zh-CN', { weekday: 'long' })
const fullDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
const errorText = (error: unknown) => error instanceof Error ? error.message : '操作未完成，请重试'
const daysAgo = (days: number) => { const date = new Date(); date.setDate(date.getDate() - days); return localDate(date) }

function TrendChart({ records, dates, period, metric = 'systolic' }: { records: Reading[]; dates: string[]; period?: Period; metric?: Metric }) {
  const lookup = new Map(records.map(reading => [readingKey(reading), reading]))
  const data = dates.map(date => {
    const morning = lookup.get(`${date}/morning`)
    const evening = lookup.get(`${date}/evening`)
    const reading = period === 'morning' ? morning : evening
    return { date, high: reading?.systolic ?? null, low: reading?.diastolic ?? null, morning: morning?.[metric] ?? null, evening: evening?.[metric] ?? null }
  })
  const available = records.some(reading => !period || reading.period === period)
  return <div className="chart-wrap" role="img" aria-label={`${period ? periodNames[period] + '高压与低压' : '早晚' + metricNames[metric]}趋势，${dates[0]}至${dates.at(-1)}`}>
    {available ? <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 16, right: 12, left: -20, bottom: 0 }}>
      <CartesianGrid stroke="#e9eeec" strokeDasharray="3 5" vertical={false} />
      <XAxis dataKey="date" tickFormatter={value => String(value).slice(5).replace('-', '/')} minTickGap={30} tick={{ fontSize: 11, fill: '#77817d' }} axisLine={false} tickLine={false} />
      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#77817d' }} axisLine={false} tickLine={false} width={52} />
      <Tooltip labelFormatter={value => fullDate(String(value))} contentStyle={{ borderRadius: 6, border: '1px solid #dce5e0', fontSize: 13 }} />
      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
      {period ? <><Line type="linear" dataKey="high" name="高压" stroke={period === 'morning' ? '#187d68' : 'var(--evening)'} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} /><Line type="linear" dataKey="low" name="低压" stroke={period === 'morning' ? '#6aa99c' : 'var(--evening-light)'} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} /></> : <><Line type="linear" dataKey="morning" name="早晨" stroke="#187d68" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} /><Line type="linear" dataKey="evening" name="晚间" stroke="var(--evening)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} /></>}
    </LineChart></ResponsiveContainer> : <div className="chart-empty"><ChartNoAxesCombined size={30} strokeWidth={1.3} /><span>暂无{period ? periodNames[period] : ''}记录</span><small>此时间范围内没有测量数据</small></div>}
  </div>
}

function App() {
  const [records, setRecords] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)
  const [storageReady, setStorageReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<View>('today')
  const [date, setDate] = useState(localDate())
  const [range, setRange] = useState('7')
  const [customStart, setCustomStart] = useState(daysAgo(6))
  const [customEnd, setCustomEnd] = useState(localDate())
  const [metric, setMetric] = useState<Metric>('systolic')
  const [editing, setEditing] = useState<{ date: string; period: Period } | null>(null)
  const [form, setForm] = useState({ systolic: '', diastolic: '', pulse: '' })
  const [formError, setFormError] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [settings, setSettings] = useState(false)
  const [historyPeriod, setHistoryPeriod] = useState('all')
  const [online, setOnline] = useState(navigator.onLine)
  const [updateReady, setUpdateReady] = useState(false)
  const updateApp = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    updateApp.current = registerSW({
      onNeedRefresh() { setUpdateReady(true) },
      onOfflineReady() { setMessage('离线资源已就绪，断网也能记录') },
      onRegisterError() { setError('离线资源缓存失败，请联网刷新重试；已保存的记录不受影响。') },
    })
  }, [])

  useEffect(() => {
    let active = true
    const refresh = () => loadReadings().then(value => {
      if (active) { setRecords(value); setStorageReady(true) }
    }).catch(() => {
      if (active) { setError('无法读取本地数据库。请关闭无痕浏览，允许网站存储后重试；现有数据不会被覆盖。'); setStorageReady(false) }
    }).finally(() => { if (active) setLoading(false) })
    void refresh()
    const visibility = () => { if (!document.hidden) void refresh() }
    const connectivity = () => setOnline(navigator.onLine)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('online', connectivity)
    window.addEventListener('offline', connectivity)
    return () => { active = false; document.removeEventListener('visibilitychange', visibility); window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity) }
  }, [])

  useEffect(() => {
    if (editing || settings) dialog.current?.showModal()
    else dialog.current?.close()
  }, [editing, settings])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 4500)
    return () => window.clearTimeout(timer)
  }, [message])

  const today = localDate()
  const start = range === 'custom' ? customStart : daysAgo(Number(range) - 1)
  const end = range === 'custom' ? customEnd : today
  const rangeValid = !!start && !!end && start <= end && end <= today && dateRange(start, end).length < 3660
  const dates = rangeValid ? dateRange(start, end) : []
  const filtered = rangeValid ? records.filter(reading => reading.date >= start && reading.date <= end) : []
  const dayRecords = records.filter(reading => reading.date === date)
  const dayCount = new Set(filtered.map(reading => reading.date)).size
  const existing = editing ? records.find(reading => readingKey(reading) === readingKey(editing)) : undefined
  const historyRecords = filtered.filter(reading => historyPeriod === 'all' || reading.period === historyPeriod)

  function openEditor(period: Period, selectedDate = date) {
    const record = records.find(reading => reading.date === selectedDate && reading.period === period)
    setForm({ systolic: record ? String(record.systolic) : '', diastolic: record ? String(record.diastolic) : '', pulse: record ? String(record.pulse) : '' })
    setFormError('')
    setEditing({ date: selectedDate, period })
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!editing || !storageReady) return
    setFormError('')
    try {
      const reading: Reading = { ...editing, systolic: Number(form.systolic), diastolic: Number(form.diastolic), pulse: Number(form.pulse), updatedAt: new Date().toISOString() }
      validateReading(reading)
      setBusy(true)
      setRecords(await changeReadings([reading]))
      setEditing(null)
      setMessage('记录已保存在此设备')
      void navigator.storage?.persist?.().catch(() => false)
    } catch (failure) { setFormError(`未保存：${errorText(failure)}`) }
    finally { setBusy(false) }
  }

  async function remove(reading: Reading) {
    if (!window.confirm(`删除 ${reading.date} ${periodNames[reading.period]}的记录？此操作无法撤销。`)) return
    setBusy(true)
    try { setRecords(await changeReadings([], readingKey(reading))); setEditing(null); setMessage('记录已删除') }
    catch { setError('删除失败，请重试') }
    finally { setBusy(false) }
  }

  function download(format: 'json' | 'csv') {
    const text = format === 'json' ? createBackup(records) : '\uFEFF日期,时段,高压(mmHg),低压(mmHg),心率(次/分钟)\r\n' + records.map(reading => `${reading.date},${periodNames[reading.period]},${reading.systolic},${reading.diastolic},${reading.pulse}`).join('\r\n')
    const url = URL.createObjectURL(new Blob([text], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = `健康数据-${today}.${format}`; anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10000)
    setMessage('已生成导出文件，请确认保存到“文件”中')
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('备份文件不能超过 20 MB')
      const incoming = parseBackup(await file.text())
      const overlaps = incoming.filter(reading => records.some(existingReading => readingKey(reading) === readingKey(existingReading))).length
      if (!window.confirm(`导入 ${incoming.length} 条记录${overlaps ? `，其中 ${overlaps} 条同日期、同时段记录会被备份内容覆盖` : ''}？`)) return
      setRecords(await changeReadings(incoming))
      setMessage(`已导入 ${incoming.length} 条记录`)
    } catch (failure) { setError(`导入失败：${errorText(failure)}`) }
    finally { setBusy(false) }
  }

  function moveDay(offset: number) {
    const next = new Date(`${date}T12:00:00`)
    next.setDate(next.getDate() + offset)
    const value = localDate(next)
    if (value <= today) setDate(value)
  }

  const rangeControls = <div className="range-controls"><div className="segmented" aria-label="统计时间范围">{[['7', '近 7 天'], ['30', '近 30 天'], ['custom', '自定义']].map(([value, label]) => <button key={value} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>)}</div>{range === 'custom' && <div className="custom-dates"><label>开始<input type="date" value={customStart} max={customEnd || today} onChange={event => setCustomStart(event.target.value)} /></label><span>至</span><label>结束<input type="date" value={customEnd} min={customStart} max={today} onChange={event => setCustomEnd(event.target.value)} /></label></div>}</div>

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); setView('today') }}><img className="brand-icon" src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" /><span>健康数据<small>DAILY HEALTH</small></span></a>
      <div className="nav-caption">我的健康日志</div>
      <nav aria-label="主导航">{([{ id: 'today', label: '今日记录', icon: CalendarDays }, { id: 'trends', label: '趋势统计', icon: ChartNoAxesCombined }, { id: 'history', label: '历史记录', icon: History }] as const).map(item => <button key={item.id} className={view === item.id ? 'nav-item active' : 'nav-item'} aria-current={view === item.id ? 'page' : undefined} onClick={() => setView(item.id)}><item.icon size={20} /><span>{item.label}</span>{view === item.id && <span className="nav-dot" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="local-label"><ShieldCheck size={18} /><span>数据仅保存在本机<small>不登录 · 不上传</small></span></div><button className="text-button" onClick={() => setSettings(true)}><Info size={17} />备份与应用信息</button></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><span className="breadcrumb">健康数据 <span>/</span> {{ today: '今日记录', trends: '趋势统计', history: '历史记录' }[view]}</span><div className="header-actions"><span className="online-state"><i className={online ? '' : 'offline'} />{online ? '本地存储' : '离线模式'}</span><button className="icon-button" title="备份与应用信息" aria-label="备份与应用信息" onClick={() => setSettings(true)}><Info size={20} /></button></div></header>
      <main>
        {updateReady && <div className="update-banner"><span>新版本已就绪</span><button className="text-button" disabled={busy || !!editing || settings} onClick={() => void updateApp.current?.(true)}>更新应用</button></div>}
        {error && <div role="alert" className="error-banner"><span>{error}</span><button className="icon-button" aria-label="关闭错误提示" onClick={() => setError('')}><X size={18} /></button></div>}
        <div className="page-heading"><div><div className="eyebrow">{view === 'today' ? '一天两次，关心自己' : view === 'trends' ? '看见变化，了解日常' : '每一次测量，都有迹可循'}</div><h1>{{ today: '今日记录', trends: '趋势统计', history: '历史记录' }[view]}</h1></div><span className="heading-date">{fullDate(today)}<span>{weekday(today)}</span></span></div>
        {loading ? <div className="loading"><LoaderCircle className="spin" /> 正在读取本地记录</div> : <>
        {view === 'today' && <>
          <section className="day-selector"><div><CalendarDays size={18} /><label className="sr-only" htmlFor="record-date">记录日期</label><input id="record-date" aria-label="记录日期" type="date" value={date} max={today} min="1900-01-01" onChange={event => { if (event.target.value) setDate(event.target.value) }} /><span className="weekday">{weekday(date)}</span>{date === today && <span className="today-tag">今天</span>}</div><div className="day-buttons"><button className="icon-button" title="前一天" aria-label="前一天" onClick={() => moveDay(-1)}><ChevronLeft size={18} /></button><button className="icon-button" title="后一天" aria-label="后一天" disabled={date >= today} onClick={() => moveDay(1)}><ChevronRight size={18} /></button></div></section>
          <section className="reading-grid" aria-label="早晚血压记录">{(['morning', 'evening'] as const).map(period => {
            const reading = dayRecords.find(record => record.period === period)
            const PeriodIcon = period === 'morning' ? Sun : Moon
            return <article className={`reading-card ${period}`} key={period}><div className="reading-card-head"><div className="period-title"><span className="period-icon"><PeriodIcon size={22} /></span><div><h2>{periodNames[period]}记录</h2><small>{period === 'morning' ? 'MORNING' : 'EVENING'}</small></div></div><span className={`status-pill ${reading ? 'recorded' : ''}`}>{reading ? <><Check size={12} />已记录</> : '待记录'}</span></div><div className="reading-values">{(['systolic', 'diastolic', 'pulse'] as const).map(key => <div key={key}><span className="value-label">{metricNames[key]}{key === 'pulse' && <Heart size={12} />}</span><strong>{reading?.[key] ?? '—'}</strong><small>{key === 'pulse' ? '次/分钟' : 'mmHg'}</small></div>)}</div><button className={`record-button ${reading ? 'secondary' : ''}`} disabled={!storageReady || busy} onClick={() => openEditor(period)}>{reading ? <Pencil size={16} /> : <CirclePlus size={18} />}{reading ? '编辑记录' : `记录${periodNames[period]}血压`}</button></article>
          })}</section>
          <div className="day-progress"><span><span className="progress-track"><i style={{ width: `${dayRecords.length * 50}%` }} /></span>当日已记录 <b>{dayRecords.length}</b> / 2 次</span>{dayRecords.length === 2 ? '早晚记录已完成' : '把关心留给每一天'}</div>
          <section className="overview"><div className="section-heading"><h2>近期概览 <span>近 7 天</span></h2><button className="text-button" onClick={() => { setRange('7'); setView('trends') }}>全部趋势<ChevronRight size={16} /></button></div><Summary records={records.filter(reading => reading.date >= daysAgo(6))} /><div className="preview-chart"><div className="chart-title"><h3>血压变化</h3><span>mmHg · 早晚平均</span></div><DailyChart records={records} /></div></section>
          <div className="health-note"><span className="note-icon"><HeartPulse size={19} /></span><div><strong>给身体一点安静的时间</strong><p>测量前静坐休息 5 分钟，尽量每天在相近时间、同一手臂测量。</p></div></div>
        </>}
        {view === 'trends' && <><div className="section-heading range-heading"><h2>测量趋势</h2>{rangeControls}</div>{!rangeValid ? <p className="error-banner" role="alert">请选择有效的起止日期，跨度须少于 10 年，结束日期不能晚于今天。</p> : <><Summary records={filtered} /><div className="range-meta">{start} 至 {end}<span>记录 {dayCount} 天 · 共 {filtered.length} 次</span></div><section className="chart-grid">{(['morning', 'evening'] as const).map(period => <article className={`chart-panel ${period}`} key={period}><div className="chart-title"><h3>{period === 'morning' ? <Sun size={18} /> : <Moon size={18} />}{periodNames[period]}血压</h3><span>mmHg</span></div><TrendChart records={filtered} dates={dates} period={period} /></article>)}</section><section className="comparison"><div className="section-heading"><h2>早晚对比</h2><div className="segmented" aria-label="对比指标">{(['systolic', 'diastolic', 'pulse'] as const).map(key => <button key={key} aria-pressed={metric === key} onClick={() => setMetric(key)}>{metricNames[key]}</button>)}</div></div><div className="chart-title"><span>{metricNames[metric]} · {metric === 'pulse' ? '次/分钟' : 'mmHg'}</span></div><TrendChart records={filtered} dates={dates} metric={metric} /></section><p className="subtle-note">曲线空缺表示当日未记录；平均值仅计算已记录的测量数据。</p></>}</>}
        {view === 'history' && <><div className="section-heading range-heading"><h2>测量明细 <span>{historyRecords.length} 条</span></h2>{rangeControls}</div><div className="history-tools"><div className="segmented" aria-label="时段筛选">{[['all', '全部'], ['morning', '早晨'], ['evening', '晚间']].map(([value, label]) => <button key={value} aria-pressed={historyPeriod === value} onClick={() => setHistoryPeriod(value)}>{label}</button>)}</div><button className="text-button" disabled={!storageReady || busy} onClick={() => download('csv')}><ArrowDownToLine size={16} />导出 CSV</button></div>{!rangeValid ? <p className="error-banner">请选择有效的日期范围</p> : historyRecords.length ? <div className="table-scroll"><table><thead><tr><th>日期 / 时段</th><th>高压<small> mmHg</small></th><th>低压<small> mmHg</small></th><th>心率<small> 次/分钟</small></th><th><span className="sr-only">操作</span></th></tr></thead><tbody>{historyRecords.map(reading => <tr key={readingKey(reading)}><td><strong>{reading.date}</strong><span className={`table-period ${reading.period}`}>{reading.period === 'morning' ? <Sun size={13} /> : <Moon size={13} />}{periodNames[reading.period]}</span></td><td>{reading.systolic}</td><td>{reading.diastolic}</td><td>{reading.pulse}</td><td><button className="icon-button" title="编辑记录" aria-label={`编辑 ${reading.date} ${periodNames[reading.period]}`} disabled={busy || !storageReady} onClick={() => openEditor(reading.period, reading.date)}><Pencil size={16} /></button></td></tr>)}</tbody></table></div> : <div className="history-empty"><History size={36} strokeWidth={1.3} /><h3>还没有测量记录</h3><p>此时间范围内没有符合条件的数据</p><button className="primary-button" onClick={() => { setDate(today); setView('today') }}><CirclePlus size={17} />去记录</button></div>}</>}
        </>}
        <footer><span><LockKeyhole size={13} />健康数据留在你的设备</span><span>仅用于日常记录，不作为诊断或治疗依据</span></footer>
      </main>
    </div>
    {message && <div role="status" className="toast"><Check size={17} />{message}</div>}
    <dialog ref={dialog} onCancel={event => { if (busy) event.preventDefault(); else { setEditing(null); setSettings(false) } }} onClick={event => { if (event.target === dialog.current && !busy) { setEditing(null); setSettings(false) } }} aria-labelledby="dialog-title">
      <div className="modal-header"><h2 id="dialog-title">{editing ? `${existing ? '编辑' : '添加'}${periodNames[editing.period]}记录` : '备份与应用信息'}</h2><button className="icon-button" aria-label="关闭" disabled={busy} onClick={() => { setEditing(null); setSettings(false) }}><X size={21} /></button></div>
      {editing && <form onSubmit={save}><p className="modal-date">{fullDate(editing.date)} · {weekday(editing.date)}</p><div className="form-fields">{(['systolic', 'diastolic', 'pulse'] as const).map(key => <label key={key}>{metricNames[key]}<span>{key === 'pulse' ? '次/分钟' : 'mmHg'}</span><input aria-label={metricNames[key]} type="number" inputMode="numeric" required step="1" min={key === 'systolic' ? 50 : key === 'diastolic' ? 30 : 25} max={key === 'systolic' ? 300 : key === 'diastolic' ? 200 : 250} autoFocus={key === 'systolic'} placeholder={key === 'systolic' ? '120' : key === 'diastolic' ? '80' : '70'} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}</div>{formError && <p className="form-error" role="alert">{formError}</p>}{Number(form.systolic) >= 180 || Number(form.diastolic) >= 120 ? <p className="medical-warning">本次输入较高，请核对数值并及时咨询医护人员。如有胸痛、呼吸困难等不适，请立即寻求急救。</p> : null}<div className="modal-actions">{existing && <button type="button" className="danger-button" disabled={busy} onClick={() => void remove(existing)}><Trash2 size={17} />删除</button>}<button className="primary-button" disabled={busy || !storageReady} type="submit">{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}保存记录</button></div></form>}
      {settings && <div className="settings-content"><div className="privacy-notice"><ShieldCheck size={25} /><div><strong>只属于你的健康日志</strong><p>数据仅保存在此浏览器 / 主屏幕应用的本地数据库中，不上传服务器。不同设备、浏览器及网址之间不会自动同步。</p></div></div><h3>数据备份</h3><p>清除网站数据、卸载应用或系统清理可能导致记录丢失。请定期导出 JSON 备份并妥善保管；备份包含明文健康信息。</p><div className="backup-buttons"><button className="secondary-button" disabled={!storageReady || busy} onClick={() => download('json')}><ArrowDownToLine size={17} />导出备份</button><button className="secondary-button" disabled={!storageReady || busy} onClick={() => fileInput.current?.click()}><ArrowUpFromLine size={17} />导入备份</button><button className="secondary-button" disabled={!storageReady || busy} onClick={() => download('csv')}><Download size={17} />导出 CSV</button></div><input ref={fileInput} className="sr-only" tabIndex={-1} aria-label="导入备份文件" type="file" accept=".json,application/json" onChange={event => void importFile(event)} /><h3>添加到 iPhone 主屏幕</h3><p>在 Safari 中打开本应用，点按“分享”，选择“添加到主屏幕”。首次联网打开后，即可在离线时记录和查看数据。</p><h3>关于测量</h3><p>每天早晚各记录一次，每条包含高压、低压和心率。历史数据可在今日记录页选择日期补录。应用不提供诊断、用药建议或后台测量提醒。</p><small className="version">健康数据 · v1.0 · 本地优先</small></div>}
    </dialog>
  </div>
}

function Summary({ records }: { records: Reading[] }) {
  return <div className="summary-grid">{(['systolic', 'diastolic', 'pulse'] as const).map(key => {
    const stats = summarize(records, key)
    return <div className="summary-item" key={key}><span>{key === 'pulse' ? <Heart size={15} /> : <Activity size={15} />}平均{metricNames[key]}</span><div><strong>{stats?.average ?? '—'}</strong><small>{key === 'pulse' ? '次/分钟' : 'mmHg'}</small></div><small>{stats ? `最低 ${stats.min} · 最高 ${stats.max}` : '暂无测量数据'}</small></div>
  })}<div className="summary-item count"><span><CalendarDays size={15} />记录天数</span><div><strong>{new Set(records.map(reading => reading.date)).size}</strong><small>天</small></div><small>共 {records.length} 次测量</small></div></div>
}

function DailyChart({ records }: { records: Reading[] }) {
  const dates = dateRange(daysAgo(6), localDate())
  const averages: Reading[] = dates.flatMap(date => {
    const daily = records.filter(reading => reading.date === date)
    if (!daily.length) return []
    return [{ date, period: 'morning' as const, systolic: summarize(daily, 'systolic')!.average, diastolic: summarize(daily, 'diastolic')!.average, pulse: summarize(daily, 'pulse')!.average, updatedAt: daily[0].updatedAt }]
  })
  return <TrendChart records={averages} dates={dates} period="morning" />
}

export default App
