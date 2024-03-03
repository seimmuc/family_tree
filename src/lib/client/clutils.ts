const DEFAULT_DATE_FORMAT_OPRIONS: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

export function truncateString(str: string, maxChars: number, maxLines: number): [string, boolean] {
  let result = str;
  let wasShortened = false;
  if (str.length > maxChars) {
    result = str.substring(0, maxChars);
    wasShortened = true;
  }
  const lines = result.split('\n');
  if (lines.length > maxLines) {
    result = lines.slice(0, maxLines).join('\n');
    wasShortened = true;
  }
  return [result, wasShortened];
}

export function formatDate(dateString?: string, dateFormatOptions: Intl.DateTimeFormatOptions = DEFAULT_DATE_FORMAT_OPRIONS): string {
  if (!dateString) {
    return 'unknown';
  }
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, dateFormatOptions);
}
