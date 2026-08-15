const KILOMETRES_PER_AU = 149597870.7;

export function formatDistanceKilometres(kilometres, locale = "en") {
  if (!Number.isFinite(kilometres)) return "—";
  const language = locale === "ko" ? "ko-KR" : "en-US";
  const magnitude = Math.abs(kilometres);
  if (magnitude >= KILOMETRES_PER_AU * 0.1) {
    return `${(kilometres / KILOMETRES_PER_AU).toLocaleString(language, { maximumFractionDigits: 4 })} AU`;
  }
  if (magnitude >= 1e6) {
    return `${(kilometres / 1e6).toLocaleString(language, { maximumFractionDigits: 4 })} ${locale === "ko" ? "백만 km" : "million km"}`;
  }
  return `${kilometres.toLocaleString(language, { maximumFractionDigits: 3 })} km`;
}

export function formatMetresPerWorldUnit(metres, locale = "en") {
  return formatDistanceKilometres(metres / 1000, locale);
}
