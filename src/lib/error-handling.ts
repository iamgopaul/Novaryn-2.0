/**
 * Error handling helpers: report errors consistently and extract user-friendly messages.
 */
import { logger } from './logger'

/** Human-readable message from an unknown error (for UI or logs). */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  return fallback
}

/**
 * Report an error with context. Logs now; can be extended to send to Sentry etc.
 */
export function reportError(
  error: unknown,
  context: string,
  extra?: Record<string, unknown>
): void {
  const message = getErrorMessage(error, 'Unknown error')
  logger.error(message, context, error)
  if (extra && Object.keys(extra).length > 0) {
    logger.debug('Extra context', context, extra)
  }
}

/**
 * Wrap an async function so any thrown error is reported with the given context.
 * Returns a function that returns the same value or rethrows after logging.
 */
export function withErrorLogging<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: string
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args)
    } catch (e) {
      reportError(e, context)
      throw e
    }
  }) as T
}
