/** Etichette e stili per lo stato di conferma ufficio tecnico. */
export const REVIEW_LABELS = {
  NONE: null,
  REQUESTED: 'Inviata all’ufficio tecnico',
  IN_REVIEW: 'In carico all’ufficio tecnico',
  CERTIFIED: 'Configurazione certificata',
}

/** Classi tailwind per il chip di stato. */
export const REVIEW_CHIP = {
  REQUESTED: 'bg-warn/15 text-yellow-700',
  IN_REVIEW: 'bg-accent/10 text-accent',
  CERTIFIED: 'bg-safe/10 text-safe',
}

/** L'invio è consentito quando non c'è una richiesta già in lavorazione. */
export function canSendReview(status) {
  return status === 'NONE' || status === 'CERTIFIED'
}
