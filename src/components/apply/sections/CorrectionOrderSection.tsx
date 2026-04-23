'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TEAL, TH as _TH, TD as _TD } from '@/lib/constants'
import RegModal from '../shared/RegModal'

const TH: React.CSSProperties = { ..._TH, width: 120, padding: '9px 12px', fontWeight: 600, color: '#333', verticalAlign: 'middle', borderRight: '1px solid #e8edf4' }
const TD: React.CSSProperties = { ..._TD, padding: '7px 12px' }

interface CorrectionOrder {
  id: string
  order_number: string
  order_date: string
  deadline: string
  order_content: string
  order_type: string
  status: string
}

interface CorrectionOrderSectionProps {
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  readOnly?: boolean
}

function getDday(deadline: string): { label: string; color: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dl = new Date(deadline)
  dl.setHours(0, 0, 0, 0)
  const diff = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: `D+${Math.abs(diff)} (초과)`, color: '#e53e3e' }
  if (diff === 0) return { label: 'D-Day', color: '#e53e3e' }
  if (diff <= 3) return { label: `D-${diff}`, color: '#e53e3e' }
  if (diff <= 7) return { label: `D-${diff}`, color: '#dd6b20' }
  return { label: `D-${diff}`, color: '#38a169' }
}

export default function CorrectionOrderSection({ data }: CorrectionOrderSectionProps) {
  const [order, setOrder] = useState<CorrectionOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [showRegModal, setShowRegModal] = useState(false)

  const orderId = data.orderId as string | undefined

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    ;(async () => {
      const { data: row } = await supabase
        .from('correction_orders')
        .select('*')
        .eq('id', orderId)
        .single()
      if (row) setOrder(row as CorrectionOrder)
      setLoading(false)
    })()
  }, [orderId])

  const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }
  const row: React.CSSProperties = { borderBottom: '1px solid #e8edf4' }
  const hd: React.CSSProperties = { ...TH, background: '#edf1f7', textAlign: 'center', width: 'auto' }

  if (loading) {
    return <div style={{ padding: 14, fontSize: 12, color: '#888' }}>로딩 중...</div>
  }

  if (!order) {
    return (
      <div>
        <div style={{ padding: '14px 0', fontSize: 12, color: '#888' }}>보정명령 내역이 없습니다.</div>
        <div style={{ textAlign: 'right', marginTop: 10 }}>
          <button onClick={() => setShowRegModal(true)} style={{ height: 30, padding: '0 20px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>등록</button>
        </div>
        {showRegModal && <RegModal onClose={() => setShowRegModal(false)} />}
      </div>
    )
  }

  const dday = getDday(order.deadline)

  return (
    <div>
      <table style={tbl}>
        <thead>
          <tr style={row}>
            {['보정명령번호', '명령일자', '보정기한'].map(h => (
              <th key={h} style={{ ...hd, padding: '6px 8px', fontSize: 11 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={row}>
            <td style={{ ...TD, textAlign: 'center' }}>{order.order_number}</td>
            <td style={{ ...TD, textAlign: 'center' }}>{order.order_date}</td>
            <td style={{ ...TD, textAlign: 'center' }}>
              {order.deadline}{' '}
              <span style={{ color: dday.color, fontWeight: 700, marginLeft: 6 }}>{dday.label}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 4 }}>명령내용</div>
        <div style={{ width: '100%', minHeight: 80, padding: '8px 10px', border: '1px solid #d0d8e4', borderRadius: 2, background: '#f5f5f5', fontSize: 12, color: '#333', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {order.order_content}
        </div>
      </div>

      <div style={{ textAlign: 'right', marginTop: 10 }}>
        <button onClick={() => setShowRegModal(true)} style={{ height: 30, padding: '0 20px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>등록</button>
      </div>
      {showRegModal && <RegModal onClose={() => setShowRegModal(false)} />}
    </div>
  )
}
