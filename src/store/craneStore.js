import { create } from 'zustand'
import BR0089 from '../data/BR0089.json'

/**
 * Stato globale dell'applicazione.
 * Lo stato è volutamente piatto e serializzabile: viene passato così com'è al Web Worker.
 */
export const useCraneStore = create((set, get) => ({
  // --- Modello caricato ---
  model: BR0089,

  // --- Progetto aperto (null = configuratore standalone) ---
  projectId: null,

  // --- Configurazione corrente (clonata dal defaultConfiguration) ---
  config: { ...BR0089.defaultConfiguration },

  /**
   * Carica un progetto dal backend: i dati tecnici del modello arrivano dal
   * DB (craneModel.data ha la stessa struttura di BR0089.json) e il glbUrl
   * viene fuso nel model così la scena sa quale file 3D caricare.
   */
  loadProject: (project) =>
    set({
      projectId: project.id,
      model: { ...project.craneModel.data, glbUrl: project.craneModel.glbUrl },
      config: { ...(project.config ?? project.craneModel.data.defaultConfiguration) },
      safety: null,
    }),

  // --- Output dal worker ---
  safety: null,

  // --- Drag interaction (disabilita OrbitControls durante direct manipulation) ---
  isDragging: false,
  setDragging: (v) => set({ isDragging: v }),

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

  // Apertura (rotazione sull'asse verticale) di una singola gamba stabilizzatrice.
  setOutriggerAngle: (name, valueDeg) =>
    set((s) => ({
      config: {
        ...s.config,
        outriggerAngleDeg: { ...s.config.outriggerAngleDeg, [name]: valueDeg },
      },
    })),

  // Sollevamento verticale del piede di una singola gamba (0 = a terra).
  setOutriggerFootLift: (name, valueM) =>
    set((s) => ({
      config: {
        ...s.config,
        outriggerFootLiftM: { ...s.config.outriggerFootLiftM, [name]: valueM },
      },
    })),

  setSafety: (safety) => set({ safety }),

  reset: () => set({ config: { ...get().model.defaultConfiguration }, safety: null }),

  // Ripristina solo angolo/lunghezza sfilo/angolo jib/rotazione torretta ai
  // valori di default, senza toccare gli altri campi di config (carico,
  // stabilizzatori).
  resetBoomConfig: () =>
    set((s) => {
      const { mainBoomAngleDeg, boomStrokeM, rotationDeg, jibAngleDeg, pressureBoreBar, pressureRodBar } = get().model.defaultConfiguration
      return { config: { ...s.config, mainBoomAngleDeg, boomStrokeM, rotationDeg, jibAngleDeg, pressureBoreBar, pressureRodBar } }
    }),
}))
