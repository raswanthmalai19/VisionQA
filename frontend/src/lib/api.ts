const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("visionqa_token");
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error ${res.status}`);
  }

  return res.json();
}

// Auth
export async function register(email: string, password: string) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data.token) {
    localStorage.setItem("visionqa_token", data.token);
    localStorage.setItem("visionqa_user", JSON.stringify(data));
  }
  return data;
}

export function logout() {
  localStorage.removeItem("visionqa_token");
  localStorage.removeItem("visionqa_user");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("visionqa_user");
  return raw ? JSON.parse(raw) : null;
}

// Sessions
export async function createSession(url: string, prompt: string) {
  return apiFetch("/sessions", {
    method: "POST",
    body: JSON.stringify({ url, prompt }),
  });
}

export async function listSessions() {
  return apiFetch("/sessions");
}

export async function getSession(sessionId: string) {
  return apiFetch(`/sessions/${sessionId}`);
}

export async function executeSession(sessionId: string) {
  return apiFetch(`/sessions/${sessionId}/execute`, { method: "POST" });
}

export async function getTestcases(sessionId: string) {
  return apiFetch(`/sessions/${sessionId}/testcases`);
}

// Reports
export async function getReport(sessionId: string) {
  return apiFetch(`/reports/${sessionId}`);
}

// SSE stream for live pipeline
export function streamSessionStatus(
  sessionId: string,
  onUpdate: (data: any) => void,
  onDone: () => void,
): () => void {
  const token = getToken();
  const url = `${API_URL}/sessions/${sessionId}/stream`;

  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        onDone();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));
              onUpdate(parsed);
            } catch {}
          }
        }
      }
    } catch {
      // aborted or network error
    } finally {
      onDone();
    }
  })();

  return () => controller.abort();
}
