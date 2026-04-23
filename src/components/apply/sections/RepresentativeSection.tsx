'use client'
import { useState } from 'react'
import { TEAL, INP as _INP, SEL as _SEL, TH as _TH, TD as _TD } from '@/lib/constants'
import SecHd from '../shared/SecHd'
import RegModal from '../shared/RegModal'

const INP: React.CSSProperties = { ..._INP, padding: '0 7px', boxSizing: 'border-box' }
const SEL: React.CSSProperties = { ...INP, cursor: 'pointer' }
const TH: React.CSSProperties = { ..._TH, width: 120, padding: '9px 12px', fontWeight: 600, color: '#333', verticalAlign: 'middle', borderRight: '1px solid #e8edf4' }
const TD: React.CSSProperties = { ..._TD, padding: '7px 12px' }

const AGENT_TYPES = ['변호사', '법무사', '국선대리인', '법정대리인', '임의대리인']

interface RepRow {
  partyName: string
  agentType: string
  agentName: string
  partyRole: string
}

interface RepresentativeSectionProps {
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  parties?: Array<{ role: string; name: string }>
  readOnly?: boolean
}

export default function RepresentativeSection({ data, onChange, parties = [], readOnly }: RepresentativeSectionProps) {
  const [open, setOpen] = useState(true)
  const [showRegModal, setShowRegModal] = useState(false)
  const [partyIdx, setPartyIdx] = useState('0')
  const [agentType, setAgentType] = useState('변호사')
  const [agentName, setAgentName] = useState('')

  const reps = (data.representatives as RepRow[]) || []
  const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }
  const row: React.CSSProperties = { borderBottom: '1px solid #e8edf4' }
  const hd: React.CSSProperties = { ...TH, background: '#edf1f7', textAlign: 'center', width: 'auto' }

  function addRep() {
    if (!agentName.trim()) return
    const p = parties[parseInt(partyIdx)] || { role: '-', name: '-' }
    const next: RepRow = { partyName: p.name, partyRole: p.role, agentType, agentName: agentName.trim() }
    onChange({ representatives: [...reps, next] })
    setAgentName('')
  }

  function removeRep(idx: number) {
    const next = reps.filter((_, i) => i !== idx)
    onChange({ representatives: next })
  }

  return (
    <div style={{ border: '1px solid #c8cdd6', borderRadius: 2, marginBottom: 10, background: '#fff' }}>
      <SecHd label="대리인" open={open} toggle={() => setOpen(!open)} />
      {open && (
        <div style={{ padding: '14px 16px' }}>
          {/* Rep list */}
          <table style={tbl}>
            <thead>
              <tr style={row}>
                {['대리인구분', '이름', '당사자구분', '당사자', '삭제'].map(h => (
                  <th key={h} style={{ ...hd, padding: '6px 8px', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reps.length === 0 ? (
                <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', color: '#aaa', padding: 20 }}>등록된 대리인이 없습니다.</td></tr>
              ) : reps.map((r, i) => (
                <tr key={i} style={row}>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.agentType}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.agentName}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.partyRole}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.partyName}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>
                    {!readOnly && <button onClick={() => removeRep(i)} style={{ color: '#e8173e', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>삭제</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add form */}
          {!readOnly && (
            <div style={{ marginTop: 12, border: '1px solid #e0e6ee', borderRadius: 2, padding: 12, background: '#f9fafb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <select style={{ ...SEL, width: 160 }} value={partyIdx} onChange={e => setPartyIdx(e.target.value)}>
                  {parties.length === 0 ? (
                    <option value="0">당사자 없음</option>
                  ) : parties.map((p, i) => (
                    <option key={i} value={String(i)}>{p.role} - {p.name}</option>
                  ))}
                </select>
                <select style={{ ...SEL, width: 120 }} value={agentType} onChange={e => setAgentType(e.target.value)}>
                  {AGENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="text" style={{ ...INP, width: 140 }} placeholder="대리인명" value={agentName} onChange={e => setAgentName(e.target.value)} />
              </div>
            </div>
          )}

          <div style={{ textAlign: 'right', marginTop: 10 }}>
            {!readOnly && (
              <button onClick={addRep} style={{ height: 30, padding: '0 16px', background: '#fff', border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 12, cursor: 'pointer', marginRight: 6 }}>대리인 추가</button>
            )}
            <button onClick={() => setShowRegModal(true)} style={{ height: 30, padding: '0 20px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>등록</button>
          </div>
        </div>
      )}
      {showRegModal && <RegModal onClose={() => setShowRegModal(false)} />}
    </div>
  )
}
