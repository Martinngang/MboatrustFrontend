import { useState } from 'react'
import { C, FONT, PillButton, StatusBadge, fmt } from './MobileLayout'
import { Modal } from './Modal'
import { useToast } from './Toast'
import { apiErrorMessage } from '../api/client'
import { useProceedAtRiskMutation, type MilestoneFunding } from '../api/projects'

/** Contractor-facing gate for an under-funded milestone.
 *
 *  - Not workable: shows the locked state and the "Proceed Without Full
 *    Escrow" option. Choosing it needs an explicit acknowledgement of the risk
 *    (checkbox) — it is only an override of the gate, it never funds the
 *    milestone, releases money or guarantees payment.
 *  - Already proceeding at risk (and still not fully funded): a persistent
 *    "not fully protected" banner.
 *  - Funded (or released): renders nothing — when the funder tops up, the
 *    banner disappears live and the milestone shows as protected. */
export function ProceedAtRiskPanel({ projectId, milestone }: { projectId: string; milestone: MilestoneFunding | undefined }) {
  const [open, setOpen] = useState(false)
  const [understood, setUnderstood] = useState(false)
  const proceed = useProceedAtRiskMutation()
  const { show: showToast } = useToast()

  if (!milestone || milestone.fundingStatus === 'funded' || milestone.fundingStatus === 'released') return null

  if (milestone.proceedAtRisk) {
    return (
      <div className="rounded-2xl border-2 p-4" style={{ borderColor: 'var(--status-error-text)', background: 'var(--status-error-bg)' }}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div style={{ fontFamily: FONT.mono, color: 'var(--status-error-text)' }} className="text-[10px] uppercase tracking-widest">Not fully protected by escrow</div>
          <StatusBadge status="at_risk" />
        </div>
        <p style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }} className="text-xs leading-relaxed">
          You chose to work on this milestone at your own risk. {fmt(milestone.unfundedAmount)} of its {fmt(milestone.amount)} is not currently secured in escrow, and payment is not guaranteed until the funder funds it.
          When they top up, this milestone becomes fully protected automatically.
        </p>
      </div>
    )
  }

  const confirm = () => {
    proceed.mutate(
      { projectId, milestoneId: milestone.id },
      {
        onSuccess: () => {
          setOpen(false)
          setUnderstood(false)
          showToast({ title: 'You are proceeding without full escrow', description: 'The funder has been notified. Payment is not guaranteed until the milestone is funded.', tone: 'info' })
        },
        onError: (err) => showToast({ title: 'Could not proceed', description: apiErrorMessage(err, 'Please try again'), tone: 'error' }),
      }
    )
  }

  return (
    <>
      <div className="rounded-2xl border-2 p-4" style={{ borderColor: C.amber, background: 'var(--status-warning-bg)' }}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div style={{ fontFamily: FONT.mono, color: 'var(--status-warning-text)' }} className="text-[10px] uppercase tracking-widest">Waiting for escrow funding</div>
          <StatusBadge status={milestone.fundingStatus === 'partially_funded' ? 'partially_funded' : 'unfunded'} />
        </div>
        <p style={{ fontFamily: FONT.sans, color: 'var(--status-warning-text)' }} className="text-sm font-semibold mb-1">
          {fmt(milestone.fundedAmount)} of {fmt(milestone.amount)} is in escrow for this milestone.
        </p>
        <p style={{ fontFamily: FONT.sans, color: 'var(--status-warning-text)' }} className="text-xs leading-relaxed mb-3">
          Work normally starts once the funder has funded this milestone — you'll be notified the moment they do. You can also choose to start now, at your own financial risk.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="w-full py-3 rounded-xl border-2 text-sm font-semibold"
          style={{ borderColor: 'var(--status-warning-text)', color: 'var(--status-warning-text)', fontFamily: FONT.sans }}
        >
          Proceed Without Full Escrow
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setUnderstood(false) }}
        title="Proceed without full escrow?"
        footer={(
          <div className="flex gap-2 w-full">
            <button onClick={() => { setOpen(false); setUnderstood(false) }} className="flex-1 py-3 rounded-xl border text-sm font-semibold" style={{ borderColor: C.parchmentDark, color: C.inkMuted, fontFamily: FONT.sans }}>
              Cancel
            </button>
            <div className="flex-1">
              <PillButton onClick={confirm} fullWidth disabled={!understood || proceed.isPending}>
                {proceed.isPending ? 'Recording…' : 'Proceed at my risk'}
              </PillButton>
            </div>
          </div>
        )}
      >
        <div className="space-y-3">
          <div className="rounded-xl p-3" style={{ background: 'var(--status-error-bg)' }}>
            <p style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }} className="text-xs leading-relaxed font-semibold">
              This milestone is not fully protected by escrow.
            </p>
            <p style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }} className="text-xs leading-relaxed mt-1">
              Only {fmt(milestone.fundedAmount)} of {fmt(milestone.amount)} is secured. The remaining {fmt(milestone.unfundedAmount)} is not currently held anywhere — if you do the work and the funder never funds it, you may not be paid.
            </p>
          </div>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">
            Proceeding does not fund the milestone, release any money, or guarantee payment. Your acknowledgement (who, when, and these amounts) is recorded and the funder is notified. If the funder tops up escrow later, the milestone is automatically shown as fully funded.
          </p>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5" />
            <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">I understand the risk and want to proceed</span>
          </label>
        </div>
      </Modal>
    </>
  )
}
