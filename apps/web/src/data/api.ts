import { z } from 'zod';
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}
export async function apiBlob(path: string) {
  const response = await fetch(`/api/v1${path}`, {
    credentials: 'same-origin',
  });
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event('buildos-auth-expired'));
    throw new ApiError('FILE_NOT_FOUND', response.status);
  }
  return response.blob();
}
export async function api<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestInit = {},
) {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      credentials: 'same-origin',
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError('SERVER_UNAVAILABLE', 0);
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('SERVER_UNAVAILABLE', response.status);
  }
  if (!response.ok) {
    const error = z.object({ code: z.string() }).safeParse(data);
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('buildos-auth-expired'));
    throw new ApiError(
      error.success ? error.data.code : 'REQUEST_FAILED',
      response.status,
    );
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ApiError('INVALID_RESPONSE', response.status);
  return parsed.data;
}
