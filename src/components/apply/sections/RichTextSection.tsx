'use client'
import { useState, useRef } from 'react'
import { TEAL, NAVY, INP as _INP, TH as _TH, TD as _TD } from '@/lib/constants'
import SecHd from '../shared/SecHd'
import RegModal from '../shared/RegModal'

const TH: React.CSSProperties = { ..._TH, width: 120, padding: '9px 12px', fontWeight: 600, color: '#333', verticalAlign: 'middle', borderRight: '1px solid #e8edf4' }
const TD: React.CSSProperties = { ..._TD, padding: '7px 12px' }

interface RichTextSectionProps {
  label: string
  fieldKey: string
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  placeholder?: string
  maxLength?: number
  showFileAttach?: boolean
  readOnly?: boolean
}

export default function RichTextSection({ label, fieldKey, data, onChange, placeholder, maxLength, showFileAttach = false, readOnly }: RichTextSectionProps) {
  const [open, setOpen] = useState(true)
  const [showRegModal, setShowRegModal] = useState(false)
  const [fileAttach, setFileAttach] = useState<'direct' | 'file'>('direct')
  const editorRef = useRef<HTMLDivElement>(null)

  const value = (data[fieldKey] as string) || ''
  const byteLen = new TextEncoder().encode(value).length

  const tb1Btn: React.CSSProperties = { width: 26, height: 24, border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#555' }
  const sep: React.CSSProperties = { display: 'inline-block', width: 1, height: 20, background: '#d0d8e4', margin: '0 4px', verticalAlign: 'middle' }

  return (
    <div style={{ border: '1px solid #c8cdd6', borderRadius: 2, marginBottom: 10, background: '#fff' }}>
      <SecHd label={label} open={open} toggle={() => setOpen(!open)} />
      {open && (
        <div style={{ padding: '14px 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                <td style={TH}>{label} <span style={{ color: '#e8173e' }}>*</span></td>
                <td style={TD}>
                  {/* Top bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <button style={{ height: 24, padding: '0 10px', background: '#fff', border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 11, cursor: 'pointer', color: '#333' }}>작성예시참고</button>
                    <span style={{ fontSize: 11, color: '#888' }}>{byteLen} bytes</span>
                  </div>

                  {/* Toolbar row 1 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 6px', background: '#f7f9fc', border: '1px solid #d0d8e4', borderBottom: 'none' }}>
                    {['🗋','💾','✕','⧉','📋','🗑'].map((ic, i) => <button key={i} style={tb1Btn} title={ic}>{ic}</button>)}
                    <span style={sep} />
                    {['↩','↪'].map((ic, i) => <button key={i} style={tb1Btn} title={ic}>{ic}</button>)}
                    <span style={sep} />
                    {['¶','B','I','U'].map((ic, i) => <button key={i} style={{ ...tb1Btn, fontWeight: ic === 'B' ? 700 : 400, fontStyle: ic === 'I' ? 'italic' : 'normal', textDecoration: ic === 'U' ? 'underline' : 'none' }} title={ic}>{ic}</button>)}
                    <span style={sep} />
                    {['—','❝'].map((ic, i) => <button key={i} style={tb1Btn} title={ic}>{ic}</button>)}
                    <span style={sep} />
                    {['≡','☰','≣'].map((ic, i) => <button key={i} style={tb1Btn} title={ic}>{ic}</button>)}
                    <span style={sep} />
                    <button style={tb1Btn} title="A">A</button>
                    <button style={{ ...tb1Btn, fontSize: 10 }} title="A-">A-</button>
                  </div>

                  {/* Toolbar row 2 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', background: '#f7f9fc', border: '1px solid #d0d8e4', borderBottom: 'none' }}>
                    <select style={{ height: 24, fontSize: 11, border: '1px solid #c8cdd6', borderRadius: 2, padding: '0 4px' }}>
                      <option>글꼴</option>
                      <option>맑은 고딕</option>
                      <option>바탕</option>
                      <option>돋움</option>
                    </select>
                    <select style={{ height: 24, fontSize: 11, border: '1px solid #c8cdd6', borderRadius: 2, padding: '0 4px' }}>
                      <option>크기</option>
                      {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Info bar */}
                  <div style={{ padding: '4px 8px', background: '#fffdf0', border: '1px solid #d0d8e4', borderBottom: 'none', fontSize: 11, color: '#888' }}>
                    ℹ 편집기에 대한 도움말은 ALT + 숫자 이...
                  </div>

                  {/* Editor */}
                  <div
                    ref={editorRef}
                    contentEditable={!readOnly}
                    suppressContentEditableWarning
                    onInput={() => {
                      if (editorRef.current) {
                        onChange({ [fieldKey]: editorRef.current.innerHTML })
                      }
                    }}
                    style={{ minHeight: 200, border: '1px solid #d0d8e4', padding: 10, fontSize: 13, lineHeight: 1.7, outline: 'none', background: readOnly ? '#f5f5f5' : '#fff' }}
                    dangerouslySetInnerHTML={{ __html: value }}
                  />

                  {/* Bottom counter */}
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#888', marginTop: 4 }}>
                    글자 {value.replace(/<[^>]*>/g, '').length}자
                    {maxLength ? ` / ${maxLength}자` : ''}
                  </div>

                  {/* File attachment */}
                  {showFileAttach && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ fontSize: 12, cursor: 'pointer' }}>
                        <input type="radio" checked={fileAttach === 'direct'} onChange={() => setFileAttach('direct')} /> 직접입력
                      </label>
                      <label style={{ fontSize: 12, cursor: 'pointer' }}>
                        <input type="radio" checked={fileAttach === 'file'} onChange={() => setFileAttach('file')} /> 파일첨부
                      </label>
                      {fileAttach === 'file' && (
                        <button style={{ height: 26, padding: '0 12px', background: '#fff', border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 11, cursor: 'pointer' }}>파일찾기</button>
                      )}
                    </div>
                  )}
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
