'use client'

import { useEffect, useState } from 'react'
import { ComplaintFormData, Party, SampleCase } from '@/types'

interface Step2PartiesProps {
  data: ComplaintFormData
  onChange: (d: ComplaintFormData) => void
  onNext: () => void
  onBack: () => void
  assignedCase?: SampleCase
  defaultRole?: '원고' | '피고'
}

export default function Step2Parties({ data, onChange, onNext, onBack, assignedCase, defaultRole = '원고' }: Step2PartiesProps) {
  const emptyForm = (): Omit<Party, 'id'> => ({
    role: defaultRole,
    name: '',
    addr: '',
    tel: '',
    isCompany: false,
  })
  const [form, setForm] = useState<Omit<Party, 'id'>>(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)

  // Auto-populate from assignedCase on mount
  useEffect(() => {
    if (assignedCase && data.parties.length === 0) {
      const initial: Party[] = []
      if (assignedCase.plaintiff) {
        initial.push({
          id: crypto.randomUUID(),
          role: '원고',
          name: assignedCase.plaintiff,
          addr: '',
          tel: '',
        })
      }
      if (assignedCase.defendant) {
        initial.push({
          id: crypto.randomUUID(),
          role: '피고',
          name: assignedCase.defendant,
          addr: '',
          tel: '',
        })
      }
      if (initial.length > 0) {
        onChange({ ...data, parties: initial })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedCase])

  const handleAdd = () => {
    if (!form.name.trim() || !form.addr.trim()) {
      alert('이름과 주소를 입력해주세요.')
      return
    }
    if (editingId) {
      // Update existing
      onChange({
        ...data,
        parties: data.parties.map(p =>
          p.id === editingId ? { ...form, id: editingId } : p
        ),
      })
      setEditingId(null)
    } else {
      // Add new
      const newParty: Party = { ...form, id: crypto.randomUUID() }
      onChange({ ...data, parties: [...data.parties, newParty] })
    }
    setForm(emptyForm())
  }

  const handleEdit = (party: Party) => {
    setEditingId(party.id)
    setForm({ role: party.role, name: party.name, addr: party.addr, tel: party.tel || '', isCompany: party.isCompany })
  }

  const handleDelete = (id: string) => {
    if (!confirm('해당 당사자를 삭제하시겠습니까?')) return
    onChange({ ...data, parties: data.parties.filter(p => p.id !== id) })
    if (editingId === id) {
      setEditingId(null)
      setForm(emptyForm())
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm())
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
          <span className="sec-ttl">당사자 정보</span>
        </div>

        {/* Existing parties table */}
        {data.parties.length > 0 ? (
          <table className="ftbl" style={{ marginBottom: 24 }}>
            <thead>
              <tr>
                <th style={{ width: 70 }}>구분</th>
                <th>성명 / 상호</th>
                <th>주소</th>
                <th style={{ width: 120 }}>연락처</th>
                <th style={{ width: 100 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {data.parties.map(party => (
                <tr key={party.id} style={{ backgroundColor: editingId === party.id ? '#fefce8' : undefined }}>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{party.role}</td>
                  <td>{party.name}</td>
                  <td style={{ fontSize: 13, color: '#374151' }}>{party.addr || '-'}</td>
                  <td style={{ fontSize: 13 }}>{party.tel || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => handleEdit(party)}
                      style={{
                        marginRight: 4,
                        padding: '3px 10px',
                        fontSize: 12,
                        border: '1px solid #6b7280',
                        borderRadius: 4,
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(party.id)}
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
              padding: '24px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: 14,
              border: '1px dashed #d1d5db',
              borderRadius: 6,
              marginBottom: 24,
            }}
          >
            등록된 당사자가 없습니다. 아래에서 당사자를 추가해주세요.
          </div>
        )}

        {/* Add / Edit form */}
        <div
          style={{
            border: `1.5px solid ${editingId ? '#ca8a04' : '#1e3a5f'}`,
            borderRadius: 8,
            padding: '20px',
            backgroundColor: editingId ? '#fefce8' : '#f8fafc',
            marginBottom: 28,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: editingId ? '#92400e' : '#1e3a5f',
              marginBottom: 14,
            }}
          >
            {editingId ? '당사자 수정' : '당사자 추가'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr 1.5fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                구분 <span className="req">*</span>
              </label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value as '원고' | '피고' })}
                style={inp}
              >
                <option value="원고">원고</option>
                <option value="피고">피고</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                성명 / 상호 <span className="req">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="홍길동"
                style={inp}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                주소 <span className="req">*</span>
              </label>
              <input
                type="text"
                value={form.addr}
                onChange={e => setForm({ ...form, addr: e.target.value })}
                placeholder="서울특별시 ..."
                style={inp}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                연락처
              </label>
              <input
                type="text"
                value={form.tel}
                onChange={e => setForm({ ...form, tel: e.target.value })}
                placeholder="010-0000-0000"
                style={inp}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-navy" onClick={handleAdd} style={{ padding: '8px 20px' }}>
              {editingId ? '수정 완료' : '추가'}
            </button>
            {editingId && (
              <button className="btn-gray" onClick={handleCancelEdit} style={{ padding: '8px 16px' }}>
                취소
              </button>
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
            disabled={data.parties.length === 0}
            style={{ opacity: data.parties.length === 0 ? 0.4 : 1, cursor: data.parties.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  )
}
