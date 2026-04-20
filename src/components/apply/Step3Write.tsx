'use client'

import { useEffect, useRef, useState } from 'react'
import { ComplaintFormData, SampleCase } from '@/types'

interface Step3WriteProps {
  data: ComplaintFormData
  onChange: (d: ComplaintFormData) => void
  onNext: () => void
  onBack: () => void
  assignedCase?: SampleCase
}

const CASE_NAMES = ['대여금', '손해배상(기)', '매매대금', '부당이득금', '임금']
const COURTS = [
  '서울중앙지방법원',
  '서울동부지방법원',
  '서울서부지방법원',
  '서울남부지방법원',
  '서울북부지방법원',
  '수원지방법원',
  '인천지방법원',
  '부산지방법원',
  '대구지방법원',
  '광주지방법원',
  '대전지방법원',
  '울산지방법원',
  '의정부지방법원',
  '춘천지방법원',
  '청주지방법원',
  '전주지방법원',
  '창원지방법원',
  '제주지방법원',
]

type SectionKey = 'basic' | 'purpose' | 'cause'

export default function Step3Write({ data, onChange, onNext, onBack, assignedCase }: Step3WriteProps) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    basic: true,
    purpose: true,
    cause: true,
  })
  const [factsExpanded, setFactsExpanded] = useState(false)
  const causeRef = useRef<HTMLDivElement>(null)

  // Auto-fill from assignedCase
  useEffect(() => {
    if (assignedCase) {
      const updates: Partial<ComplaintFormData> = {}
      if (!data.court && assignedCase.court) updates.court = assignedCase.court
      if (!data.caseCategory && assignedCase.case_type) {
        updates.caseCategory = CASE_NAMES.includes(assignedCase.case_type)
          ? assignedCase.case_type
          : ''
        updates.caseName = assignedCase.case_type
      }
      if (Object.keys(updates).length > 0) {
        onChange({ ...data, ...updates })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedCase])

  // Sync contentEditable with data.claimCause
  useEffect(() => {
    if (causeRef.current && causeRef.current.innerText !== data.claimCause) {
      causeRef.current.innerText = data.claimCause || ''
    }
  }, [data.claimCause])

  const toggle = (key: SectionKey) => setOpen(prev => ({ ...prev, [key]: !prev[key] }))

  const inp: React.CSSProperties = {
    padding: '7px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
  }

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#1e3a5f',
    color: '#fff',
    borderRadius: 6,
    cursor: 'pointer',
    marginBottom: 2,
    userSelect: 'none',
  }

  const sectionBodyStyle = (isOpen: boolean): React.CSSProperties => ({
    display: isOpen ? 'block' : 'none',
    border: '1px solid #e5e7eb',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    padding: '20px',
    marginBottom: 20,
  })

  return (
    <div>
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-ttl">소장 작성</span>
        </div>

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
                  <th style={{ width: 130 }}>
                    사건명 <span className="req">*</span>
                  </th>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        value={data.caseCategory}
                        onChange={e => onChange({ ...data, caseCategory: e.target.value })}
                        style={{ ...inp, width: 180, flexShrink: 0 }}
                      >
                        <option value="">-- 선택 --</option>
                        {CASE_NAMES.map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={data.caseName}
                        onChange={e => onChange({ ...data, caseName: e.target.value })}
                        placeholder="직접 입력 (선택사항)"
                        style={inp}
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <th>
                    법원 <span className="req">*</span>
                  </th>
                  <td>
                    <select
                      value={data.court}
                      onChange={e => onChange({ ...data, court: e.target.value })}
                      style={{ ...inp, maxWidth: 260 }}
                    >
                      <option value="">-- 법원 선택 --</option>
                      {COURTS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                </tr>
                <tr>
                  <th>청구구분</th>
                  <td>
                    <label style={{ marginRight: 20, fontSize: 14, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="claimType"
                        value="재산권상청구"
                        checked={data.claimType === '재산권상청구'}
                        onChange={e => onChange({ ...data, claimType: e.target.value })}
                        style={{ marginRight: 5, accentColor: '#1e3a5f' }}
                      />
                      재산권상청구
                    </label>
                    <label style={{ fontSize: 14, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="claimType"
                        value="비재산권상청구"
                        checked={data.claimType === '비재산권상청구'}
                        onChange={e => onChange({ ...data, claimType: e.target.value })}
                        style={{ marginRight: 5, accentColor: '#1e3a5f' }}
                      />
                      비재산권상청구
                    </label>
                  </td>
                </tr>
                <tr>
                  <th>소가구분</th>
                  <td>
                    {(['금액', '토지', '불능'] as const).map(v => (
                      <label key={v} style={{ marginRight: 20, fontSize: 14, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="sogaType"
                          value={v}
                          checked={data.sogaType === v}
                          onChange={e => onChange({ ...data, sogaType: e.target.value })}
                          style={{ marginRight: 5, accentColor: '#1e3a5f' }}
                        />
                        {v}
                      </label>
                    ))}
                  </td>
                </tr>
                <tr>
                  <th>소가</th>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number"
                        value={data.soga}
                        onChange={e => onChange({ ...data, soga: e.target.value })}
                        placeholder="0"
                        min={0}
                        style={{ ...inp, maxWidth: 200, textAlign: 'right' }}
                      />
                      <span style={{ fontSize: 14, color: '#374151' }}>원</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: 청구취지 */}
        <div style={{ marginBottom: 4 }}>
          <div style={sectionHeaderStyle} onClick={() => toggle('purpose')}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>청구취지</span>
            <span style={{ fontSize: 18 }}>{open.purpose ? '▲' : '▼'}</span>
          </div>
          <div style={sectionBodyStyle(open.purpose)}>
            <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 6 }}>
              청구취지 <span className="req">*</span>
            </label>
            <textarea
              value={data.claimPurpose}
              onChange={e => onChange({ ...data, claimPurpose: e.target.value })}
              placeholder={`1. 피고는 원고에게 금 ○○○원 및 이에 대하여 이 사건 소장 부본 송달일 다음날부터 다 갚는 날까지 연 12%의 비율로 계산한 돈을 지급하라.\n2. 소송비용은 피고가 부담한다.\n3. 위 제1항은 가집행할 수 있다.\n라는 판결을 구합니다.`}
              style={{
                width: '100%',
                minHeight: 120,
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                fontSize: 14,
                lineHeight: 1.7,
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Section 3: 청구원인 */}
        <div style={{ marginBottom: 24 }}>
          <div style={sectionHeaderStyle} onClick={() => toggle('cause')}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>청구원인</span>
            <span style={{ fontSize: 18 }}>{open.cause ? '▲' : '▼'}</span>
          </div>
          <div style={sectionBodyStyle(open.cause)}>
            <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 6 }}>
              청구원인 <span className="req">*</span>
            </label>
            <div
              ref={causeRef}
              contentEditable
              suppressContentEditableWarning
              onInput={e => onChange({ ...data, claimCause: (e.target as HTMLDivElement).innerText })}
              data-placeholder="사실관계를 구체적으로 서술하세요..."
              style={{
                minHeight: 200,
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                fontSize: 14,
                lineHeight: 1.8,
                outline: 'none',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            />
            <style>{`
              [data-placeholder]:empty:before {
                content: attr(data-placeholder);
                color: #9ca3af;
                pointer-events: none;
              }
            `}</style>

            {/* Reference facts box */}
            {assignedCase?.key_facts && (
              <div
                style={{
                  marginTop: 16,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: '#f3f4f6',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => setFactsExpanded(prev => !prev)}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    📋 참고 사실관계
                  </span>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{factsExpanded ? '접기 ▲' : '펼치기 ▼'}</span>
                </div>
                {factsExpanded && (
                  <div
                    style={{
                      padding: '14px',
                      fontSize: 13,
                      lineHeight: 1.8,
                      color: '#374151',
                      backgroundColor: '#fafafa',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {assignedCase.key_facts}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn-gray" onClick={onBack}>
            이전
          </button>
          <button
            className="btn-navy"
            onClick={onNext}
            disabled={!data.caseCategory && !data.caseName}
            style={{
              opacity: !data.caseCategory && !data.caseName ? 0.4 : 1,
              cursor: !data.caseCategory && !data.caseName ? 'not-allowed' : 'pointer',
            }}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  )
}
