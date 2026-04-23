'use client'
import { useState } from 'react'
import { TEAL, INP as _INP, SEL as _SEL, TH as _TH, TD as _TD } from '@/lib/constants'
import SecHd from '../shared/SecHd'
import RegModal from '../shared/RegModal'

const INP: React.CSSProperties = { ..._INP, padding: '0 7px', boxSizing: 'border-box' }
const SEL: React.CSSProperties = { ...INP, cursor: 'pointer' }
const TH: React.CSSProperties = { ..._TH, width: 120, padding: '9px 12px', fontWeight: 600, color: '#333', verticalAlign: 'middle', borderRight: '1px solid #e8edf4' }
const TD: React.CSSProperties = { ..._TD, padding: '7px 12px' }

const DOC_OPTIONS = ['직접입력', '소송위임장', '법인등기사항증명서', '부동산등기사항증명서', '가족관계증명서', '주민등록등본', '사업자등록증', '위임장', '기타']

interface AttachRow {
  no: number
  docName: string
  fileName: string
  regDate: string
}

interface AttachmentsSectionProps {
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  readOnly?: boolean
}

export default function AttachmentsSection({ data, onChange, readOnly }: AttachmentsSectionProps) {
  const [open, setOpen] = useState(true)
  const [showRegModal, setShowRegModal] = useState(false)
  const [docType, setDocType] = useState('직접입력')
  const [docName, setDocName] = useState('')
  const [sameAsFile, setSameAsFile] = useState(false)

  const rows = (data.attachments as AttachRow[]) || []
  const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }
  const row: React.CSSProperties = { borderBottom: '1px solid #e8edf4' }
  const hd: React.CSSProperties = { ...TH, background: '#edf1f7', textAlign: 'center', width: 'auto' }
  const btn: React.CSSProperties = { height: 26, padding: '0 10px', background: '#fff', border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 11, cursor: 'pointer', color: '#333' }

  function addToList() {
    const next: AttachRow = { no: rows.length + 1, docName: docName || docType, fileName: '', regDate: new Date().toISOString().slice(0, 10) }
    onChange({ attachments: [...rows, next] })
    setDocName('')
    setDocType('직접입력')
  }

  function removeRow(idx: number) {
    const next = rows.filter((_, i) => i !== idx)
    onChange({ attachments: next })
  }

  return (
    <div style={{ border: '1px solid #c8cdd6', borderRadius: 2, marginBottom: 10, background: '#fff' }}>
      <SecHd label="첨부서류" open={open} toggle={() => setOpen(!open)} />
      {open && (
        <div style={{ padding: '14px 16px' }}>
          {/* Guidance */}
          <div style={{ background: '#f9fafb', border: '1px solid #e0e6ee', borderRadius: 2, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#555', lineHeight: 1.7 }}>
            • 첨부서류를 등록해 주세요. 파일은 PDF, JPG, PNG, HWP 형식을 지원합니다.
          </div>

          {/* Doc name row */}
          <table style={tbl}>
            <tbody>
              <tr style={row}>
                <td style={TH}>서류명</td>
                <td style={TD}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <select style={{ ...SEL, width: 160 }} value={docType} onChange={e => { setDocType(e.target.value); if (e.target.value !== '직접입력') setDocName(e.target.value) }} disabled={readOnly}>
                      {DOC_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <input type="text" style={{ ...INP, width: 200 }} value={docName} onChange={e => setDocName(e.target.value)} readOnly={readOnly} placeholder="서류명 입력" />
                    <label style={{ fontSize: 11, cursor: 'pointer', color: '#555' }}>
                      <input type="checkbox" checked={sameAsFile} onChange={e => setSameAsFile(e.target.checked)} /> 파일명과동일
                    </label>
                  </div>
                </td>
              </tr>
              <tr style={row}>
                <td style={TH}>파일첨부</td>
                <td style={TD}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <button style={btn}>파일찾기</button>
                  </div>
                  <div style={{ border: '2px dashed #d0d8e4', borderRadius: 4, padding: '20px 0', textAlign: 'center', color: '#aaa', fontSize: 12 }}>
                    DRAG &amp; DROP
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ textAlign: 'right', marginTop: 8, marginBottom: 14 }}>
            <button onClick={addToList} style={{ ...btn, background: TEAL, color: '#fff', border: 'none', fontWeight: 700 }}>목록에 추가</button>
          </div>

          {/* Attachments list header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>첨부서류목록</span>
            <button style={btn}>전자발급서류첨부하기</button>
          </div>

          {/* Attach table */}
          <table style={tbl}>
            <thead>
              <tr style={row}>
                {['번호', '서류명', '파일명', '등록일', '순서변경', '삭제'].map(h => (
                  <th key={h} style={{ ...hd, padding: '6px 8px', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', color: '#aaa', padding: 20 }}>등록된 첨부서류가 없습니다.</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i} style={row}>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.no}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.docName}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.fileName || '-'}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{r.regDate}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>
                    <button style={{ ...btn, padding: '0 6px', fontSize: 10 }}>▲</button>
                    <button style={{ ...btn, padding: '0 6px', fontSize: 10, marginLeft: 2 }}>▼</button>
                  </td>
                  <td style={{ ...TD, textAlign: 'center' }}>
                    {!readOnly && <button onClick={() => removeRow(i)} style={{ color: '#e8173e', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>삭제</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>총 {rows.length}건</div>

          <div style={{ textAlign: 'right', marginTop: 10 }}>
            <button onClick={() => setShowRegModal(true)} style={{ height: 30, padding: '0 20px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>등록</button>
          </div>
        </div>
      )}
      {showRegModal && <RegModal onClose={() => setShowRegModal(false)} />}
    </div>
  )
}
