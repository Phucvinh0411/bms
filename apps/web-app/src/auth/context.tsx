"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  authApi,
  UserProfile,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ForgotPasswordConfirmRequest,
  ChangePasswordWithOtpRequest,
} from "../api/auth";
import {
  clearAuthTokens,
  setAuthSyncListener,
  setAuthToken,
  setAuthTokens,
  setRefreshToken,
} from "../api/client";

const AUTH_SESSIONS_KEY = "auth_sessions";
const ACTIVE_SESSION_ID_KEY = "active_session_id";

interface AuthSessionRecord {
  token: string;
  refreshToken: string;
  user: UserProfile;
  role: string;
  lastAccessedAt: number;
}

type AuthSessions = Record<string, AuthSessionRecord>;

interface AuthContextType {
  user: UserProfile | null;
  activeUser: UserProfile | null;
  activeToken: string | null;
  activeSessionId: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (credentials: LoginRequest) => Promise<UserProfile>;
  register: (data: RegisterRequest) => Promise<void>;
  switchAccount: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  sendForgotPasswordOtp: (data: ForgotPasswordRequest) => Promise<void>;
  confirmForgotPassword: (data: ForgotPasswordConfirmRequest) => Promise<void>;
  sendChangePasswordOtp: () => Promise<void>;
  confirmChangePassword: (data: ChangePasswordWithOtpRequest) => Promise<void>;
  error: string | null;
  clearError: () => void;
  setActiveUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setActiveToken: React.Dispatch<React.SetStateAction<string | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getSessionId(user: any) {
  // Ưu tiên dùng id, _id hoặc email của user làm khóa duy nhất
  const identifier = user?.id || user?._id || user?.email;
  
  if (identifier) {
    return `session_user_${identifier}`;
  }

  // Fallback an toàn dự phòng nếu API không trả về các field trên
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readAuthSessions(): AuthSessions {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(AUTH_SESSIONS_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as AuthSessions;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function writeAuthSessions(sessions: AuthSessions) {
  localStorage.setItem(AUTH_SESSIONS_KEY, JSON.stringify(sessions));
}

function getMostRecentlyAccessedSession(sessions: AuthSessions) {
  const entries = Object.entries(sessions);
  if (entries.length === 0) {
    return null;
  }

  return entries.sort(([, left], [, right]) => right.lastAccessedAt - left.lastAccessedAt)[0];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [activeRefreshToken, setActiveRefreshToken] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const hydratedRef = useRef(false);
  const sessionsRef = useRef<AuthSessions>({});
  const activeSessionIdRef = useRef<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const activateSession = useCallback(
    (sessionId: string, session: AuthSessionRecord, sessions: AuthSessions) => {
      const nextSession: AuthSessionRecord = {
        ...session,
        lastAccessedAt: Date.now(),
      };

      const nextSessions = {
        ...sessions,
        [sessionId]: nextSession,
      };

      writeAuthSessions(nextSessions);
      sessionsRef.current = nextSessions;
      activeSessionIdRef.current = sessionId;
      setActiveSessionId(sessionId);
      setActiveUser(nextSession.user);
      setActiveToken(nextSession.token);
      setActiveRefreshToken(nextSession.refreshToken);
      setAuthTokens(nextSession.token, nextSession.refreshToken);
      sessionStorage.setItem(ACTIVE_SESSION_ID_KEY, sessionId);
    },
    [],
  );

  const syncSessionRecord = useCallback(
    (sessionId: string | null, updater: (session: AuthSessionRecord) => AuthSessionRecord) => {
      if (!sessionId) {
        return null;
      }

      const currentSession = sessionsRef.current[sessionId];
      if (!currentSession) {
        return null;
      }

      const updatedSession: AuthSessionRecord = {
        ...updater(currentSession),
        lastAccessedAt: Date.now(),
      };

      const nextSessions = {
        ...sessionsRef.current,
        [sessionId]: updatedSession,
      };

      writeAuthSessions(nextSessions);
      sessionsRef.current = nextSessions;
      activeSessionIdRef.current = sessionId;
      setActiveSessionId(sessionId);
      setActiveUser(updatedSession.user);
      setActiveToken(updatedSession.token);
      setActiveRefreshToken(updatedSession.refreshToken);
      setAuthTokens(updatedSession.token, updatedSession.refreshToken);
      sessionStorage.setItem(ACTIVE_SESSION_ID_KEY, sessionId);

      return updatedSession;
    },
    [],
  );

  const clearActiveSession = useCallback(
    (options?: { removeFromStorage?: boolean }) => {
      const removeFromStorage = options?.removeFromStorage ?? true;
      const sessionId = activeSessionIdRef.current;

      if (removeFromStorage && sessionId && sessionsRef.current[sessionId]) {
        const nextSessions = { ...sessionsRef.current };
        delete nextSessions[sessionId];
        sessionsRef.current = nextSessions;
        writeAuthSessions(nextSessions);
      }

      activeSessionIdRef.current = null;
      setActiveSessionId(null);
      if (removeFromStorage) {
        sessionStorage.removeItem(ACTIVE_SESSION_ID_KEY);
      }
      setActiveUser(null);
      setActiveToken(null);
      setActiveRefreshToken(null);
      clearAuthTokens();
    },
    [],
  );

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const sessions = readAuthSessions();
      sessionsRef.current = sessions;

      const storedSessionId = sessionStorage.getItem(ACTIVE_SESSION_ID_KEY);
      activeSessionIdRef.current = storedSessionId;

      if (storedSessionId && sessions[storedSessionId]) {
        activateSession(storedSessionId, sessions[storedSessionId], sessions);
      } else if (!storedSessionId) {
        const mostRecentSession = getMostRecentlyAccessedSession(sessions);

        if (mostRecentSession) {
          const [sessionId, session] = mostRecentSession;
          activateSession(sessionId, session, sessions);
        } else {
          clearActiveSession({ removeFromStorage: false });
        }
      } else {
        clearActiveSession();
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      clearActiveSession();
    } finally {
      setIsLoading(false);
    }
  }, [activateSession, clearActiveSession]);

  useEffect(() => {
    if (hydratedRef.current) {
      return;
    }

    hydratedRef.current = true;
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    setAuthToken(activeToken);
  }, [activeToken]);

  useEffect(() => {
    setRefreshToken(activeRefreshToken);
  }, [activeRefreshToken]);

  useEffect(() => {
    setAuthSyncListener((tokens) => {
      if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
        clearActiveSession();
        return;
      }

      const accessToken = tokens.accessToken;
      const refreshToken = tokens.refreshToken;

      const sessionId = activeSessionIdRef.current;
      const updated = syncSessionRecord(sessionId, (session) => ({
        ...session,
        token: accessToken,
        refreshToken: refreshToken,
      }));

      if (!updated) {
        setAuthTokens(accessToken, refreshToken);
      }
    });

    return () => setAuthSyncListener(null);
  }, [clearActiveSession, syncSessionRecord]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_SESSIONS_KEY) {
        return;
      }

      const sessionId = sessionStorage.getItem(ACTIVE_SESSION_ID_KEY);
      if (!sessionId) {
        return;
      }

      let updatedSessions: AuthSessions = {};

      if (event.newValue) {
        try {
          updatedSessions = JSON.parse(event.newValue) as AuthSessions;
        } catch {
          return;
        }
      }

      if (updatedSessions[sessionId]) {
        sessionsRef.current = updatedSessions;
        return;
      }

      clearActiveSession({ removeFromStorage: false });
      sessionStorage.removeItem(ACTIVE_SESSION_ID_KEY);
      window.location.href = "/auth/login";
    };

    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);
  }, [clearActiveSession]);

const persistSession = useCallback(
    (sessionData: {
      token: string;
      refreshToken: string;
      user: UserProfile;
      role?: string;
    }) => {
      // 1. Lấy ID cố định của user thay vì random
      const sessionId = getSessionId(sessionData.user);
      
      // 2. Kiểm tra xem session này đã tồn tại trong kho chưa
      const existingSession = sessionsRef.current[sessionId];

      // 3. Tạo session mới: Ghi đè token và thời gian mới nhất, giữ lại role cũ nếu có
      const nextSession: AuthSessionRecord = {
        ...(existingSession || {}), // Kế thừa data cũ (nếu có)
        token: sessionData.token,
        refreshToken: sessionData.refreshToken,
        user: sessionData.user,
        role: sessionData.role ?? sessionData.user.role ?? existingSession?.role,
        lastAccessedAt: Date.now(), // Luôn cập nhật thời gian mới nhất
      };

      const nextSessions = {
        ...sessionsRef.current,
        [sessionId]: nextSession,
      };

      writeAuthSessions(nextSessions);
      activateSession(sessionId, nextSession, nextSessions);
    },
    [activateSession],
  );

  const login = useCallback(
    async (credentials: LoginRequest) => {
      try {
        setIsLoading(true);
        clearError();
        const response = await authApi.login(credentials);

        const userProfile = await authApi.me();
        persistSession({
          token: response.accessToken,
          refreshToken: response.refreshToken,
          user: userProfile,
        });
        return userProfile;
      } catch (err: any) {
        clearAuthTokens();
        const errorMessage =
          err?.error?.message ||
          err?.message ||
          "Login failed. Please try again.";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, persistSession],
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      try {
        setIsLoading(true);
        clearError();
        const response = await authApi.register(data);

        const userProfile = await authApi.me();
        persistSession({
          token: response.accessToken,
          refreshToken: response.refreshToken,
          user: userProfile,
        });
      } catch (err: any) {
        clearAuthTokens();
        const errorMessage =
          err?.error?.message ||
          err?.message ||
          "Registration failed. Please try again.";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, persistSession],
  );

  const switchAccount = useCallback(
    async (sessionId: string) => {
      const session = sessionsRef.current[sessionId];

      if (!session) {
        throw new Error("Session not found.");
      }

      activateSession(sessionId, session, sessionsRef.current);
    },
    [activateSession],
  );

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await authApi.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      clearActiveSession();
      setIsLoading(false);
    }
  }, [clearActiveSession]);

  const sendForgotPasswordOtp = useCallback(
    async (data: ForgotPasswordRequest) => {
      try {
        setIsLoading(true);
        clearError();
        await authApi.sendForgotPasswordOtp(data);
      } catch (err: any) {
        setError(err?.message || "Failed to send OTP.");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError],
  );

  const confirmForgotPassword = useCallback(
    async (data: ForgotPasswordConfirmRequest) => {
      try {
        setIsLoading(true);
        clearError();
        await authApi.confirmForgotPassword(data);
      } catch (err: any) {
        setError(err?.message || "Failed to reset password.");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError],
  );

  const sendChangePasswordOtp = useCallback(async () => {
    try {
      setIsLoading(true);
      clearError();
      await authApi.sendChangePasswordOtp();
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  const confirmChangePassword = useCallback(
    async (data: ChangePasswordWithOtpRequest) => {
      try {
        setIsLoading(true);
        clearError();
        await authApi.confirmChangePassword(data);
      } catch (err: any) {
        setError(err?.message || "Failed to change password.");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError],
  );

  if (!mounted) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        activeUser,
        activeToken,
        activeSessionId,
        isLoading,
        isSignedIn: !!activeUser,
        login,
        register,
        switchAccount,
        logout,
        checkAuth,
        sendForgotPasswordOtp,
        confirmForgotPassword,
        sendChangePasswordOtp,
        confirmChangePassword,
        error,
        clearError,
        setActiveUser,
        setActiveToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
