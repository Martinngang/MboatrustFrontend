import { C, FONT, StatusBadge } from './MobileLayout'
import type { Approver } from '../verification'

/** Shows each required approver and their sign-off state for a multi-signature milestone release. */
export function ApprovalStatusList({ approvers }: { approvers: Approver[] }) {
  return (
    <div className="space-y-2">
      {approvers.map((a) => (
        <div key={a.name} className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: a.status === 'approved' ? C.forest : C.inkSubtle, fontFamily: FONT.serif }}>
              {a.name[0]}
            </div>
            <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">{a.name}</span>
          </div>
          <StatusBadge status={a.status === 'approved' ? 'approved' : 'pending'} />
        </div>
      ))}
    </div>
  )
}
