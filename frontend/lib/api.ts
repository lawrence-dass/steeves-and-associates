const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").trim();

export function buildApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`API path must start with '/': ${path}`);
  }
  // Default to same-origin so Next.js rewrites can proxy /api/* to Flask.
  return API_BASE ? `${API_BASE}${path}` : path;
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has("Content-Type") && options?.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(buildApiUrl(path), {
      ...options,
      headers,
    });
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(
        `Network error calling ${buildApiUrl(path)}. ${err.message}. ` +
          "Confirm both frontend and backend dev servers are running."
      );
    }
    throw err;
  }

  if (!res.ok) {
    const body = await res.text();
    const snippet = body ? ` - ${body.slice(0, 180)}` : "";
    throw new Error(`API error: ${res.status} ${res.statusText}${snippet}`);
  }

  return res.json();
}

export async function postApi<T>(path: string, body: unknown): Promise<T> {
  return fetchApi<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
