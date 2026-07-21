/** Shared E2E env (loaded via playwright.config dotenv). */

export function apiURL(): string {
  return (
    process.env.E2E_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080"
  ).replace(/\/$/, "");
}

export function webURL(): string {
  return (process.env.E2E_WEB_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function sepaySecret(): string {
  return (
    process.env.E2E_SEPAY_SECRET_KEY ||
    process.env.DADIARY_SEPAY_SECRET_KEY ||
    "spsk_test_UHoXRUQEfLBChDYghS6AE8B6V9HQpErZ"
  );
}

export function e2eSecret(): string {
  return process.env.E2E_SECRET || process.env.DADIARY_E2E_SECRET || "";
}

export function defaultPassword(): string {
  return process.env.E2E_USER_PASSWORD || "SmokeTest1!";
}
