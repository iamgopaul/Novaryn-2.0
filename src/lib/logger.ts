/**
 * Central logger for the app. Use this instead of console.* so we can:
 * - See consistent format (timestamp, level, context)
 * - Filter by level in dev
 * - Plug in external services (e.g. Sentry) later
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MIN_LEVEL: LogLevel =
  (import.meta.env.DEV ? 'debug' : 'info') as LogLevel

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL]
}

function formatPayload(
  level: LogLevel,
  context: string | undefined,
  message: string,
  data?: unknown
): string {
  const time = new Date().toISOString()
  const prefix = context ? `[${context}]` : ''
  const levelTag = level.toUpperCase().padEnd(5)
  return `${time} ${levelTag} ${prefix} ${message}`
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }
  return { value: String(error) }
}

export const logger = {
  debug(message: string, context?: string, data?: unknown) {
    if (!shouldLog('debug')) return
    const formatted = formatPayload('debug', context, message, data)
    if (data !== undefined) {
      console.debug(formatted, data)
    } else {
      console.debug(formatted)
    }
  },

  info(message: string, context?: string, data?: unknown) {
    if (!shouldLog('info')) return
    const formatted = formatPayload('info', context, message, data)
    if (data !== undefined) {
      console.info(formatted, data)
    } else {
      console.info(formatted)
    }
  },

  warn(message: string, context?: string, data?: unknown) {
    if (!shouldLog('warn')) return
    const formatted = formatPayload('warn', context, message, data)
    if (data !== undefined) {
      console.warn(formatted, data)
    } else {
      console.warn(formatted)
    }
  },

  error(message: string, context?: string, error?: unknown) {
    if (!shouldLog('error')) return
    const formatted = formatPayload('error', context, message)
    if (error !== undefined) {
      const serialized = serializeError(error)
      console.error(formatted, serialized, error)
    } else {
      console.error(formatted)
    }
  },
}
