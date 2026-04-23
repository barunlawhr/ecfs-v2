'use client'
import { useState } from 'react'
import { TEAL, NAVY, INP as _INP, SEL as _SEL, TH as _TH, TD as _TD } from '@/lib/constants'
import SecHd from '../shared/SecHd'
import RegModal from '../shared/RegModal'

const INP: React.CSSProperties = { ..._INP, padding: '0 7px', boxSizing: 'border-box' }
const SEL: React.CSSProperties = { ...INP, cursor: 'pointer' }
const TH: React.CSSProperties = { ..._TH, width: 120, padding: '9px 12px', fontWeight: 600, color: '#333', verticalAlign: 'middle', borderRight: '1px solid #e8edf4' }
const TD: React.CSSProperties = { ..._TD, padding: '7px 12px' }

interface EvidenceRow {
  prefix: string
  no: number
  subNo: string
  docName: string
  fileName: string
  pageNo: string
  purpose: string
}

interface EvidenceSectionProps {
  prefix: '갑' | '을' | '병'
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  readOnly?: boolean
}

export default function EvidenceSection({ prefix, data, onChange, readOnly }: EvidenceSectionProps) {
  const [open, setOpen] = useState(true)
  const [showRegModal, setShowRegModal] = useState(false)
  const [docName, setDocName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [evidenceType, setEvidenceType] = useState<string>(`${prefix}호증`)

  const rows = (data.evidenceRows as EvidenceRow[]) || []
  const uploadedFiles = (data.uploadedFiles as string[]) || []

  const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }
  const row: React.CSSProperties = { borderBottom: '1px solid #e8edf4' }
  const hd: React.CSSProperties = { ...TH, background: '#edf1f7', textAlign: 'center', width: 'auto' }
  const btn: React.CSSProperties = { height: 26, padding: '0 10px', background: '#fff', border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 11, cursor: 'pointer', color: '#333' }

  function addEvidence() {
    const next: EvidenceRow = { prefix: evidenceType, no: rows.length + 1, subNo: '', docName, fileName: '', pageNo: '', purpose }
    onChange({ evidenceRows: [...rows, next] })
    setDocName('')
    setPurpose('')
  }

  function removeRow(idx: number) {
    const next = rows.filter((_, i) => i !== idx)
    onChange({ evidenceRows: next })
  }

  return (
    <div style={{ border: '1px solid #c8cdd6', borderRadius: 2, marginBottom: 10, background: '#fff' }}>
      <SecHd label="입증서류" open={open} toggle={() => setOpen(!open)} />
      {open && (
        <div style={{ padding: '14px 16px' }}>
          {/* Guidance */}
          <div style={{ background: '#f9fafb', border: '1px solid #e0e6ee', borderRadius: 2, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#555', lineHeight: 1.7 }}>
            <div>• 증거서류는 파일첨부 또는 직접입력으로 등록할 수 있습니다.</div>
            <div>• 파일은 PDF, JPG, PNG, HWP 형식을 지원합니다.</div>
          </div>

          {/* File upload area */}
          <div style={{ border: '1px solid #d0d8e4', borderRadius: 2, padding: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <button style={btn}>파일찾기</button>
              <button style={btn}>삭제</button>
            </div>
            {uploadedFiles.length > 0 ? (
              <table style={tbl}>
                <thead><tr style={row}><th style={hd}>파일명</th></tr></thead>
                <tbody>
                  {uploadedFiles.map((f, i) => <tr key={i} style={row}><td style={{ ...TD, textAlign: 'center' }}>{f}</td></tr>)}
                </tbody>
              </table>
            ) : (
              <div style={{ border: '2px dashed #d0d8e4', borderRadius: 4, padding: '24px 0', textAlign: 'center', color: '#aaa', fontSize: 12 }}>
                DRAG &amp; DROP
              </div>
            )}
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <button style={{ ...btn, background: TEAL, color: '#fff', border: 'none', fontWeight: 700 }}>목록에 추가</button>
            </div>
          </div>

          {/* Direct evidence input */}
          <div style={{ border: '1px solid #d0d8e4', borderRadius: 2, padding: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <select style={{ ...SEL, width: 100 }} value={evidenceType} onChange={e => setEvidenceType(e.target.value)} disabled={readOnly}>
                <option value="갑호증">갑호증</option>
                <option value="을호증">을호증</option>
              </select>
              <input type="text" style={{ ...INP, width: 160 }} placeholder="서류명" value={docName} onChange={e => setDocName(e.target.value)} readOnly={readOnly} />
              <input type="text" style={{ ...INP, flex: 1, minWidth: 160 }} placeholder="입증취지" value={purpose} onChange={e => setPurpose(e.target.value)} readOnly={readOnly} />
              <button onClick={addEvidence} style={{ ...btn, background: TEAL, color: '#fff', border: 'none', fontWeight: 700 }} disabled={readOnly}>서증추가</button>
            </div>
          </div>

          {/* Evidence list header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>입증서류목록</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['순서변경', '일괄수정', '선택삭제', '전체삭제'].map(l => (
                <button key={l} style={btn}>{l}</button>
              ))}
            </div>
          </div>

          {/* Guide box */}
          <div style={{ background: '#f7f9fc', border: '1px solid #e0e6ee', padding: '6px 12px', marginBottom: 6, fontSize: 11, color: '#888' }}>
            표시기준: {prefix === '갑' ? '갑호증' : prefix === '을' ? '을호증' : '병호증'} — 원고측 제출 증거
          </div>

          {/* Evidence table */}
          <table style={tbl}>
            <thead>
              <tr style={row}>
                {['', '서증부호', '가지부호', '서증번호', '가지번호', '서류명', '파일명', '페이지번호', '입증취지', '삭제'].map(h => (
                  <th key={h} style={{ ...hd, padding: '6px 4px', fontSize: 11 }}>{h || <input type="checkbox" />}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={10} style={{ ...TD, textAlign: 'center', color: '#aaa', padding: 20 }}>등록된 입증서류가 없습니다.</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i} style={row}>
                  <td style={{ ...TD, textAlign: 'center' }}><input type="checkbox" /></td>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.prefix}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.subNo || '-'}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.no}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.subNo || '-'}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.docName}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.fileName || '-'}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.pageNo || '-'}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.purpose}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>
                    {!readOnly && <button onClick={() => removeRow(i)} style={{ color: '#e8173e', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>삭제</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Bottom row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: '#555' }}>총 {rows.length}건</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={btn}>가지번호분리</button>
              <button style={btn}>입증서류분리</button>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: 10 }}>
            <button onClick={() => setShowRegModal(true)} style={{ height: 30, padding: '0 20px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>등록</button>
          </div>
        </div>
      )}
      {showRegModal && <RegModal onClose={() => setShowRegModal(false)} />}
    </div>
  )
}
