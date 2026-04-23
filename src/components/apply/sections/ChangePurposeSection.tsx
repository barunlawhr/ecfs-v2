'use client'
import { useState } from 'react'
import { TEAL, INP as _INP, TH as _TH, TD as _TD } from '@/lib/constants'
import SecHd from '../shared/SecHd'
import RegModal from '../shared/RegModal'

const INP: React.CSSProperties = { ..._INP, padding: '0 7px', boxSizing: 'border-box' }
const TH: React.CSSProperties = { ..._TH, width: 120, padding: '9px 12px', fontWeight: 600, color: '#333', verticalAlign: 'middle', borderRight: '1px solid #e8edf4' }
const TD: React.CSSProperties = { ..._TD, padding: '7px 12px' }

interface ChangePurposeSectionProps {
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  readOnly?: boolean
}

export default function ChangePurposeSection({ data, onChange, readOnly }: ChangePurposeSectionProps) {
  const [open, setOpen] = useState(true)
  const [showRegModal, setShowRegModal] = useState(false)

  const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }
  const row: React.CSSProperties = { borderBottom: '1px solid #e8edf4' }

  return (
    <div style={{ border: '1px solid #c8cdd6', borderRadius: 2, marginBottom: 10, background: '#fff' }}>
      <SecHd label="청구취지 변경" open={open} toggle={() => setOpen(!open)} />
      {open && (
        <div style={{ padding: '14px 16px' }}>
          {/* Before / After side by side */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 6 }}>변경 전 청구취지</div>
              <div style={{ width: '100%', minHeight: 120, padding: '8px 10px', border: '1px solid #d0d8e4', borderRadius: 2, background: '#f5f5f5', fontSize: 12, color: '#555', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {(data.previousClaimPurpose as string) || '(변경 전 청구취지 없음)'}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 6 }}>변경 후 청구취지 <span style={{ color: '#e8173e' }}>*</span></div>
              <textarea
                style={{ ...INP, width: '100%', minHeight: 120, padding: '8px 10px', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.7' }}
                value={(data.newClaimPurpose as string) || ''}
                onChange={e => onChange({ newClaimPurpose: e.target.value })}
                readOnly={readOnly}
                placeholder="변경 후 청구취지를 입력하세요."
              />
            </div>
          </div>

          {/* Change reason */}
          <table style={tbl}>
            <tbody>
              <tr style={row}>
                <td style={TH}>변경이유 <span style={{ color: '#e8173e' }}>*</span></td>
                <td style={TD}>
                  <textarea
                    style={{ ...INP, width: '100%', height: 100, padding: '6px 8px', resize: 'vertical', fontFamily: 'inherit' }}
                    value={(data.changeReason as string) || ''}
                    onChange={e => onChange({ changeReason: e.target.value })}
                    readOnly={readOnly}
                    placeholder="변경이유를 입력하세요."
                  />
                </td>
              </tr>
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
