/** Chiavi i18n per lo stato di conferma ufficio tecnico (null = nessuna etichetta). */
export const REVIEW_LABEL_KEYS = {
  NONE: null,
  REQUESTED: 'review.requested',
  IN_REVIEW: 'review.inReview',
  CERTIFIED: 'review.certified',
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
