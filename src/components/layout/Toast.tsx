'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onDone?: () => void
}

export function Toast({ message, type = 'success', onDone }: ToastProps) {
  const [visible, setVisible] = useState(true)
  const bg = type === 'error' ? '#dc2626' : type === 'info' ? '#0067c2' : '#16a34a'

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone?.() }, 2800)
    return () => clearTimeout(t)
  }, [onDone])

  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
      background: bg, color: '#fff', padding: '10px 24px', borderRadius: 24,
      fontSize: 13, fontWeight: 700, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,.2)',
      animation: 'toastIn 2.8s forwards', pointerEvents: 'none', whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null)
  const show = (message: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ message, type })
  const node = toast ? <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} /> : null
  return { show, node }
}
