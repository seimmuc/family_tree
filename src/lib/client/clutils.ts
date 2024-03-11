import type { Action } from 'svelte/action';

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

export function formatDate(
  dateString?: string,
  dateType: string | undefined = undefined,
  dateFormatOptions: Intl.DateTimeFormatOptions | undefined = DEFAULT_DATE_FORMAT_OPRIONS
): string {
  if (!dateString) {
    return `unknown ${dateType ? dateType + ' ' : ''}date`;
  }
  dateFormatOptions ??= DEFAULT_DATE_FORMAT_OPRIONS;
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, dateFormatOptions);
}

export const nonewlines: Action<HTMLElement, undefined, { 'on:returnkey': (e: CustomEvent<KeyboardEvent>) => void }> = (
  node: HTMLElement
) => {
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      node.dispatchEvent(new CustomEvent('returnkey', { detail: e }));
    }
  }
  function onPaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text');
    if (text?.includes('\n')) {
      e.preventDefault();
    }
  }
  node.addEventListener('keydown', onKeydown);
  node.addEventListener('paste', onPaste);
  return {
    destroy() {
      node.removeEventListener('keydown', onKeydown);
      node.removeEventListener('paste', onPaste);
    }
  };
};
