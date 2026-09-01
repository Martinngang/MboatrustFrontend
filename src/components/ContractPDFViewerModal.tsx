import { useState } from 'react'
import { C, FONT, PillButton } from './MobileLayout'
import { generateContractData, type ContractData } from '../utils/contractGenerator'
import { fmt } from '../context'

interface Props {
  contractParams: {
    funderName: string
    contractorName: string
    projectName: string
    location: string
    totalBudgetXaf: number
    milestones?: { title: string; amountXaf: number; durationDays: number }[]
  }
  onClose: () => void
}

export function ContractPDFViewerModal({ contractParams, onClose }: Props) {
  const [data] = useState<ContractData>(() => generateContractData(contractParams))
  const [language, setLanguage] = useState<'fr' | 'en'>('fr')
  const [downloading, setDownloading] = useState(false)

  const handlePrintDownload = () => {
    setDownloading(true)
    setTimeout(() => {
      setDownloading(false)
      window.print()
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200">
        {/* Top Header Bar */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <div>
              <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">
                OHADA Legal Construction Agreement
              </div>
              <div style={{ fontFamily: FONT.mono }} className="text-[10px] text-emerald-400">
                {data.contractReference}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg text-xs font-mono">
              <button
                onClick={() => setLanguage('fr')}
                className={`px-2 py-1 rounded-md ${language === 'fr' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}
              >
                FR
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-md ${language === 'en' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}
              >
                EN
              </button>
            </div>

            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-bold">
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Legal Document Sheet */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-6 text-slate-800 text-xs">
          {/* Certificate Header Banner */}
          <div className="p-6 bg-white rounded-2xl border text-center space-y-2 shadow-sm" style={{ borderColor: C.parchmentDark }}>
            <div style={{ fontFamily: FONT.mono }} className="text-[10px] text-emerald-800 uppercase font-bold tracking-widest">
              RÉPUBLIQUE DU CAMEROUN · PAIX - TRAVAIL - PATRIE
            </div>
            <div style={{ fontFamily: FONT.serif }} className="text-lg font-bold text-slate-950 uppercase">
              {language === 'fr' ? 'CONVENTION D’ENTREPRISE BTP & SÉQUESTRE FINANCIER' : 'OHADA CONSTRUCTION CONTRACT & ESCROW DEPOSIT CERTIFICATE'}
            </div>
            <div style={{ fontFamily: FONT.mono }} className="text-[10px] text-slate-500">
              Conforme à l’Acte Uniforme OHADA sur le Droit Commercial Général et le Droit des Contrats
            </div>
          </div>

          {/* Parties Involved */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-2xl border" style={{ borderColor: C.parchmentDark }}>
              <div style={{ fontFamily: FONT.mono }} className="text-[10px] uppercase text-slate-400 font-bold mb-1">
                {language === 'fr' ? '1. Le Maître d’Ouvrage (Funder)' : '1. The Principal / Funder'}
              </div>
              <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm text-slate-900">{data.funderName}</div>
              <div className="text-slate-500 mt-0.5">Résidence: {data.funderCountry}</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border" style={{ borderColor: C.parchmentDark }}>
              <div style={{ fontFamily: FONT.mono }} className="text-[10px] uppercase text-slate-400 font-bold mb-1">
                {language === 'fr' ? '2. L’Entrepreneur BTP (Contractor)' : '2. The Contractor / Builder'}
              </div>
              <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm text-slate-900">{data.contractorName}</div>
              <div className="text-slate-500 mt-0.5">Reg: {data.contractorRegistration}</div>
            </div>
          </div>

          {/* Project & Escrow Financial Terms */}
          <div className="p-4 bg-white rounded-2xl border space-y-3" style={{ borderColor: C.parchmentDark }}>
            <div className="flex justify-between items-center border-b pb-2">
              <span style={{ fontFamily: FONT.mono }} className="text-[10px] uppercase text-slate-400 font-bold">
                {language === 'fr' ? 'Objet des Travaux' : 'Project Scope'}
              </span>
              <span className="font-bold text-slate-900">{data.projectName}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span style={{ fontFamily: FONT.mono }} className="text-[10px] uppercase text-slate-400 font-bold">
                {language === 'fr' ? 'Localisation du Chantier' : 'Site Location'}
              </span>
              <span className="font-bold text-slate-900">{data.location}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span style={{ fontFamily: FONT.mono }} className="text-[10px] uppercase text-slate-400 font-bold">
                {language === 'fr' ? 'Montant Total Séquestré (Escrow)' : 'Total Escrow Budget'}
              </span>
              <span style={{ fontFamily: FONT.serif, color: C.forest }} className="text-base font-bold">
                {fmt(data.totalBudgetXaf)}
              </span>
            </div>
          </div>

          {/* Milestone Schedule Table */}
          <div className="p-4 bg-white rounded-2xl border space-y-3" style={{ borderColor: C.parchmentDark }}>
            <div style={{ fontFamily: FONT.mono }} className="text-[10px] uppercase text-slate-400 font-bold">
              {language === 'fr' ? 'Échéancier des Tranches & Jalons Conditionnels' : 'Milestone Escrow Tranche Schedule'}
            </div>
            <div className="space-y-2">
              {data.milestones.map((m, idx) => (
                <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                  <div>
                    <div className="font-semibold text-slate-900">Jalon {idx + 1}: {m.title}</div>
                    <div className="text-[10px] text-slate-500">Délai contractuel: {m.durationDays} jours</div>
                  </div>
                  <div style={{ fontFamily: FONT.mono }} className="font-bold text-emerald-800">
                    {fmt(m.amountXaf)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cryptographic Seal & OHADA Arbitration Clause */}
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex items-center justify-between">
            <div className="space-y-1">
              <div style={{ fontFamily: FONT.mono }} className="text-[10px] uppercase font-bold text-emerald-900">
                Sceau Numérique & Clause Arbitrale OHADA
              </div>
              <div className="text-[10px] text-slate-600">
                Arbitrage: {data.arbitrationJurisdiction} · Date: {data.generatedDate}
              </div>
              <div style={{ fontFamily: FONT.mono }} className="text-[9px] text-slate-400 truncate max-w-sm">
                SHA-256: {data.cryptographicHash}
              </div>
            </div>

            {/* Simulated Stamp Badge */}
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-700 flex flex-col items-center justify-center text-emerald-800">
              <span className="text-[8px] font-bold uppercase text-center leading-tight">MboaTrust<br/>VERIFIED<br/>SEAL</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-3">
          <PillButton variant="secondary" onClick={handlePrintDownload} fullWidth disabled={downloading}>
            {downloading ? 'Preparing Document…' : '🖨️ Print / Save as PDF'}
          </PillButton>
          <PillButton onClick={onClose} fullWidth>
            Close Contract
          </PillButton>
        </div>
      </div>
    </div>
  )
}
