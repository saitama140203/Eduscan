/**
 * Utility functions for handling AbortController to prevent AbortError
 */

export class SafeAbortController {
  private controller: AbortController
  private isAborted = false

  constructor() {
    this.controller = new AbortController()
  }

  get signal(): AbortSignal {
    return this.controller.signal
  }

  abort(reason?: any): void {
    if (!this.isAborted) {
      this.isAborted = true
      this.controller.abort(reason)
    }
  }

  get aborted(): boolean {
    return this.isAborted || this.controller.signal.aborted
  }
}

/**
 * Creates a fetch function with AbortController support
 */
export function createFetchWithAbort(
  url: string,
  options: RequestInit = {}
): { fetch: Promise<Response>; abort: () => void } {
  const controller = new SafeAbortController()
  
  const fetch = window.fetch(url, {
    ...options,
    signal: controller.signal,
  })

  return {
    fetch: fetch.catch((error) => {
      // Don't throw AbortError if we aborted intentionally
      if (error.name === 'AbortError' && controller.aborted) {
        return new Response(null, { status: 499, statusText: 'Request cancelled' })
      }
      throw error
    }),
    abort: () => controller.abort(),
  }
}

/**
 * Hook utility for async operations with cleanup
 */
export function createAsyncOperation<T>(
  operation: (signal: AbortSignal) => Promise<T>
): { execute: () => Promise<T | null>; cancel: () => void } {
  const controller = new SafeAbortController()

  return {
    execute: async () => {
      try {
        return await operation(controller.signal)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Silent abort - this is expected behavior
          return null
        }
        throw error
      }
    },
    cancel: () => controller.abort(),
  }
} 