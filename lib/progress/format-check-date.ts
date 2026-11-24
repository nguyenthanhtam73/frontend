const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function yearInVietnam(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
    }).format(now),
  );
}

/** vi: 24/11 or 03/01, and 03/01/2025 when the year is not this year. */
export function formatCheckDate(iso: string, locale: string, now: Date = new Date()): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return iso;
  const thisYear = yearInVietnam(now);
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  if (locale.toLowerCase().startsWith("en")) {
    const label = `${EN_MONTHS[month - 1]} ${dd}`;
    return year === thisYear ? label : `${label}, ${year}`;
  }
  const label = `${dd}/${mm}`;
  return year === thisYear ? label : `${label}/${year}`;
}
