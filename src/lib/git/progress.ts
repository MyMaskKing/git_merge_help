export interface ProgressEvent {
  phase: string
  loaded: number
  total: number
  operation: string
  percent?: number
}

export interface ProgressCallback {
  (event: ProgressEvent): void
}

export interface OperationProgress {
  onProgress?: ProgressCallback
  onPhase?: (phase: string) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

export class ProgressTracker {
  private currentPhase: string = ''
  private loaded: number = 0
  private total: number = 0
  private callbacks: OperationProgress

  constructor(callbacks: OperationProgress = {}) {
    this.callbacks = callbacks
  }

  updateProgress(loaded: number, total: number, operation: string) {
    this.loaded = loaded
    this.total = total

    const event: ProgressEvent = {
      phase: this.currentPhase,
      loaded,
      total,
      operation,
      percent: total > 0 ? Math.round((loaded / total) * 100) : undefined
    }

    this.callbacks.onProgress?.(event)
  }

  setPhase(phase: string) {
    this.currentPhase = phase
    this.loaded = 0
    this.total = 0
    this.callbacks.onPhase?.(phase)
  }

  error(error: Error) {
    this.callbacks.onError?.(error)
  }

  complete() {
    this.callbacks.onComplete?.()
  }

  getProgress(): ProgressEvent {
    return {
      phase: this.currentPhase,
      loaded: this.loaded,
      total: this.total,
      operation: 'current',
      percent: this.total > 0 ? Math.round((this.loaded / this.total) * 100) : undefined
    }
  }
}

export function createProgressTracker(callbacks: OperationProgress = {}): ProgressTracker {
  return new ProgressTracker(callbacks)
} 