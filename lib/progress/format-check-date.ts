const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function yearInVietnam(now: Date): number {
  const year = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
  }).format(now);
  return Number(year);
}

/** Journal dates: vi `24/11`, plus the year when it is not this year. */
export function formatCheckDate(iso: string, locale: string, now: Date = new Date()): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return iso;
  const thisYear = yearInVietnam(now);
  const en = locale.toLowerCase().startsWith("en");
  if (en) {
    const label = `${EN_MONTHS[month - 1]} ${day}`;
    return year === thisYear ? label : `${label}, ${year}`;
  }
  const label = `${day}/${month}`;
  return year === thisYear ? label : `${label}/${year}`;
}
