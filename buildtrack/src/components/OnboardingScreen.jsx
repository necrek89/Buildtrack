import { useState, useRef } from 'react'
import { Buildings, HardHat, Hammer, UserCircle, ArrowRight, ArrowLeft, Bell, CheckCircle } from '@phosphor-icons/react'
import { useT } from '../i18n/useLanguage'
import { useStore } from '../store/useStore'
import { subscribeToPush, isPushSupported } from '../lib/push'

const SLIDE_META = [
  { Icon: Buildings,  color: 'var(--accent)', bg: 'linear-gradient(160deg, #FFF5EF 0%, #FAE8D8 100%)', circleBg: 'var(--accent-light)', key: 'slide1' },
  { Icon: HardHat,    color: '#2E6B4A', bg: 'linear-gradient(160deg, #F0F9F4 0%, #D8EFDF 100%)', circleBg: '#E0F2E8', key: 'slide2' },
  { Icon: Hammer,     color: '#3A5FAB', bg: 'linear-gradient(160deg, #EEF3FD 0%, #D8E4FA 100%)', circleBg: '#E0E9FA', key: 'slide3' },
  { Icon: UserCircle, color: '#7A3FAA', bg: 'linear-gradient(160deg, #F6EFFE 0%, #E8D8FA 100%)', circleBg: '#EEE0FA', key: 'slide4' },
  { Icon: Bell,       color: 'var(--accent)', bg: 'linear-gradient(160deg, #FFF5EF 0%, #FAE8D8 100%)', circleBg: 'var(--accent-light)', key: 'slide5' },
]

function PushSlide({ t, onDone }) {
  const { profile } = useStore()
  const [state, setState] = useState('idle') // idle | loading | on | denied | unsupported

  const enable = async () => {
    if (!(await isPushSupported())) { setState('unsupported'); return }
    setState('loading')
    const { error } = await subscribeToPush(profile?.id)
    if (error === 'Permission denied') setState('denied')
    else if (error) setState('idle')
    else setState('on')
  }

  const color = 'var(--accent)'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
      <div style={{ width: 130, height: 130, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32, boxShadow: `0 8px 32px ${color}22` }}>
        {state === 'on'
          ? <CheckCircle size={60} weight="bold" color="var(--success)" />
          : <Bell size={60} weight="bold" color={color} />
        }
      </div>

      <div style={{ fontSize: 28, fontWeight: 800, color, marginBottom: 14, letterSpacing: '-0.5px' }}>
        {t('onboarding.slide5Title')}
      </div>
      <div style={{ fontSize: 16, color: '#7A6E66', lineHeight: 1.65, maxWidth: 300, whiteSpace: 'pre-line', marginBottom: 32 }}>
        {t('onboarding.slide5Sub')}
      </div>

      {state === 'on' && (
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--success)', marginBottom: 16 }}>
          {t('onboarding.slide5On')}
        </div>
      )}
      {state === 'denied' || state === 'unsupported' ? (
        <div style={{ fontSize: 13, color: 'var(--danger)', background: 'var(--danger-bg)', padding: '10px 16px', borderRadius: 10, marginBottom: 16 }}>
          {t('onboarding.slide5Denied')}
        </div>
      ) : state !== 'on' && (
        <button
          onClick={enable}
          disabled={state === 'loading'}
          style={{ width: '100%', maxWidth: 340, padding: '15px 24px', borderRadius: 16, background: color, color: '#fff', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 20px ${color}44`, marginBottom: 16 }}
        >
          {state === 'loading' ? '...' : t('onboarding.slide5Enable')}
        </button>
      )}

      <button onClick={onDone} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, padding: '4px 8px' }}>
        {state === 'on' ? t('onboarding.start') : t('onboarding.slide5Skip')}
      </button>
    </div>
  )
}

export default function OnboardingScreen({ onDone }) {
  const { t } = useT()
  const [idx, setIdx]   = useState(0)
  const [dir, setDir]   = useState(1)
  const [anim, setAnim] = useState(false)
  const touchStartX     = useRef(null)
  const touchStartY     = useRef(null)

  const INFO_SLIDES = SLIDE_META.slice(0, 4)
  const isLast      = idx === INFO_SLIDES.length - 1
  const isPushSlide = idx === SLIDE_META.length - 1

  const goTo = (nextIdx, direction) => {
    if (nextIdx < 0 || nextIdx >= SLIDE_META.length || anim) return
    setDir(direction)
    setAnim(true)
    setTimeout(() => { setIdx(nextIdx); setAnim(false) }, 280)
  }

  const next   = () => goTo(idx + 1, 1)
  const prev   = () => goTo(idx - 1, -1)
  const finish = () => { localStorage.setItem('tutuu_onboarded', '1'); onDone() }

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e) => {
    if (touchStartX.current === null || isPushSlide) return
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY)
    if (Math.abs(dx) > 50 && dy < 60) dx > 0 ? next() : prev()
    touchStartX.current = null
  }

  const slide = SLIDE_META[idx]

  return (
    <div
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: slide.bg, transition: 'background 0.4s ease', userSelect: 'none', fontFamily: 'inherit' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Skip — only on info slides */}
      {!isPushSlide && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px 24px 0' }}>
          <button onClick={finish} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, padding: '4px 8px' }}>
            {t('onboarding.skip')}
          </button>
        </div>
      )}
      {isPushSlide && <div style={{ height: 44 }} />}

      {/* Info slides */}
      {!isPushSlide && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '0 32px', textAlign: 'center',
          opacity: anim ? 0 : 1,
          transform: anim ? `translateX(${dir * 40}px)` : 'translateX(0)',
          transition: 'opacity 0.28s ease, transform 0.28s ease',
        }}>
          <div style={{ width: 130, height: 130, borderRadius: '50%', background: slide.circleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32, boxShadow: `0 8px 32px ${slide.color}22` }}>
            <slide.Icon size={60} weight="bold" color={slide.color} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: slide.color, marginBottom: 14, letterSpacing: '-0.5px' }}>
            {t(`onboarding.${slide.key}Title`)}
          </div>
          <div style={{ fontSize: 16, color: '#7A6E66', lineHeight: 1.65, maxWidth: 300, whiteSpace: 'pre-line' }}>
            {t(`onboarding.${slide.key}Sub`)}
          </div>
        </div>
      )}

      {/* Push slide */}
      {isPushSlide && <PushSlide t={t} onDone={finish} />}

      {/* Bottom nav — only on info slides */}
      {!isPushSlide && (
        <div style={{ padding: '24px 24px 52px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {SLIDE_META.map((_, i) => (
              <div key={i} onClick={() => !isPushSlide && goTo(i, i > idx ? 1 : -1)} style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 4, background: i === idx ? slide.color : '#D9D0C7', transition: 'all 0.3s ease', cursor: 'pointer' }} />
            ))}
          </div>

          <button
            onClick={isLast ? next : next}
            style={{ width: '100%', maxWidth: 340, padding: '15px 24px', borderRadius: 16, background: slide.color, color: '#fff', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.2px', boxShadow: `0 4px 20px ${slide.color}44` }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {t('onboarding.next')} <ArrowRight size={14} weight="bold" />
          </button>

          {idx > 0 && (
            <button onClick={prev} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}>
              <ArrowLeft size={13} weight="bold" /> {t('onboarding.back')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
