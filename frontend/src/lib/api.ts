const API_BASE =
  typeof window !== "undefined"
    ? (localStorage.getItem("api_base") || "http://localhost:8000/api")
    : "http://localhost:8000/api";

const SUPABASE_SESSION_KEY = "supabase-session";

function getToken(): string {
  if (typeof window === "undefined") return "";
  const sessionStr = localStorage.getItem(SUPABASE_SESSION_KEY);
  if (!sessionStr) return "";
  try {
    const sess = JSON.parse(sessionStr);
    return sess?.access_token ?? "";
  } catch {
    return "";
  }
}

async function request(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
}

export interface LoginResult {
  user?: User;
  error?: string;
}

/** Calls the backend /api/auth/login to sync Supabase JWT to backend DB. */
export async function loginUser(
  email: string,
  password: string
): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    return { error: err.detail || "Login failed" };
  }
  const data = await res.json();
  const token = data.access_token;
  if (!token) return { error: "No token returned" };

  // Store backend JWT so API calls include the token
  localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify({
    access_token: token,
    refresh_token: data.refresh_token || "",
  }));

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      user: {
        id: payload.sub || "",
        email: payload.email || email,
        username: payload.username || email.split("@")[0],
      },
    };
  } catch {
    return { user: { id: "", email, username: email.split("@")[0] } };
  }
}

/** Calls the backend /api/auth/register to create a local DB record. */
export async function registerUser(
  email: string,
  username: string,
  password: string
): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Registration failed" }));
    return { error: err.detail || "Registration failed" };
  }
  const data = await res.json();
  return {
    user: {
      id: data.id || "",
      email: data.email || email,
      username: data.username || username,
    },
  };
}

export function logout(): void {
  localStorage.removeItem(SUPABASE_SESSION_KEY);
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000;
    return Date.now() < exp;
  } catch {
    return false;
  }
}

export function getCurrentUser(): User | null {
  if (!isLoggedIn()) return null;
  const token = getToken();
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      id: payload.sub || "",
      email: payload.email || "",
      username: payload.username || "",
    };
  } catch {
    return null;
  }
}

// ─── Lyrics Generation ────────────────────────────────────────────────────────

export interface GenerateLyricsResult {
  lyrics?: string;
  caption?: string;
  error?: string;
}

export async function generateLyrics(
  words: string
): Promise<GenerateLyricsResult> {
  const res = await request("/generate/lyrics", {
    method: "POST",
    body: JSON.stringify({ words }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to generate lyrics" }));
    return { error: err.detail || "Failed to generate lyrics" };
  }
  const data = await res.json();
  return {
    lyrics: data.lyrics || "",
    caption: data.caption || "",
  };
}

// ─── Music Generation ────────────────────────────────────────────────────────

export interface GenerateResponse {
  job_id?: string;
  task_id?: string;
  events_url: string;
}

export interface TaskState {
  task_id: string;
  user_id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  message: string;
  payload: Record<string, unknown>;
  result: {
    song_id?: string;
    audio_url?: string;
    cover_image_url?: string;
  } | null;
}

export async function createMusicGeneration(params: {
  mode: "simple" | "custom";
  caption?: string;
  lyrics: string;
  title?: string;
  genre?: string;
}): Promise<{ job_id: string; events_url: string; error?: string }> {
  const res = await request("/music/generate", {
    method: "POST",
    body: JSON.stringify({
      mode: params.mode,
      caption: params.caption,
      lyrics: params.lyrics,
      title: params.title,
      genre: params.genre,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to start generation" }));
    return { job_id: "", events_url: "", error: err.detail || "Failed to start generation" };
  }
  const data: GenerateResponse = await res.json();
  const id = data.job_id || data.task_id || "";
  const eventsUrl = data.events_url.startsWith("/")
    ? `${API_BASE.replace("/api", "")}${data.events_url}`
    : data.events_url;
  return { job_id: id, events_url: eventsUrl, error: undefined };
}
