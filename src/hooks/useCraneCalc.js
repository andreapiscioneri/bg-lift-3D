import { useEffect, useRef } from 'react'
import * as Comlink from 'comlink'
import { useCraneStore } from '../store/craneStore'

/**
 * Hook che mantiene il Web Worker dei calcoli sincronizzato con lo store.
 * Ogni volta che la configurazione cambia, lancia un calcolo asincrono e
 * scrive il risultato in `state.safety`.
 */
export function useCraneCalc() {
  const workerRef = useRef(null)
  const apiRef = useRef(null)

  const config = useCraneStore((s) => s.config)
  const model = useCraneStore((s) => s.model)
  const setSafety = useCraneStore((s) => s.setSafety)

  // 1) Boot del worker — una sola volta
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/craneCalc.worker.js', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    apiRef.current = Comlink.wrap(worker)

    return () => {
      worker.terminate()
      workerRef.current = null
      apiRef.current = null
    }
  }, [])

  // 2) Ricalcolo reattivo
  useEffect(() => {
    if (!apiRef.current) return
    let cancelled = false
    apiRef.current.computeSafety(config, model).then((safety) => {
      if (!cancelled) setSafety(safety)
    })
    return () => {
      cancelled = true
    }
  }, [config, model, setSafety])
}
