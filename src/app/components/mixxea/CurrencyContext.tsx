import React, { createContext, useContext, useState } from 'react';

// ─── Currency definitions ──────────────────────────────────────────────────────
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  rate: number; // multiplier from USD
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$',    name: 'US Dollar',          flag: '🇺🇸', rate: 1       },
  { code: 'EUR', symbol: '€',    name: 'Euro',               flag: '🇪🇺', rate: 0.92   },
  { code: 'GBP', symbol: '£',    name: 'British Pound',      flag: '🇬🇧', rate: 0.79   },
  { code: 'NGN', symbol: '₦',    name: 'Nigerian Naira',     flag: '🇳🇬', rate: 1580   },
  { code: 'CAD', symbol: 'CA$',  name: 'Canadian Dollar',    flag: '🇨🇦', rate: 1.36   },
  { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar',  flag: '🇦🇺', rate: 1.54   },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi',      flag: '🇬🇭', rate: 15.7   },
  { code: 'ZAR', symbol: 'R',    name: 'South African Rand', flag: '🇿🇦', rate: 18.6   },
  { code: 'KES', symbol: 'KSh',  name: 'Kenyan Shilling',    flag: '🇰🇪', rate: 130    },
  { code: 'JPY', symbol: '¥',    name: 'Japanese Yen',       flag: '🇯🇵', rate: 149    },
  { code: 'INR', symbol: '₹',    name: 'Indian Rupee',       flag: '🇮🇳', rate: 83.5   },
  { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real',     flag: '🇧🇷', rate: 4.97   },
];

// ─── Locale → currency auto-detection ─────────────────────────────────────────
const REGION_MAP: Record<string, string> = {
  US: 'USD', CA: 'CAD', AU: 'AUD', GB: 'GBP',
  NG: 'NGN', GH: 'GHS', ZA: 'ZAR', KE: 'KES',
  JP: 'JPY', IN: 'INR', BR: 'BRL',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR',
  PT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR',
  IE: 'EUR', FI: 'EUR', GR: 'EUR', PL: 'EUR',
  SE: 'EUR', DK: 'EUR', NO: 'EUR', CH: 'EUR',
};

function detectCurrencyCode(): string {
  try {
    const lang = navigator.language || 'en-US';
    const parts = lang.split('-');
    const region = parts[parts.length - 1].toUpperCase();
    return REGION_MAP[region] || 'USD';
  } catch {
    return 'USD';
  }
}

function loadStored(): string {
  try {
    const s = localStorage.getItem('mixxea_currency');
    if (s && CURRENCIES.find(c => c.code === s)) return s;
  } catch {}
  return detectCurrencyCode();
}

// ─── Context ───────────────────────────────────────────────────────────────────
interface CurrencyContextValue {
  currency: Currency;
  currencies: Currency[];
  setCurrencyCode: (code: string) => void;
  /** Format a USD amount as a whole number in the selected currency */
  fp: (usdAmount: number) => string;
  /** fp() + "/mo" suffix */
  fpm: (usdAmount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: CURRENCIES[0],
  currencies: CURRENCIES,
  setCurrencyCode: () => {},
  fp: (n) => `$${n}`,
  fpm: (n) => `$${n}/mo`,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState<string>(loadStored);

  const currency = CURRENCIES.find(c => c.code === code) || CURRENCIES[0];

  const setCurrencyCode = (newCode: string) => {
    setCode(newCode);
    try { localStorage.setItem('mixxea_currency', newCode); } catch {}
  };

  /** Convert from USD and format using the browser Intl API */
  function fp(usdAmount: number): string {
    const converted = Math.round(usdAmount * currency.rate);
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency.code,
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }).format(converted);
    } catch {
      return `${currency.symbol}${converted.toLocaleString()}`;
    }
  }

  function fpm(usdAmount: number): string {
    return `${fp(usdAmount)}/mo`;
  }

  return (
    <CurrencyContext.Provider value={{ currency, currencies: CURRENCIES, setCurrencyCode, fp, fpm }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
