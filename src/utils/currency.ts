export type CurrencyCode = 'XAF' | 'EUR' | 'USD' | 'CAD' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateToXaf: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA (BEAC)', rateToXaf: 1 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro (Fixed BEAC Parity)', rateToXaf: 655.957 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rateToXaf: 605.5 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', rateToXaf: 445.2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rateToXaf: 770.4 },
};

export function convertXafTo(amountXaf: number, target: CurrencyCode): number {
  if (target === 'XAF' || !amountXaf) return amountXaf;
  const cfg = CURRENCIES[target];
  return amountXaf / cfg.rateToXaf;
}

export function convertToXaf(amountForeign: number, source: CurrencyCode): number {
  if (source === 'XAF' || !amountForeign) return amountForeign;
  const cfg = CURRENCIES[source];
  return Math.round(amountForeign * cfg.rateToXaf);
}

export function fmtForeign(amountForeign: number, code: CurrencyCode): string {
  const cfg = CURRENCIES[code];
  if (code === 'XAF') {
    return `${Math.round(amountForeign).toLocaleString('fr-FR')} XAF`;
  }
  return `${cfg.symbol}${amountForeign.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDualPrice(amountXaf: number, targetCurrency: CurrencyCode = 'EUR'): string {
  const xafStr = `${Math.round(amountXaf).toLocaleString('fr-FR')} XAF`;
  if (targetCurrency === 'XAF') return xafStr;

  const foreign = convertXafTo(amountXaf, targetCurrency);
  const foreignStr = fmtForeign(foreign, targetCurrency);
  return `${xafStr} (≈ ${foreignStr})`;
}
