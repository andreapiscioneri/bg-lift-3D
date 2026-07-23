import { useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useCraneStore } from '../../store/craneStore'
import { useTranslation } from '../../i18n/I18nContext'
import { REVIEW_LABEL_KEYS, REVIEW_CHIP, canSendReview } from '../../utils/review'

/**
 * Riquadro sotto lo StatusBadge: invio della configurazione all'ufficio
 * tecnico e stato della richiesta. Visibile solo dentro un progetto.
 * Il pulsante salva prima la config corrente, così il tecnico vede
 * esattamente ciò che c'è a schermo.
 */
export default function ReviewBox({ compact = false }) {
  const { user } = useAuth()
  const t = useTranslation()
  const projectId      = useCraneStore((s) => s.projectId)
  const projectOwnerId = useCraneStore((s) => s.projectOwnerId)
  const review         = useCraneStore((s) => s.review)
  const setReview      = useCraneStore((s) => s.setReview)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!projectId || !review) return null
  const isOwner = user && (user.id === projectOwnerId || user.role === 'ADMIN')

  async function onSend() {
    setBusy(true)
    setError(null)
    try {
      const config = useCraneStore.getState().config
      await api.patch(`/api/projects/${projectId}`, { config })
      const r = await api.post(`/api/reviews/${projectId}/request`)
      setReview(r.project)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const labelKey = REVIEW_LABEL_KEYS[review.status]

  return (
    <div className="flex flex-col gap-1.5">
      {labelKey && (
        <div className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${REVIEW_CHIP[review.status]}`}>
          <span className="truncate">
            {t(labelKey)}
            {review.status === 'IN_REVIEW' && review.technicianName && ` — ${review.technicianName}`}
          </span>
          {review.status === 'CERTIFIED' && review.certificateUrl && (
            <a
              href={review.certificateUrl}
              target="_blank"
              rel="noreferrer"
              className="underline flex-shrink-0"
            >
              {t('review.certificatePdf')}
            </a>
          )}
        </div>
      )}

      {isOwner && canSendReview(review.status) && (
        <button
          onClick={onSend}
          disabled={busy}
          className={`w-full rounded-lg border border-accent text-accent hover:bg-accent hover:text-white transition font-semibold ${compact ? 'text-[11px] py-1' : 'text-xs py-1.5'} disabled:opacity-50`}
        >
          {busy
            ? t('review.sending')
            : review.status === 'CERTIFIED'
              ? t('review.resend')
              : t('review.send')}
        </button>
      )}

      {error && <p className="text-[10px] text-danger">{error}</p>}
    </div>
  )
}
