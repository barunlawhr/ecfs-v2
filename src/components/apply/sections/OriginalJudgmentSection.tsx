'use client'
import { useState } from 'react'
import { TEAL, INP as _INP, SEL as _SEL, TH as _TH, TD as _TD, COURTS } from '@/lib/constants'
import SecHd from '../shared/SecHd'
import RegModal from '../shared/RegModal'

const INP: React.CSSProperties = { ..._INP, padding: '0 7px', boxSizing: 'border-box' }
const SEL: React.CSSProperties = { ...INP, cursor: 'pointer' }
const TH: React.CSSProperties = { ..._TH, width: 120, padding: '9px 12px', fontWeight: 600, color: '#333', verticalAlign: 'middle', borderRight: '1px solid #e8edf4' }
const TD: React.CSSProperties = { ..._TD, padding: '7px 12px' }

interface OriginalJudgmentSectionProps {
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  readOnly?: boolean
}

export default function OriginalJudgmentSection({ data, onChange, readOnly }: OriginalJudgmentSectionProps) {
  const [open, setOpen] = useState(true)
  const [showRegModal, setShowRegModal] = useState(false)

  const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }
  const row: React.CSSProperties = { borderBottom: '1px solid #e8edf4' }

  return (
    <div style={{ border: '1px solid #c8cdd6', borderRadius: 2, marginBottom: 10, background: '#fff' }}>
      <SecHd label="원심판결정보" open={open} toggle={() => setOpen(!open)} />
      {open && (
        <div style={{ padding: '14px 16px' }}>
          <table style={tbl}>
            <tbody>
              <tr style={row}>
                <td style={TH}>원심법원 <span style={{ color: '#e8173e' }}>*</span></td>
                <td style={TD}>
                  <select style={{ ...SEL, width: 260 }} value={(data.originalCourt as string) || ''} onChange={e => onChange({ originalCourt: e.target.value })} disabled={readOnly}>
                    <option value="">선택</option>
                    {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
              </tr>
              <tr style={row}>
                <td style={TH}>원심 사건번호 <span style={{ color: '#e8173e' }}>*</span></td>
                <td style={TD}>
                  <input type="text" style={{ ...INP, width: 200 }} value={(data.originalCaseNo as string) || ''} onChange={e => onChange({ originalCaseNo: e.target.value })} readOnly={readOnly} placeholder="예: 2026가합12345" />
                </td>
              </tr>
              <tr style={row}>
                <td style={TH}>판결 선고일 <span style={{ color: '#e8173e' }}>*</span></td>
                <td style={TD}>
                  <input type="date" style={{ ...INP, width: 180 }} value={(data.judgmentDate as string) || ''} onChange={e => onChange({ judgmentDate: e.target.value })} readOnly={readOnly} />
                </td>
              </tr>
              <tr style={row}>
                <td style={TH}>판결주문</td>
                <td style={TD}>
                  <textarea
                    style={{ ...INP, width: '100%', height: 100, padding: '6px 8px', resize: 'vertical', fontFamily: 'inherit' }}
                    value={(data.judgmentText as string) || ''}
                    onChange={e => onChange({ judgmentText: e.target.value })}
                    readOnly={readOnly}
                    placeholder="판결주문을 입력하세요."
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
