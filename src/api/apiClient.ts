// apiClient — thin fetch wrapper around the Dragon's Throne Spring Boot
// backend (auth + campaign-progress sync + Battle Royale leaderboard).
//
// The auth token lives in a MODULE-LEVEL variable — never localStorage, never
// React state — per the backend spec. It's set on register/login and cleared
// on logout, and attached as `Authorization: Bearer <token>` on every request.

const BASE_URL = 'http://localhost:8080';

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function isAuthenticated(): boolean {
  return authToken !== null;
}

// ── Shared types (mirror the backend DTOs) ──────────────────────────────
export interface LevelProgress {
  stars: number;
  bestTimeMs: number | null;
  unitsLost: number;
}

export interface SettingsPayload {
  musicVolume: number;
  sfxVolume: number;
}

// completedLevels is keyed by level id; JSON object keys are strings, which
// interops fine with the store's numeric indexing (JS coerces on lookup).
export interface ProgressPayload {
  completedLevels: Record<string, LevelProgress>;
  settings: SettingsPayload;
}

export interface AuthResult {
  token: string;
  username: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  elapsedMs: number;
  difficulty: string;
}

export interface LeaderboardView {
  entries: LeaderboardEntry[];
  myBest: LeaderboardEntry | null;
}

export interface LeaderboardSubmit {
  score: number;
  elapsedMs: number;
  difficulty: string;
}

export interface SubmitResult {
  entry: LeaderboardEntry;
  rank: number;
}

/** Error carrying the HTTP status (0 = network/unreachable). */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is it running on :8080?');
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body.error === 'string') message = body.error;
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new ApiError(res.status, message);
  }

  // Some endpoints (logout, PUT progress) return an empty 200 body.
  const text = await res.text();
  return (text ? (JSON.parse(text) as T) : (undefined as T));
}

// ── Auth ─────────────────────────────────────────────────────────────────
export async function register(username: string, password: string): Promise<AuthResult> {
  const result = await request<AuthResult>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setAuthToken(result.token);
  return result;
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const result = await request<AuthResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setAuthToken(result.token);
  return result;
}

export async function logout(): Promise<void> {
  try {
    await request<void>('/api/auth/logout', { method: 'POST' });
  } finally {
    // Always drop the local token, even if the server call fails.
    setAuthToken(null);
  }
}

// ── Campaign progress ──────────────────────────────────────────────────
export async function fetchProgress(): Promise<ProgressPayload> {
  return request<ProgressPayload>('/api/progress', { method: 'GET' });
}

export async function putProgress(payload: ProgressPayload): Promise<void> {
  await request<void>('/api/progress', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ── Battle Royale leaderboard ──────────────────────────────────────────
export async function fetchLeaderboard(mapId: string): Promise<LeaderboardView> {
  return request<LeaderboardView>(`/api/leaderboard/${encodeURIComponent(mapId)}`, { method: 'GET' });
}

export async function submitLeaderboard(mapId: string, body: LeaderboardSubmit): Promise<SubmitResult> {
  return request<SubmitResult>(`/api/leaderboard/${encodeURIComponent(mapId)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
