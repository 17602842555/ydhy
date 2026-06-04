// Pure formatting and presentation helpers for the group dashboard.
// Extracted from App.tsx; no React, state, or side effects.
import type { Contact } from './dashboardTypes'

export function taskDueLabel(task: { due?: string; dueLabel?: string; displayDue?: string }) {
  const displayDue = task.dueLabel ?? task.displayDue
  if (displayDue) return String(displayDue)
  const isoMatch = String(task.due ?? '').match(/^\d{4}-(\d{2}-\d{2})/)
  return isoMatch?.[1] ?? String(task.due ?? '')
}

export function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function formatDigitalTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  const hour = date.getHours() % 12 || 12
  return `${pad(hour)}:${pad(date.getMinutes())}`
}

export function formatDigitalSecond(date: Date) {
  return String(date.getSeconds()).padStart(2, '0')
}

export function formatMeridiem(date: Date) {
  return date.getHours() >= 12 ? 'PM' : 'AM'
}

export function formatDayCode(date: Date) {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  return `${date.getFullYear()} ${days[date.getDay()]}`
}

export function formatDateCode(date: Date) {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return `${months[date.getMonth()]} ${date.getDate()}-${String(date.getFullYear()).slice(2)}`
}

export function ownerDetail(owner: string, directory: Record<string, string>) {
  return directory[owner] ?? owner
}

export function brandColor(value: number) {
  if (value < 55) return 'red'
  if (value < 70) return 'orange'
  if (value > 88) return 'green'
  return 'blue'
}

export function statusPillClass(status: string) {
  if (status === '正常') return 'pill-green'
  if (status === '预警') return 'pill-orange'
  return 'pill-gray'
}

export function toCsv(rows: readonly Contact[]) {
  const header = ['模块', '公司/品牌', '一级对接人', '直接汇报对象', '状态', '备注']
  const body = rows.map((item) => [item.module, item.company, item.contact, item.reportsTo, item.status, item.remark])
  return [header, ...body].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}
