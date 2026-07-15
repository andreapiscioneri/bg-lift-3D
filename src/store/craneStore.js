import { create } from 'zustand'
import BR0089 from '../data/BR0089.json'

/** Estrae lo stato di conferma ufficio tecnico da un progetto del backend. */
function reviewFromProject(project) {
  return {
    status: project.reviewStatus ?? 'NONE',
    certificateUrl: project.certificateUrl ?? null,
    technicianName: project.reviewTechnician?.name ?? null,
    requestedAt: project.reviewRequestedAt ?? null,
  }
}

/**
 * Stato globale dell'applicazione.
 * Lo stato è volutamente piatto e serializzabile: viene passato così com'è al Web Worker.
 */
export const useCraneStore = create((set, get) => ({
  // --- Modello caricato ---
  model: BR0089,

  // --- Progetto aperto (null = configuratore standalone) ---
  projectId: null,
  // Metadati progetto per il flusso di conferma ufficio tecnico.
  projectOwnerId: null,
  review: null, // { status, certificateUrl, technicianName, requestedAt }

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
      projectOwnerId: project.userId ?? project.user?.id ?? null,
      review: reviewFromProject(project),
      model: { ...project.craneModel.data, glbUrl: project.craneModel.glbUrl },
      config: { ...(project.config ?? project.craneModel.data.defaultConfiguration) },
      safety: null,
    }),

  // Aggiorna lo stato conferma dopo una risposta del backend.
  setReview: (project) => set({ review: reviewFromProject(project) }),

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

  // Piega del ginocchio (stinco+piede) di una singola gamba (0 = posa CAD).
  setOutriggerKnee: (name, valueDeg) =>
    set((s) => ({
      config: {
        ...s.config,
        outriggerKneeDeg: { ...s.config.outriggerKneeDeg, [name]: valueDeg },
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
