const DEFAULT_MOCK_USER_ID = Number(process.env.NEXT_PUBLIC_MOCK_USER_ID ?? 1001)

export function getEffectiveUserId(): number | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  // 1. Cố gắng đồng bộ lấy ID của User thực tế đang đăng nhập từ auth_sessions
  try {
    const activeSessionId = sessionStorage.getItem('active_session_id')
    const authSessionsRaw = localStorage.getItem('auth_sessions')
    if (activeSessionId && authSessionsRaw) {
      const sessions = JSON.parse(authSessionsRaw)
      const activeSession = sessions[activeSessionId]
      if (activeSession && activeSession.user && activeSession.user.id) {
        const userId = Number(activeSession.user.id)
        if (Number.isFinite(userId) && userId > 0) {
          localStorage.setItem('userId', String(userId))
          return userId
        }
      }
    }
  } catch (err) {
    console.error("Lỗi đồng bộ userId từ auth session:", err)
  }

  // 2. Fallback lấy từ localStorage 'userId'
  const raw = localStorage.getItem('userId')
  const parsed = raw ? Number(raw) : NaN
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  // 3. Fallback mặc định cho dev mode
  localStorage.setItem('userId', String(DEFAULT_MOCK_USER_ID))
  localStorage.setItem('authMode', 'mock')
  return DEFAULT_MOCK_USER_ID
}
