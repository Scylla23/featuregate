const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('fg_token');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('fg_token');
      localStorage.removeItem('fg_user');
      window.location.href = '/login';
    }
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(body.error || `HTTP ${res.status}`, res.status, body.details);
  }

  return res.json();
}
