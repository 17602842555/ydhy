// Turn an API failure into a short, actionable, user-facing message instead of
// surfacing raw status codes like "保存失败：500" or "Failed to fetch".
//
// describeApiError categorizes by HTTP status (auth / permission / validation /
// server) and prefers the backend's structured reason for client errors.
// describeError handles thrown errors, mapping fetch network failures (which
// arrive as a TypeError) to a retry hint.
type ApiErrorBody = { error?: string; reason?: string; requestId?: string }

export function describeApiError(status: number, body: ApiErrorBody | null | undefined, fallback = '操作失败'): string {
  const reason = body?.reason || body?.error
  const requestId = body?.requestId
  if (status === 401) return '登录已过期，请重新登录后再试。'
  if (status === 403) return body?.reason || '没有权限执行此操作，请联系管理员开通。'
  if (status === 409) return reason || '数据已存在或发生冲突，请刷新后再试。'
  if (status === 400 || status === 422) return reason || '提交的内容有误，请检查后再试。'
  if (status >= 500) return `服务器出错，请稍后重试${requestId ? `（追踪号 ${requestId}）` : ''}。`
  return reason || `${fallback}（${status}）`
}

export function isNetworkError(error: unknown): boolean {
  // fetch() rejects with a TypeError when the request never reaches the server.
  return error instanceof TypeError
}

export function describeError(error: unknown, fallback = '操作失败'): string {
  if (isNetworkError(error)) return '网络连接失败，请检查网络后重试。'
  if (error instanceof Error && error.message) return error.message
  return fallback
}
