'use client'

import { useEffect, useRef, useState } from 'react'
import { ComplaintFormData, SampleCase } from '@/types'

interface Step3WriteAnswerProps {
  data: ComplaintFormData
  onChange: (d: ComplaintFormData) => void
  onNext: () => void
  onBack: () => void
  assignedCase?: SampleCase
}

const COURTS = [
  '서울중앙지방법원', '서울동부지방법원', '서울서부지방법원', '서울남부지방법원', '서울북부지방법원',
  '수원지방법원', '인천지방법원', '부산지방법원', '대구지방법원', '광주지방법원',
  '대전지방법원', '울산지방법원', '의정부지방법원', '춘천지방법원', '청주지방법원',
  '전주지방법원', '창원지방법원', '제주지방법원',
]

type SectionKey = 'basic' | 'purpose' | 'cause'

export default function Step3WriteAnswer({ data, onChange, onNext, onBack, assignedCase }: Step3WriteAnswerProps) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({ basic: true, purpose: true, cause: true })
  const [factsExpanded, setFactsExpanded] = useState(false)
  const causeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (assignedCase) {
      const updates: Partial<ComplaintFormData> = {}
      if (!data.court && assignedCase.court) updates.court = assignedCase.court
      if (!data.caseCategory && assignedCase.case_type) updates.caseCategory = assignedCase.case_type
      if (Object.keys(updates).length > 0) onChange({ ...data, ...updates })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedCase])

  useEffect(() => {
    if (causeRef.current && causeRef.current.innerText !== data.claimCause) {
      causeRef.current.innerText = data.claimCause || ''
    }
  }, []) // Only on mount

  const toggle = (key: SectionKey) => setOpen(prev => ({ ...prev, [key]: !prev[key] }))

  const inp: React.CSSProperties = {
    padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14,
    width: '100%', boxSizing: 'border-box',
  }
  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', backgroundColor: '#1e3a5f', color: '#fff',
    borderRadius: 6, cursor: 'pointer', marginBottom: 2, userSelect: 'none',
  }
  const sectionBodyStyle = (isOpen: boolean): React.CSSProperties => ({
    display: isOpen ? 'block' : 'none',
    border: '1px solid #e5e7eb', borderTop: 'none',
    borderRadius: '0 0 6px 6px', padding: '20px', marginBottom: 20,
  })

  return (
    <div>
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-ttl">답변서 작성</span>
        </div>

        {/* 답변 대상 사건 표시 */}
        {assignedCase && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6,
            padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#92400e',
          }}>
            <strong>답변 대상 사건:</strong> {assignedCase.title || assignedCase.case_type} &nbsp;|&nbsp;
            <strong>원고:</strong> {assignedCase.plaintiff} &nbsp;|&nbsp;
            <strong>법원:</strong> {assignedCase.court}
          </div>
        )}

        {/* Section 1: 사건기본정보 */}
        <div style={{ marginBottom: 4 }}>
          <div style={sectionHeaderStyle} onClick={() => toggle('basic')}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>사건기본정보</span>
            <span style={{ fontSize: 18 }}>{open.basic ? '▲' : '▼'}</span>
          </div>
          <div style={sectionBodyStyle(open.basic)}>
            <table className="ftbl">
              <tbody>
                <tr>
                  <th style={{ width: 130 }}>사건명 <span className="req">*</span></th>
                  <td>
                    <input
                      type="text"
                      value={data.caseCategory || data.caseName}
                      onChange={e => onChange({ ...data, caseCategory: e.target.value, caseName: e.target.value })}
                      placeholder="예: 대여금, 손해배상(기)"
                      style={{ ...inp, maxWidth: 360 }}
                    />
                  </td>
                </tr>
                <tr>
                  <th>법원 <span className="req">*</span></th>
                  <td>
                    <select
                      value={data.court}
                      onChange={e => onChange({ ...data, court: e.target.value })}
                      style={{ ...inp, maxWidth: 260 }}
                    >
                      <option value="">-- 법원 선택 --</option>
                      {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                </tr>
                <tr>
                  <th>사건번호</th>
                  <td>
                    <input
                      type="text"
                      value={data.sogaType}
                      onChange={e => onChange({ ...data, sogaType: e.target.value })}
                      placeholder="예: 2024가단12345 (소장에 표시된 사건번호)"
                      style={{ ...inp, maxWidth: 300 }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: 답변 취지 */}
        <div style={{ marginBottom: 4 }}>
          <div style={sectionHeaderStyle} onClick={() => toggle('purpose')}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>답변 취지</span>
            <span style={{ fontSize: 18 }}>{open.purpose ? '▲' : '▼'}</span>
          </div>
          <div style={sectionBodyStyle(open.purpose)}>
            <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 6 }}>
              답변 취지 <span className="req">*</span>
            </label>
            <div style={{
              background: '#f0f7ff', border: '1px solid #c5d8f6', borderRadius: 4,
              padding: '10px 12px', fontSize: 12, color: '#1e40af', marginBottom: 10, lineHeight: 1.7,
            }}>
              <strong>예시:</strong> 1. 원고의 청구를 기각한다. 2. 소송비용은 원고가 부담한다. 라는 판결을 구합니다.
            </div>
            <textarea
              value={data.claimPurpose}
              onChange={e => onChange({ ...data, claimPurpose: e.target.value })}
              placeholder={`1. 원고의 청구를 기각한다.\n2. 소송비용은 원고가 부담한다.\n라는 판결을 구합니다.`}
              style={{
                width: '100%', minHeight: 120, padding: '10px 12px',
                border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14,
                lineHeight: 1.7, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Section 3: 답변 이유 */}
        <div style={{ marginBottom: 24 }}>
          <div style={sectionHeaderStyle} onClick={() => toggle('cause')}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>답변 이유</span>
            <span style={{ fontSize: 18 }}>{open.cause ? '▲' : '▼'}</span>
          </div>
          <div style={sectionBodyStyle(open.cause)}>
            <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 6 }}>
              답변 이유 <span className="req">*</span>
            </label>
            <div
              ref={causeRef}
              contentEditable
              suppressContentEditableWarning
              onInput={e => onChange({ ...data, claimCause: (e.target as HTMLDivElement).innerText })}
              data-placeholder="원고의 주장에 대한 반박 이유를 구체적으로 서술하세요..."
              style={{
                minHeight: 200, padding: '10px 12px', border: '1px solid #d1d5db',
                borderRadius: 4, fontSize: 14, lineHeight: 1.8, outline: 'none',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}
            />
            <style>{`
              [data-placeholder]:empty:before {
                content: attr(data-placeholder);
                color: #9ca3af;
                pointer-events: none;
              }
            `}</style>

            {/* Reference: complaint facts */}
            {assignedCase?.key_facts && (
              <div style={{ marginTop: 16, border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', backgroundColor: '#f3f4f6', cursor: 'pointer', userSelect: 'none',
                  }}
                  onClick={() => setFactsExpanded(prev => !prev)}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>📋 참고 사실관계 (원고 주장)</span>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{factsExpanded ? '접기 ▲' : '펼치기 ▼'}</span>
                </div>
                {factsExpanded && (
                  <div style={{
                    padding: '14px', fontSize: 13, lineHeight: 1.8,
                    color: '#374151', backgroundColor: '#fafafa', whiteSpace: 'pre-wrap',
                  }}>
                    {assignedCase.key_facts}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn-gray" onClick={onBack}>이전</button>
          <button
            className="btn-navy"
            onClick={onNext}
            disabled={!data.caseCategory && !data.caseName}
            style={{ opacity: !data.caseCategory && !data.caseName ? 0.4 : 1, cursor: !data.caseCategory && !data.caseName ? 'not-allowed' : 'pointer' }}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  )
}
