'use client'

import { useEffect, useState } from 'react'

const DEFAULT_TEXT = '⚠️ 본 페이지는 전자소송 실습 모의 페이지입니다. 실제 법원 접수 시스템이 아니며, 작성된 내용은 법적 효력이 없습니다.'

export default function MockBar() {
  const [text, setText] = useState(DEFAULT_TEXT)

  useEffect(() => {
    const update = () => {
      const saved = localStorage.getItem('mock_bar_text')
      setText(saved && saved.trim() ? saved.trim() : DEFAULT_TEXT)
    }
    update()
    window.addEventListener('site-settings-updated' as keyof WindowEventMap, update)
    return () => window.removeEventListener('site-settings-updated' as keyof WindowEventMap, update)
  }, [])

  return (
    <div style={{ background: 'linear-gradient(90deg,#1a3a6b,#2952a3)', color: '#fff', textAlign: 'center', padding: '6px 20px', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #b8922a' }}>
      {text}
      <span style={{ marginLeft: 16, fontSize: 11, opacity: 0.8 }}>🎓 실습 전용 · 실제 소장 제출 불가</span>
    </div>
  )
}
