export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const fallbackMessages: Record<number, string> = {
  400: 'Confira os dados informados.',
  401: 'Sessão inválida ou credenciais incorretas.',
  409: 'Esta operação não pode ser concluída agora.',
}

export async function toApiError(response: Response): Promise<ApiError> {
  let message = fallbackMessages[response.status] ?? 'Não foi possível concluir a operação.'
  try {
    const body: unknown = await response.json()
    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string' &&
      body.message.length > 0
    ) {
      message = body.message
    }
  } catch {
    // Keep the safe status-specific fallback for non-JSON responses.
  }
  return new ApiError(response.status, message)
}
