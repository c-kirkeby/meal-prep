/**
 * Parses an ISO 8601 duration string (e.g. "PT1H30M") into a plain object
 * compatible with Intl.DurationFormat.
 *
 * Returns null if the string is not a valid ISO 8601 duration.
 */
function parseISO8601Duration(value: string): Intl.DurationInput | null {
  const match = value.match(
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
  )

  if (!match) return null

  // The regex must have at least one capture group set to be a valid duration
  const [, years, months, weeks, days, hours, minutes, seconds] = match
  if (!years && !months && !weeks && !days && !hours && !minutes && !seconds) {
    return null
  }

  return {
    years: years ? parseInt(years, 10) : undefined,
    months: months ? parseInt(months, 10) : undefined,
    weeks: weeks ? parseInt(weeks, 10) : undefined,
    days: days ? parseInt(days, 10) : undefined,
    hours: hours ? parseInt(hours, 10) : undefined,
    minutes: minutes ? parseInt(minutes, 10) : undefined,
    seconds: seconds ? Math.round(parseFloat(seconds)) : undefined,
  }
}

/**
 * Formats an ISO 8601 duration string into a localised human-readable string
 * using Intl.DurationFormat.
 *
 * Falls back to the raw value if the string cannot be parsed or
 * Intl.DurationFormat is unavailable.
 *
 * @example
 * formatDuration("PT15M")          // "15 minutes"  (en-US)
 * formatDuration("PT1H30M", "de")  // "1 Stunde und 30 Minuten"
 */
export function formatDuration(value: string, locale = "en"): string {
  try {
    const duration = parseISO8601Duration(value)
    if (!duration) return value

    const formatter = new Intl.DurationFormat(locale, { style: "long" })
    return formatter.format(duration)
  } catch {
    // Intl.DurationFormat unavailable or formatting failed — return raw value
    return value
  }
}
