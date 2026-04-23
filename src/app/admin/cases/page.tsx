'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { COURTS, TEAL, NAVY, TH, TD, INP, SEL } from '@/lib/constants'

interface PracticeCase {
  id: string
  case_number: string
  case_type: string
  case_name: string
  court: string
  division: string
  plaintiff: string
  defendant: string
  sample_complaint: string
  sample_answer: string
  is_active: boolean
  created_at: string
}

const CASE_TYPES = [
  { value: 'civil', label: '민사' },
  { value: 'attachment', label: '가압류/가처분' },
  { value: 'injunction', label: '민사집행' },
  { value: 'family', label: '가사' },
]

const emptyForm: {
  case_number: string
  case_type: string
  case_name: string
  court: string
  division: string
  plaintiff: string
  defendant: string
  sample_complaint: string
  sample_answer: string
  is_active: boolean
} = {
  case_number: '',
  case_type: 'civil',
  case_name: '',
  court: COURTS[0] as string,
  division: '',
  plaintiff: '',
  defendant: '',
  sample_complaint: '',
  sample_answer: '',
  is_active: true,
}

export default function AdminCasesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [cases, setCases] = useState<PracticeCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  const fetchCases = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('practice_cases')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setCases(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/admin')
      return
    }
    if (!authLoading && user?.role === 'admin') fetchCases()
  }, [authLoading, user, router, fetchCases])

  function openAdd() {
    setEditId(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  function openEdit(c: PracticeCase) {
    setEditId(c.id)
    setForm({
      case_number: c.case_number || '',
      case_type: c.case_type || 'civil',
      case_name: c.case_name || '',
      court: c.court || COURTS[0],
      division: c.division || '',
      plaintiff: c.plaintiff || '',
      defendant: c.defendant || '',
      sample_complaint: c.sample_complaint || '',
      sample_answer: c.sample_answer || '',
      is_active: c.is_active ?? true,
    })
    setShowModal(true)
  }

  async function handleSave() {
    const payload = { ...form }
    if (editId) {
      const { error: err } = await supabase.from('practice_cases').update(payload).eq('id', editId)
      if (err) { alert('수정 실패: ' + err.message); return }
    } else {
      const { error: err } = await supabase.from('practice_cases').insert([payload])
      if (err) { alert('추가 실패: ' + err.message); return }
    }
    setShowModal(false)
    fetchCases()
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { error: err } = await supabase.from('practice_cases').delete().eq('id', id)
    if (err) { alert('삭제 실패: ' + err.message); return }
    fetchCases()
  }

  if (authLoading) return <div style={{ padding: 40, textAlign: 'center' }}>로딩 중...</div>
  if (!user || user.role !== 'admin') return null

  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif", background: '#f2f4f7', minHeight: '100vh' }}>
      {/* Top banner */}
      <div style={{ background: NAVY, color: '#fff', textAlign: 'center', padding: '8px 0', fontSize: 13, fontWeight: 700 }}>
        관리자 모드
      </div>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '24px 20px' }}>
        {/* Back link */}
        <a href="/admin" style={{ color: NAVY, fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
          ← 관리자 홈
        </a>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: '16px 0 20px' }}>실습 사건 관리</h1>

        {/* Add button */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={openAdd}
            style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 4, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + 사건 추가
          </button>
        </div>

        {error && <div style={{ color: 'red', marginBottom: 12, fontSize: 13 }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>불러오는 중...</div>
        ) : cases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>등록된 사건이 없습니다.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: '1px solid #d0d8e4' }}>
              <thead>
                <tr>
                  {['사건번호', '유형', '사건명', '법원', '원고', '피고', '활성', '등록일', '작업'].map((h) => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e0e6ee' }}>
                    <td style={TD}>{c.case_number}</td>
                    <td style={TD}>{CASE_TYPES.find(t => t.value === c.case_type)?.label || c.case_type}</td>
                    <td style={TD}>{c.case_name}</td>
                    <td style={TD}>{c.court}</td>
                    <td style={TD}>{c.plaintiff}</td>
                    <td style={TD}>{c.defendant}</td>
                    <td style={TD}>{c.is_active ? '✅' : '❌'}</td>
                    <td style={TD}>{c.created_at ? new Date(c.created_at).toLocaleDateString('ko-KR') : '-'}</td>
                    <td style={TD}>
                      <button onClick={() => openEdit(c)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer', marginRight: 4 }}>수정</button>
                      <button onClick={() => handleDelete(c.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 28, width: 540, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 18 }}>
              {editId ? '사건 수정' : '사건 추가'}
            </h2>

            <div style={{ display: 'grid', gap: 12 }}>
              <label style={labelStyle}>
                사건번호
                <input style={INP} value={form.case_number} onChange={e => setForm({ ...form, case_number: e.target.value })} />
              </label>

              <label style={labelStyle}>
                유형
                <select style={SEL} value={form.case_type} onChange={e => setForm({ ...form, case_type: e.target.value })}>
                  {CASE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>

              <label style={labelStyle}>
                사건명
                <input style={INP} value={form.case_name} onChange={e => setForm({ ...form, case_name: e.target.value })} />
              </label>

              <label style={labelStyle}>
                법원
                <select style={SEL} value={form.court} onChange={e => setForm({ ...form, court: e.target.value })}>
                  {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              <label style={labelStyle}>
                부서
                <input style={INP} value={form.division} onChange={e => setForm({ ...form, division: e.target.value })} />
              </label>

              <label style={labelStyle}>
                원고
                <input style={INP} value={form.plaintiff} onChange={e => setForm({ ...form, plaintiff: e.target.value })} />
              </label>

              <label style={labelStyle}>
                피고
                <input style={INP} value={form.defendant} onChange={e => setForm({ ...form, defendant: e.target.value })} />
              </label>

              <label style={labelStyle}>
                소장 샘플
                <textarea style={{ ...INP, height: 80, padding: '6px 8px' }} value={form.sample_complaint} onChange={e => setForm({ ...form, sample_complaint: e.target.value })} />
              </label>

              <label style={labelStyle}>
                답변서 샘플
                <textarea style={{ ...INP, height: 80, padding: '6px 8px' }} value={form.sample_answer} onChange={e => setForm({ ...form, sample_answer: e.target.value })} />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                활성 상태
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ background: '#e5e7eb', color: '#333', border: 'none', borderRadius: 4, padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={handleSave} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 4, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {editId ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
  color: '#333',
}
