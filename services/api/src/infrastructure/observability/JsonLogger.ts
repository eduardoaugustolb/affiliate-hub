type LogValue = string | number | boolean | null | undefined | { [key: string]: LogValue }

type LogFields = Record<string, LogValue>

export class JsonLogger {
  private baseFields: LogFields

  constructor(baseFields?: LogFields) {
    this.baseFields = baseFields ?? {}
  }

  child(baseFields: LogFields): JsonLogger {
    return new JsonLogger({ ...this.baseFields, ...baseFields })
  }

  info(event: string, fields?: LogFields): void {
    this.write('info', event, fields)
  }

  warn(event: string, fields?: LogFields): void {
    this.write('warn', event, fields)
  }

  error(event: string, error: unknown, fields?: LogFields): void {
    const serializedError = JsonLogger.serializeError(error)
    const serializedFields: LogFields = {
      ...fields,
      error: serializedError,
    }
    this.write('error', event, serializedFields)
  }

  private write(level: 'info' | 'warn' | 'error', event: string, fields?: LogFields) {
    console[level](
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        event,
        ...this.baseFields,
        ...fields,
      }),
    )
  }

  private static serializeError(error: unknown): { name: string; message: string; stack?: string } {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    return { name: 'UnknownError', message: String(error) }
  }
}
