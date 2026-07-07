const RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CAD: 1.36,
  AUD: 1.53,
  MXN: 17.2,
  THB: 35.8,
  SGD: 1.34,
  AED: 3.67,
  CHF: 0.90,
  INR: 83.5,
  BRL: 4.97,
  KRW: 1325,
  NZD: 1.63,
  HKD: 7.82,
  NOK: 10.6,
  SEK: 10.4,
  DKK: 6.9,
  ZAR: 18.7,
  TRY: 32.1,
  IDR: 15800,
  VND: 24500,
  PHP: 56.5,
  TWD: 31.8,
  CZK: 23.2,
  HUF: 360,
  PLN: 4.0,
  ILS: 3.7,
  SAR: 3.75,
};

export const SUPPORTED_CURRENCIES: string[] = Object.keys(RATES);

export function convert(amount: number, fromCurrency: string, toCurrency: string): number {
  const fromRate = RATES[fromCurrency] ?? 1;
  const toRate = RATES[toCurrency] ?? 1;
  return (amount / fromRate) * toRate;
}

export function formatCurrencyConverted(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
