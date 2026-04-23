'use client'
import { useState } from 'react'
import { TEAL, INP as _INP, SEL as _SEL, TH as _TH, TD as _TD } from '@/lib/constants'
import SecHd from '../shared/SecHd'
import RegModal from '../shared/RegModal'

const INP: React.CSSProperties = { ..._INP, padding: '0 7px', boxSizing: 'border-box' }
const SEL: React.CSSProperties = { ...INP, cursor: 'pointer' }
const TH: React.CSSProperties = { ..._TH, width: 120, padding: '9px 12px', fontWeight: 600, color: '#333', verticalAlign: 'middle', borderRight: '1px solid #e8edf4' }
const TD: React.CSSProperties = { ..._TD, padding: '7px 12px' }

const CHANGE_REASONS = ['당사자 또는 대리인의 사정', '증인 또는 감정인의 사정', '법원의 사정', '기타']

interface DateInfoSectionProps {
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  caseData?: { dateType?: string; dateTime?: string; courtRoom?: string; division?: string }
  readOnly?: boolean
}

export default function DateInfoSection({ data, onChange, caseData, readOnly }: DateInfoSectionProps) {
  const [open, setOpen] = useState(true)
  const [showRegModal, setShowRegModal] = useState(false)

  const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }
  const row: React.CSSProperties = { borderBottom: '1px solid #e8edf4' }
  const hd: React.CSSProperties = { ...TH, background: '#edf1f7', textAlign: 'center', width: 'auto' }

  return (
    <div style={{ border: '1px solid #c8cdd6', borderRadius: 2, marginBottom: 10, background: '#fff' }}>
      <SecHd label="기일변경정보" open={open} toggle={() => setOpen(!open)} />
      {open && (
        <div style={{ padding: '14px 16px' }}>
          {/* Current date info */}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>현재기일</div>
          <table style={tbl}>
            <thead>
              <tr style={row}>
                {['기일종류', '기일일시', '법정', '재판부'].map(h => (
                  <th key={h} style={{ ...hd, padding: '6px 8px', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {caseData?.dateType ? (
                <tr style={row}>
                  <td style={{ ...TD, textAlign: 'center' }}>{caseData.dateType}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{caseData.dateTime}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{caseData.courtRoom}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{caseData.division}</td>
                </tr>
              ) : (
                <tr><td colSpan={4} style={{ ...TD, textAlign: 'center', color: '#aaa', padding: 20 }}>조회된 기일이 없습니다.</td></tr>
              )}
            </tbody>
          </table>

          {/* Change reason */}
          <table style={{ ...tbl, marginTop: 14 }}>
            <tbody>
              <tr style={row}>
                <td style={TH}>변경사유 <span style={{ color: '#e8173e' }}>*</span></td>
                <td style={TD}>
                  <select style={{ ...SEL, width: 280 }} value={(data.changeReason as string) || ''} onChange={e => onChange({ changeReason: e.target.value })} disabled={readOnly}>
                    <option value="">선택</option>
                    {CHANGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
              </tr>
              <tr style={row}>
                <td style={TH}>구체적 사유 <span style={{ color: '#e8173e' }}>*</span></td>
                <td style={TD}>
                  <textarea
                    style={{ ...INP, width: '100%', height: 80, padding: '6px 8px', resize: 'vertical', fontFamily: 'inherit' }}
                    maxLength={200}
                    value={(data.specificReason as string) || ''}
                    onChange={e => onChange({ specificReason: e.target.value })}
                    readOnly={readOnly}
                  />
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#888' }}>{((data.specificReason as string) || '').length}/200자</div>
                </td>
              </tr>
              <tr style={row}>
                <td style={TH}>희망기일 (1순위)</td>
                <td style={TD}>
                  <input type="date" style={{ ...INP, width: 180 }} value={(data.preferredDate1 as string) || ''} onChange={e => onChange({ preferredDate1: e.target.value })} readOnly={readOnly} />
                </td>
              </tr>
              <tr style={row}>
                <td style={TH}>희망기일 (2순위)</td>
                <td style={TD}>
                  <input type="date" style={{ ...INP, width: 180 }} value={(data.preferredDate2 as string) || ''} onChange={e => onChange({ preferredDate2: e.target.value })} readOnly={readOnly} />
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
