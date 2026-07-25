function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function localDayKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const start = startOfLocalDay(date);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const d = String(start.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatAiChatBubbleTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatAiChatDayLabel(
  iso: string,
  locale: string,
  labels: { readonly today: string; readonly yesterday: string },
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const dayStart = startOfLocalDay(date).getTime();
  const todayStart = startOfLocalDay(new Date()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (dayStart === todayStart) {
    return labels.today;
  }
  if (dayStart === todayStart - dayMs) {
    return labels.yesterday;
  }
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}
