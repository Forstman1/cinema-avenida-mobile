const MAX_SAFE_ERROR_MESSAGE_LENGTH = 240;

/**
 * Only expose short, single-line messages from an API response.
 * HTML pages and server stack traces must never be rendered in the app UI.
 */
export function getSafeErrorText(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const message = value.trim();
  if (
    !message ||
    message.length > MAX_SAFE_ERROR_MESSAGE_LENGTH ||
    message.includes('\n') ||
    message.includes('\r') ||
    message.startsWith('<') ||
    /<\/?[a-z][^>]*>/i.test(message)
  ) {
    return null;
  }

  return message;
}
