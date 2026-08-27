export function formatCurrency(amount: number, currency: string = "USD"): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactNumber(amount: number): string {
  if (isNaN(amount) || amount === null) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toISOString().split("T")[0];
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateTimeString?: string | null): string {
  if (!dateTimeString) return "—";
  try {
    const d = new Date(dateTimeString);
    if (isNaN(d.getTime())) return dateTimeString;
    return d.toISOString().replace("T", " ").substring(0, 16);
  } catch {
    return dateTimeString;
  }
}

export function formatMinutesToDuration(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes <= 0) return "0d 00h 00m";
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutesAfterDays = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingMinutesAfterDays / 60);
  const minutes = Math.round(remainingMinutesAfterDays % 60);

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(minutes)}m`;
  }
  return `${pad(hours)}h ${pad(minutes)}m`;
}

export function formatMinutesToDays(minutes: number): string {
  if (isNaN(minutes) || minutes === 0) return "0.00 days";
  const days = minutes / (24 * 60);
  return `${days.toFixed(2)} days`;
}

export function parseDurationToMinutes(durationStr: string): number {
  if (!durationStr) return 0;
  let total = 0;
  const daysMatch = durationStr.match(/(\d+)\s*d/);
  const hoursMatch = durationStr.match(/(\d+)\s*h/);
  const minsMatch = durationStr.match(/(\d+)\s*m/);

  if (daysMatch) total += parseInt(daysMatch[1], 10) * 24 * 60;
  if (hoursMatch) total += parseInt(hoursMatch[1], 10) * 60;
  if (minsMatch) total += parseInt(minsMatch[1], 10);

  return total;
}
