import { useState, useRef } from 'react'

const SLIDES = [
  {
    emoji: '🏗',
    color: '#C96B3A',
    bg: 'linear-gradient(160deg, #FFF5EF 0%, #FAE8D8 100%)',
    circleBg: '#FAECE4',
    title: 'Tutuu',
    subtitle: 'Всё для управления стройкой\nв одном приложении',
  },
  {
    emoji: '👷',
    color: '#2E6B4A',
    bg: 'linear-gradient(160deg, #F0F9F4 0%, #D8EFDF 100%)',
    circleBg: '#E0F2E8',
    title: 'Прораб',
    subtitle: 'Создавай объекты, назначай задачи\nбригаде и следи за прогрессом',
  },
  {
    emoji: '🔨',
    color: '#3A5FAB',
    bg: 'linear-gradient(160deg, #EEF3FD 0%, #D8E4FA 100%)',
    circleBg: '#E0E9FA',
    title: 'Рабочий',
    subtitle: 'Получай задания, отчитывайся\nо выполнении и прикрепляй фото',
  },
  {
    emoji: '👤',
    color: '#7A3FAA',
    bg: 'linear-gradient(160deg, #F6EFFE 0%, #E8D8FA 100%)',
    circleBg: '#EEE0FA',
    title: 'Заказчик',
    subtitle: 'Следи за своим объектом —\nпрогресс, фото и этапы работ',
  },
]

export default function OnboardingScreen({ onDone }) {
  const [idx, setIdx]     = useState(0)
  const [dir, setDir]     = useState(1)   // 1=forward, -1=backward
  const [anim, setAnim]   = useState(false)
  const touchStartX       = useRef(null)
  const touchStartY       = useRef(null)

  const goTo = (nextIdx, direction) => {
    if (nextIdx < 0 || nextIdx >= SLIDES.length || anim) return
    setDir(direction)
    setAnim(true)
    setTimeout(() => {
      setIdx(nextIdx)
      setAnim(false)
    }, 280)
  }

  const next = () => {
    if (idx < SLIDES.length - 1) goTo(idx + 1, 1)
    else finish()
  }
  const prev = () => goTo(idx - 1, -1)

  const finish = () => {
    localStorage.setItem('tutuu_onboarded', '1')
    onDone()
  }

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY)
    if (Math.abs(dx) > 50 && dy < 60) {
      if (dx > 0) next()
      else prev()
    }
    touchStartX.current = null
  }

  const slide = SLIDES[idx]
  const isLast = idx === SLIDES.length - 1

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: slide.bg,
        transition: 'background 0.4s ease',
        userSelect: 'none',
        fontFamily: 'inherit',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Skip */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px 24px 0' }}>
        <button
          onClick={finish}
          style={{
            background: 'none', border: 'none', fontSize: 13,
            color: '#B8AFA6', cursor: 'pointer', fontWeight: 500,
            padding: '4px 8px',
          }}
        >
          Пропустить
        </button>
      </div>

      {/* Slide content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 32px',
          textAlign: 'center',
          opacity: anim ? 0 : 1,
          transform: anim ? `translateX(${dir * 40}px)` : 'translateX(0)',
          transition: 'opacity 0.28s ease, transform 0.28s ease',
        }}
      >
        {/* Icon circle */}
        <div style={{
          width: 130, height: 130, borderRadius: '50%',
          background: slide.circleBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 60, marginBottom: 32,
          boxShadow: `0 8px 32px ${slide.color}22`,
        }}>
          {slide.emoji}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 28, fontWeight: 800,
          color: slide.color,
          marginBottom: 14,
          letterSpacing: '-0.5px',
        }}>
          {slide.title}
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 16, color: '#7A6E66',
          lineHeight: 1.65, maxWidth: 300,
          whiteSpace: 'pre-line',
        }}>
          {slide.subtitle}
        </div>
      </div>

      {/* Bottom */}
      <div style={{
        padding: '24px 24px 52px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 22,
      }}>
        {/* Dots */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              onClick={() => goTo(i, i > idx ? 1 : -1)}
              style={{
                width: i === idx ? 22 : 8,
                height: 8,
                borderRadius: 4,
                background: i === idx ? slide.color : '#D9D0C7',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={next}
          style={{
            width: '100%', maxWidth: 340,
            padding: '15px 24px',
            borderRadius: 16,
            background: slide.color,
            color: '#fff',
            border: 'none',
            fontSize: 16, fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '-0.2px',
            boxShadow: `0 4px 20px ${slide.color}44`,
            transition: 'transform 0.1s ease, box-shadow 0.1s ease',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isLast ? '🚀 Начать' : 'Далее →'}
        </button>

        {/* Prev arrow — not on first slide */}
        {idx > 0 && (
          <button
            onClick={prev}
            style={{
              background: 'none', border: 'none',
              fontSize: 13, color: '#B8AFA6',
              cursor: 'pointer', fontWeight: 500,
            }}
          >
            ← Назад
          </button>
        )}
      </div>
    </div>
  )
}
