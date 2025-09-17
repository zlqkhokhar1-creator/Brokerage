export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions<TBody> {
  method?: HttpMethod
  body?: TBody
  headers?: Record<string, string>
  next?: RequestInit['next']
  cache?: RequestInit['cache']
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

export async function apiFetch<TData = unknown, TBody = unknown>(
  path: string,
  options: RequestOptions<TBody> = {},
): Promise<TData> {
  const { method = 'GET', body, headers, next, cache } = options
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    next,
    cache,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${method} ${path} failed: ${res.status} ${text}`)
  }
  // Try JSON; fallback to text
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return (await res.json()) as TData
  }
  return (await res.text()) as unknown as TData
}

