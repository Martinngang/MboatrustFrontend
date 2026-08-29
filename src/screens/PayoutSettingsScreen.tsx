/**
 * PayoutSettingsScreen.tsx — User Payout Method Management Screen
 * Allows recipients, contractors, and land sellers to manage MoMo/OM withdrawal destinations.
 */
import { useState } from 'react'
import { AppShell, Header, PillButton } from '../components/MobileLayout'
import { C, FONT } from '../components/tokens'
import { useApp } from '../context'
import { useSessionQuery } from '../api/session'
import {
  useAddPayoutMethodMutation,
  useRemovePayoutMethodMutation,
  useSetDefaultPayoutMethodMutation,
  type PayoutMethod,
} from '../api/payoutMethods'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'
import { Plus, Trash2, CheckCircle, ShieldCheck, Smartphone } from 'lucide-react'

export function PayoutSettingsScreen() {
  const { devUserId } = useApp()
  const { data: user } = useSessionQuery(devUserId ?? undefined)
  const { show: showToast } = useToast()

  const [showAddModal, setShowAddModal] = useState(false)
  const [provider, setProvider] = useState<'mtn_momo' | 'orange_money'>('mtn_momo')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [label, setLabel] = useState('')

  const addMutation = useAddPayoutMethodMutation()
  const removeMutation = useRemovePayoutMethodMutation()
  const defaultMutation = useSetDefaultPayoutMethodMutation()

  const payoutMethods: PayoutMethod[] = user?.payoutMethods || []

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber.trim()) return

    try {
      await addMutation.mutateAsync({
        label: label.trim() || (provider === 'mtn_momo' ? 'MTN MoMo Account' : 'Orange Money Account'),
        provider,
        phoneNumber: phoneNumber.trim(),
      })
      showToast({ title: 'Payout method saved', tone: 'success' })
      setShowAddModal(false)
      setPhoneNumber('')
      setLabel('')
    } catch (err) {
      showToast({ title: 'Failed to add payout method', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await defaultMutation.mutateAsync(id)
      showToast({ title: 'Default payout method updated', tone: 'success' })
    } catch (err) {
      showToast({ title: 'Update failed', description: apiErrorMessage(err), tone: 'error' })
    }
  }

  const handleRemove = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this payout method?')) return
    try {
      await removeMutation.mutateAsync(id)
      showToast({ title: 'Payout method removed', tone: 'info' })
    } catch (err) {
      showToast({ title: 'Removal failed', description: apiErrorMessage(err), tone: 'error' })
    }
  }

  return (
    <AppShell>
      <Header title="Payout Settings" subtitle="Manage your withdrawal accounts" back />

      <div className="px-5 py-5 space-y-6 max-w-xl mx-auto">
        {/* Banner */}
        <div className="rounded-2xl border p-4 flex items-start gap-3" style={{ background: C.parchment, borderColor: C.parchmentDark }}>
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.forest }} />
          <div>
            <h3 style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold mb-0.5">
              Secure Payout Routing
            </h3>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">
              When milestones are approved, payouts are sent directly to your default account listed below.
            </p>
          </div>
        </div>

        {/* Payout method list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">
              Saved Payout Accounts ({payoutMethods.length}/5)
            </h2>
            {payoutMethods.length < 5 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-80"
                style={{ color: C.forest }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Account
              </button>
            )}
          </div>

          {payoutMethods.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center space-y-3" style={{ background: C.white, borderColor: C.parchmentDark }}>
              <Smartphone className="w-10 h-10 mx-auto" style={{ color: C.inkSubtle }} />
              <p style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">
                No payout account saved
              </p>
              <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs max-w-xs mx-auto">
                Add an MTN Mobile Money or Orange Money account to receive milestone releases directly.
              </p>
              <PillButton onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-1 inline" /> Add Payout Account
              </PillButton>
            </div>
          ) : (
            <div className="space-y-3">
              {payoutMethods.map((pm) => (
                <div
                  key={pm._id}
                  className="rounded-2xl border p-4 flex items-center justify-between transition-all"
                  style={{
                    background: C.white,
                    borderColor: pm.isDefault ? C.forest : C.parchmentDark,
                    boxShadow: pm.isDefault ? `0 2px 8px ${C.forest}20` : 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 text-white"
                      style={{ background: pm.provider === 'mtn_momo' ? '#FFCC00' : '#FF6600', color: pm.provider === 'mtn_momo' ? '#000' : '#fff' }}
                    >
                      {pm.provider === 'mtn_momo' ? 'MoMo' : 'OM'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">
                          {pm.label || (pm.provider === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money')}
                        </span>
                        {pm.isDefault && (
                          <span style={{ fontFamily: FONT.mono, background: 'var(--status-success-bg)', color: 'var(--status-success-text)' }} className="text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Default
                          </span>
                        )}
                      </div>
                      <p style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-xs mt-0.5">
                        {pm.phoneNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!pm.isDefault && (
                      <button
                        onClick={() => handleSetDefault(pm._id)}
                        className="text-xs px-2.5 py-1 rounded-xl font-medium border transition-colors"
                        style={{ borderColor: C.parchmentDark, color: C.inkMuted, background: C.parchment }}
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(pm._id)}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl p-6 shadow-xl space-y-4" style={{ background: C.white }}>
              <h3 style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">
                Add Payout Account
              </h3>

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider block mb-1.5">
                    Provider
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProvider('mtn_momo')}
                      className="p-3 rounded-xl border-2 text-center text-xs font-bold transition-all"
                      style={{
                        borderColor: provider === 'mtn_momo' ? '#FFCC00' : C.parchmentDark,
                        background: provider === 'mtn_momo' ? '#FFCC0020' : C.parchment,
                        color: C.ink,
                      }}
                    >
                      MTN MoMo
                    </button>
                    <button
                      type="button"
                      onClick={() => setProvider('orange_money')}
                      className="p-3 rounded-xl border-2 text-center text-xs font-bold transition-all"
                      style={{
                        borderColor: provider === 'orange_money' ? '#FF6600' : C.parchmentDark,
                        background: provider === 'orange_money' ? '#FF660020' : C.parchment,
                        color: C.ink,
                      }}
                    >
                      Orange Money
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider block mb-1">
                    Phone Number (MSISDN)
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder="+237 677 234 891"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm font-mono outline-none"
                    style={{ background: C.parchment, borderColor: C.parchmentDark, color: C.ink }}
                  />
                </div>

                <div>
                  <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider block mb-1">
                    Label (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. My Business MoMo"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ background: C.parchment, borderColor: C.parchmentDark, color: C.ink }}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <PillButton variant="secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </PillButton>
                  <PillButton fullWidth disabled={addMutation.isPending}>
                    {addMutation.isPending ? 'Saving...' : 'Save Account'}
                  </PillButton>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
