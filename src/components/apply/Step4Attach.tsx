'use client'

import { useState } from 'react'
import { ComplaintFormData, Evidence } from '@/types'

interface Step4AttachProps {
  data: ComplaintFormData
  onChange: (d: ComplaintFormData) => void
  onNext: () => void
  onBack: () => void
  evidencePrefix?: string
}

const emptyForm = () => ({ name: '', purpose: '' })

export default function Step4Attach({ data, onChange, onNext, onBack, evidencePrefix = '갑' }: Step4AttachProps) {
  const [form, setForm] = useState(emptyForm())

  const nextNumber = `${evidencePrefix} 제${data.evidences.length + 1}호증`

  const handleAdd = () => {
    if (!form.name.trim()) {
      alert('서류명을 입력해주세요.')
      return
    }
    const newEvidence: Evidence = {
      id: crypto.randomUUID(),
      number: nextNumber,
      name: form.name.trim(),
      purpose: form.purpose.trim(),
    }
    onChange({ ...data, evidences: [...data.evidences, newEvidence] })
    setForm(emptyForm())
  }

  const handleDelete = (id: string) => {
    const filtered = data.evidences.filter(e => e.id !== id)
    // Re-number remaining evidences
    const renumbered = filtered.map((e, i) => ({ ...e, number: `${evidencePrefix} 제${i + 1}호증` }))
    onChange({ ...data, evidences: renumbered })
  }

  const inp: React.CSSProperties = {
    padding: '7px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <div>
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-ttl">입증서류 첨부</span>
        </div>

        {/* Add form */}
        <div
          style={{
            border: '1.5px solid #1e3a5f',
            borderRadius: 8,
            padding: '20px',
            backgroundColor: '#f8fafc',
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e3a5f', marginBottom: 14 }}>
            서증 추가
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                서증번호
              </label>
              <input
                type="text"
                value={nextNumber}
                readOnly
                style={{ ...inp, backgroundColor: '#e5e7eb', color: '#6b7280', cursor: 'not-allowed' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                서류명 <span className="req">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="예: 차용증, 계약서 사본"
                style={inp}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                입증취지
              </label>
              <input
                type="text"
                value={form.purpose}
                onChange={e => setForm({ ...form, purpose: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="예: 금전 차용 사실"
                style={inp}
              />
            </div>
            <button
              className="btn-navy"
              onClick={handleAdd}
              style={{ padding: '7px 20px', whiteSpace: 'nowrap' }}
            >
              추가
            </button>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: '#9ca3af' }}>
            * 실제 파일 업로드는 최종 제출 단계에서 진행됩니다. 여기서는 서류 목록만 등록합니다.
          </p>
        </div>

        {/* Evidence table */}
        {data.evidences.length > 0 ? (
          <table className="ftbl" style={{ marginBottom: 28 }}>
            <thead>
              <tr>
                <th style={{ width: 130 }}>서증번호</th>
                <th>서류명</th>
                <th>입증취지</th>
                <th style={{ width: 60 }}>삭제</th>
              </tr>
            </thead>
            <tbody>
              {data.evidences.map((ev, i) => (
                <tr key={ev.id}>
                  <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 13 }}>{ev.number}</td>
                  <td>{ev.name}</td>
                  <td style={{ fontSize: 13, color: '#4b5563' }}>{ev.purpose || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => handleDelete(ev.id)}
                      title="삭제"
                      style={{
                        padding: '3px 10px',
                        fontSize: 12,
                        border: '1px solid #ef4444',
                        borderRadius: 4,
                        background: '#fff',
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div
            style={{
              padding: '32px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: 14,
              border: '1px dashed #d1d5db',
              borderRadius: 6,
              marginBottom: 28,
            }}
          >
            등록된 서증이 없습니다. 위에서 서류를 추가해주세요.
            <br />
            <span style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              (입증서류 없이 제출하는 것도 가능합니다.)
            </span>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn-gray" onClick={onBack}>
            이전
          </button>
          <button className="btn-navy" onClick={onNext}>
            다음
          </button>
        </div>
      </div>
    </div>
  )
}
