import { create } from 'zustand'
import BR0089 from '../data/BR0089.json'

/**
 * Stato globale dell'applicazione.
 * Lo stato è volutamente piatto e serializzabile: viene passato così com'è al Web Worker.
 */
export const useCraneStore = create((set, get) => ({
  // --- Modello caricato ---
  model: BR0089,

  // --- Configurazione corrente (clonata dal defaultConfiguration) ---
  config: { ...BR0089.defaultConfiguration },

  // --- Output dal worker ---
  safety: null,

  // --- Drag interaction (disabilita OrbitControls durante direct manipulation) ---
  isDragging: false,
  setDragging: (v) => set({ isDragging: v }),

  // --- Controllo manuale per singolo pezzo del modello CAD del braccio ---
  // Chiave = nome reale del componente nel file STEP (es. "BR0089").
  // Valore = { position: [x,y,z] in unità native del modello, rotation: [x,y,z] in gradi },
  // entrambi relativi alla posizione/orientamento assemblato originale.
  // La rotazione avviene attorno al baricentro del pezzo stesso.
  partTransforms: {},
  setPartAxis: (name, kind, axis, value) =>
    set((s) => {
      const current = s.partTransforms[name] ?? { position: [0, 0, 0], rotation: [0, 0, 0] }
      const arr = [...current[kind]]
      arr[axis] = value
      return { partTransforms: { ...s.partTransforms, [name]: { ...current, [kind]: arr } } }
    }),
  resetPart: (name) =>
    set((s) => {
      const rest = { ...s.partTransforms }
      delete rest[name]
      return { partTransforms: rest }
    }),
  resetPartTransforms: () => set({ partTransforms: {} }),

  // --- Setter ---
  setConfig: (patch) =>
    set((s) => ({ config: { ...s.config, ...patch } })),

  setOutrigger: (name, valueM) =>
    set((s) => ({
      config: {
        ...s.config,
        outriggerExtensionM: { ...s.config.outriggerExtensionM, [name]: valueM },
      },
    })),

  setSafety: (safety) => set({ safety }),

  reset: () => set({ config: { ...get().model.defaultConfiguration }, safety: null }),

  // Ripristina solo angolo/lunghezza sfilo/rotazione torretta ai valori di default,
  // senza toccare gli altri campi di config (carico, jib, stabilizzatori).
  resetBoomConfig: () =>
    set((s) => {
      const { mainBoomAngleDeg, mainBoomLengthM, rotationDeg } = get().model.defaultConfiguration
      return { config: { ...s.config, mainBoomAngleDeg, mainBoomLengthM, rotationDeg } }
    }),
}))
