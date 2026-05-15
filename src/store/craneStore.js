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
}))
