export function formatDateTime(
  value: Date | string | number | null | undefined,
  locale: string,
): string {
  if (value == null) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

export function formatNumber(
  value: number | null | undefined,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatOptionalNumber(
  value: number | null | undefined,
  locale: string,
  unavailableLabel: string,
): string {
  if (value == null) {
    return unavailableLabel;
  }
  return formatNumber(value, locale, { maximumFractionDigits: 4 });
}

export function formatList(
  values: number[],
  locale: string,
): string {
  if (values.length === 0) {
    return "—";
  }
  return values
    .map((v) => formatNumber(v, locale, { maximumFractionDigits: 0 }))
    .join(", ");
}
