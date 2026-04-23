'use client'
import { useState } from 'react'
import { TEAL, INP as _INP, SEL as _SEL, TH as _TH, TD as _TD } from '@/lib/constants'
import SecHd from '../shared/SecHd'
import RegModal from '../shared/RegModal'

const INP: React.CSSProperties = { ..._INP, padding: '0 7px', boxSizing: 'border-box' }
const SEL: React.CSSProperties = { ...INP, cursor: 'pointer' }
const TH: React.CSSProperties = { ..._TH, width: 120, padding: '9px 12px', fontWeight: 600, color: '#333', verticalAlign: 'middle', borderRight: '1px solid #e8edf4' }
const TD: React.CSSProperties = { ..._TD, padding: '7px 12px' }

interface PartyRow {
  role: string
  name: string
  address: string
}

interface PartiesSectionProps {
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  readOnly?: boolean
}

export default function PartiesSection({ data, onChange, readOnly }: PartiesSectionProps) {
  const [open, setOpen] = useState(true)
  const [showRegModal, setShowRegModal] = useState(false)
  const [role, setRole] = useState<string>('원고')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')

  const parties = (data.parties as PartyRow[]) || []
  const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }
  const row: React.CSSProperties = { borderBottom: '1px solid #e8edf4' }
  const hd: React.CSSProperties = { ...TH, background: '#edf1f7', textAlign: 'center', width: 'auto' }

  function addParty() {
    if (!name.trim()) return
    const next: PartyRow = { role, name: name.trim(), address: address.trim() }
    onChange({ parties: [...parties, next] })
    setName('')
    setAddress('')
  }

  function removeParty(idx: number) {
    const next = parties.filter((_, i) => i !== idx)
    onChange({ parties: next })
  }

  return (
    <div style={{ border: '1px solid #c8cdd6', borderRadius: 2, marginBottom: 10, background: '#fff' }}>
      <SecHd label="당사자" open={open} toggle={() => setOpen(!open)} />
      {open && (
        <div style={{ padding: '14px 16px' }}>
          {/* Parties list */}
          <table style={tbl}>
            <thead>
              <tr style={row}>
                {['No.', '당사자구분', '성명/법인명', '주소', '삭제'].map(h => (
                  <th key={h} style={{ ...hd, padding: '6px 8px', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parties.length === 0 ? (
                <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', color: '#aaa', padding: 20 }}>등록된 당사자가 없습니다.</td></tr>
              ) : parties.map((p, i) => (
                <tr key={i} style={row}>
                  <td style={{ ...TD, textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{p.role}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{p.name}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{p.address || '-'}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>
                    {!readOnly && <button onClick={() => removeParty(i)} style={{ color: '#e8173e', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>삭제</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add party form */}
          {!readOnly && (
            <div style={{ marginTop: 12, border: '1px solid #e0e6ee', borderRadius: 2, padding: 12, background: '#f9fafb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <select style={{ ...SEL, width: 100 }} value={role} onChange={e => setRole(e.target.value)}>
                  <option value="원고">원고</option>
                  <option value="피고">피고</option>
                </select>
                <input type="text" style={{ ...INP, width: 140 }} placeholder="이름" value={name} onChange={e => setName(e.target.value)} />
                <input type="text" style={{ ...INP, flex: 1, minWidth: 200 }} placeholder="주소" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
            </div>
          )}

          <div style={{ textAlign: 'right', marginTop: 10 }}>
            {!readOnly && (
              <button onClick={addParty} style={{ height: 30, padding: '0 16px', background: '#fff', border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 12, cursor: 'pointer', marginRight: 6 }}>당사자 추가</button>
            )}
            <button onClick={() => setShowRegModal(true)} style={{ height: 30, padding: '0 20px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>등록</button>
          </div>
        </div>
      )}
      {showRegModal && <RegModal onClose={() => setShowRegModal(false)} />}
    </div>
  )
}
