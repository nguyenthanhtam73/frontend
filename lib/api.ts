/**
 * API base URL for the Go backend. Override per environment in `.env.local`.
 */
export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8080";
