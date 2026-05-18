import { create } from 'zustand'
import translations from './translations'

const SUPPORTED = ['en', 'ru', 'sr', 'es', 'pt', 'de', 'fr']
const LS_KEY    = 'tutuu_lang'

function detect() {
  const saved = localStorage.getItem(LS_KEY)
  if (saved && SUPPORTED.includes(saved)) return saved
  const browser = (navigator.language || 'en').slice(0, 2).toLowerCase()
  return SUPPORTED.includes(browser) ? browser : 'en'
}

export const LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'ru', label: 'Русский',    flag: '🇷🇺' },
  { code: 'sr', label: 'Srpski',     flag: '🇷🇸' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
]

export const useLang = create((set, get) => ({
  lang: detect(),

  setLang: (code) => {
    if (!SUPPORTED.includes(code)) return
    localStorage.setItem(LS_KEY, code)
    set({ lang: code })
  },

  // t('nav.projects') or t('nav.projects', { n: 5 })
  t: (key, vars = {}) => {
    const { lang } = get()
    const dict = translations[lang] || translations.en
    const fallback = translations.en

    // traverse nested keys
    const val = key.split('.').reduce((o, k) => o?.[k], dict)
            ?? key.split('.').reduce((o, k) => o?.[k], fallback)
            ?? key

    if (typeof val !== 'string') return key
    // interpolate {var}
    return Object.entries(vars).reduce(
      (s, [k, v]) => s.replaceAll(`{${k}}`, v),
      val
    )
  },
}))

// convenience hook — returns t() and lang
export function useT() {
  return useLang(s => ({ t: s.t, lang: s.lang, setLang: s.setLang }))
}
