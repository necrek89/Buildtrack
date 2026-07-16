// Local calendar date as YYYY-MM-DD (unlike toISOString, does not shift to UTC)
export function toLocalDateStr(date = new Date()) {
  const d = new Date(date)
  const tzOffsetMs = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10)
}

export function todayStr() {
  return toLocalDateStr(new Date())
}
