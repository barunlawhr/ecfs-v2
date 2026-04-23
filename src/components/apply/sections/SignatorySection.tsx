'use client'
import { useState } from 'react'
import { TEAL, INP as _INP, TH as _TH, TD as _TD } from '@/lib/constants'
import SecHd from '../shared/SecHd'
import RegModal from '../shared/RegModal'

const TH: React.CSSProperties = { ..._TH, width: 120, padding: '9px 12px', fontWeight: 600, color: '#333', verticalAlign: 'middle', borderRight: '1px solid #e8edf4' }
const TD: React.CSSProperties = { ..._TD, padding: '7px 12px' }

interface SignatorySectionProps {
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  user?: { name?: string; email?: string }
  readOnly?: boolean
}

export default function SignatorySection({ data, onChange, user, readOnly }: SignatorySectionProps) {
  const [open, setOpen] = useState(true)
  const [showRegModal, setShowRegModal] = useState(false)

  const owners = (data.docOwners as Array<{ role: string; name: string }>) || []
  const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }
  const row: React.CSSProperties = { borderBottom: '1px solid #e8edf4' }
  const hd: React.CSSProperties = { ...TH, background: '#edf1f7', textAlign: 'center', width: 'auto' }

  return (
    <div style={{ border: '1px solid #c8cdd6', borderRadius: 2, marginBottom: 10, background: '#fff' }}>
      <SecHd label="서류작성자" open={open} toggle={() => setOpen(!open)} />
      {open && (
        <div style={{ padding: '14px 16px' }}>
          <table style={tbl}>
            <thead>
              <tr style={row}>
                <th style={{ ...hd, width: 60 }}>구분</th>
                <th style={hd}>이름(사용자아이디)</th>
                <th style={{ ...hd, width: 60 }}>삭제</th>
              </tr>
            </thead>
            <tbody>
              {owners.length === 0 ? (
                <tr>
                  <td style={{ ...TD, textAlign: 'center' }}>작성자</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{user?.name || '(로그인 필요)'}{user?.email ? ` (${user.email})` : ''}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>-</td>
                </tr>
              ) : (
                owners.map((o, i) => (
                  <tr key={i} style={row}>
                    <td style={{ ...TD, textAlign: 'center' }}>{o.role}</td>
                    <td style={{ ...TD, textAlign: 'center' }}>{o.name}</td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      {!readOnly && <button onClick={() => { const next = [...owners]; next.splice(i, 1); onChange({ docOwners: next }) }} style={{ color: '#e8173e', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>삭제</button>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div style={{ textAlign: 'right', marginTop: 10 }}>
            <button onClick={() => setShowRegModal(true)} style={{ height: 30, padding: '0 20px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>등록</button>
          </div>
        </div>
      )}
      {showRegModal && <RegModal onClose={() => setShowRegModal(false)} />}
    </div>
  )
}
