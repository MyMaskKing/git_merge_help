export class GitOperationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly operation: string,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'GitOperationError'
  }
}

export interface RetryOptions {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  backoffFactor: number
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  backoffFactor: 2,
}

export const RETRYABLE_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'EAGAIN',
])

interface ErrorWithCode {
  code?: string
  message?: string
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  operationName: string = 'unknown'
): Promise<T> {
  const retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | null = null
  let delay = retryOptions.initialDelay

  for (let attempt = 1; attempt <= retryOptions.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error: unknown) {
      const err = error as ErrorWithCode
      lastError = error as Error
      
      // 检查是否是可重试的错误
      const isRetryable =
        error instanceof GitOperationError
          ? error.retryable
          : err.code && RETRYABLE_ERROR_CODES.has(err.code)

      if (!isRetryable || attempt === retryOptions.maxAttempts) {
        throw new GitOperationError(
          `Failed to execute git operation: ${err.message || 'Unknown error'}`,
          err.code || 'UNKNOWN',
          operationName,
          false
        )
      }

      // 计算下一次重试的延迟时间
      delay = Math.min(
        delay * retryOptions.backoffFactor,
        retryOptions.maxDelay
      )

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // 这里理论上不会执行到，因为最后一次失败会在循环中抛出异常
  throw lastError
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof GitOperationError) {
    return error.retryable
  }
  const err = error as ErrorWithCode
  return err.code ? RETRYABLE_ERROR_CODES.has(err.code) : false
}

export function createGitError(
  error: unknown,
  operation: string,
  retryable: boolean = false
): GitOperationError {
  const err = error as ErrorWithCode
  const message = err.message || 'Unknown git operation error'
  const code = err.code || 'UNKNOWN'
  return new GitOperationError(message, code, operation, retryable)
} 