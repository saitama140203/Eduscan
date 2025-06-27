import { useState, useEffect, useRef } from "react"
import { SafeAbortController } from "@/lib/abort-controller-utils"

export function useApi<T>(initialData?: T) {
  const [data, setData] = useState<T | undefined>(initialData)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const controllerRef = useRef<SafeAbortController | null>(null)

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort('Component unmounted')
      }
    }
  }, [])

  async function fetchData<R>(
    apiCall: (signal?: AbortSignal) => Promise<R>,
    onSuccess?: (data: R) => void
  ): Promise<R | undefined> {
    if (controllerRef.current) {
      controllerRef.current.abort('New request initiated')
    }
    controllerRef.current = new SafeAbortController()
    const signal = controllerRef.current.signal

  setIsLoading(true)
  setError(null)

  try {
      const result = await apiCall(signal)
      if (signal.aborted) return undefined
    setData(result as T)
    onSuccess?.(result)
    return result
  } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return undefined
    setError(err as Error)
    return undefined
  } finally {
      if (!signal.aborted) setIsLoading(false)
    }
  }

  const cancel = () => {
    if (controllerRef.current) {
      controllerRef.current.abort('Manual cancellation')
    setIsLoading(false)
    }
  }

  return { data, error, isLoading, fetchData, cancel }
}