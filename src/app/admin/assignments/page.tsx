'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { HARDCODED_ACCOUNTS } from '@/lib/auth'
import { TEAL, NAVY, TH, TD, INP, SEL } from '@/lib/constants'

interface PracticeCase {
  id: string
  case_number: string
  case_name: string
}

interface CaseAssignment {
  id: string
  case_id: string
  student_id: string
  role: string
  assigned_at: string
  due_date: string | null
  status: string
}

const STUDENT_LIST = Object.entries(HARDCODED_ACCOUNTS)
  .filter(([, acc]) => acc.role === 'student')
  .map(([id, acc]) => ({ id, name: acc.name }))

export default function AdminAssignmentsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [cases, setCases] = useState<PracticeCase[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [assignments, setAssignments] = useState<CaseAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Assignment form
  const [formStudentId, setFormStudentId] = useState(STUDENT_LIST[0]?.id || '')
  const [formRole, setFormRole] = useState('원고측')
  const [formDueDate, setFormDueDate] = useState('')

  const fetchCases = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('practice_cases')
      .select('id, case_number, case_name')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); return }
    setCases(data || [])
    if (data && data.length > 0 && !selectedCaseId) {
      setSelectedCaseId(data[0].id)
    }
  }, [selectedCaseId])

  const fetchAssignments = useCallback(async (caseId: string) => {
    if (!caseId) { setAssignments([]); return }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('case_assignments')
      .select('*')
      .eq('case_id', caseId)
      .order('assigned_at', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setAssignments(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/admin')
      return
    }
    if (!authLoading && user?.role === 'admin') {
      fetchCases().then(() => setLoading(false))
    }
  }, [authLoading, user, router, fetchCases])

  useEffect(() => {
    if (selectedCaseId) fetchAssignments(selectedCaseId)
  }, [selectedCaseId, fetchAssignments])

  async function handleAssign() {
    if (!selectedCaseId || !formStudentId) { alert('사건과 학생을 선택하세요.'); return }
    const payload = {
      case_id: selectedCaseId,
      student_id: formStudentId,
      role: formRole,
      due_date: formDueDate || null,
      status: 'assigned',
    }
    const { error: err } = await supabase.from('case_assignments').insert([payload])
    if (err) { alert('배정 실패: ' + err.message); return }
    fetchAssignments(selectedCaseId)
  }

  async function handleDelete(id: string) {
    if (!confirm('배정을 삭제하시겠습니까?')) return
    const { error: err } = await supabase.from('case_assignments').delete().eq('id', id)
    if (err) { alert('삭제 실패: ' + err.message); return }
    fetchAssignments(selectedCaseId)
  }

  function getStudentName(studentId: string): string {
    const acc = HARDCODED_ACCOUNTS[studentId]
    return acc ? acc.name : studentId
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

        <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: '16px 0 20px' }}>사건 배정 관리</h1>

        {error && <div style={{ color: 'red', marginBottom: 12, fontSize: 13 }}>{error}</div>}

        {/* Case selector */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>사건 선택:</span>
          <select
            style={{ ...SEL, width: 360 }}
            value={selectedCaseId}
            onChange={e => setSelectedCaseId(e.target.value)}
          >
            {cases.length === 0 && <option value="">사건 없음</option>}
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.case_number} - {c.case_name}</option>
            ))}
          </select>
        </div>

        {/* Assignment form */}
        {selectedCaseId && (
          <div style={{ background: '#fff', border: '1px solid #d0d8e4', borderRadius: 6, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14 }}>새 배정</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <label style={labelStyle}>
                학생
                <select style={{ ...SEL, width: 160 }} value={formStudentId} onChange={e => setFormStudentId(e.target.value)}>
                  {STUDENT_LIST.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                역할
                <select style={{ ...SEL, width: 120 }} value={formRole} onChange={e => setFormRole(e.target.value)}>
                  <option value="원고측">원고측</option>
                  <option value="피고측">피고측</option>
                </select>
              </label>

              <label style={labelStyle}>
                마감일
                <input type="date" style={{ ...INP, width: 160 }} value={formDueDate} onChange={e => setFormDueDate(e.target.value)} />
              </label>

              <button
                onClick={handleAssign}
                style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 4, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', height: 28 }}
              >
                배정
              </button>
            </div>
          </div>
        )}

        {/* Assignments table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>불러오는 중...</div>
        ) : assignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>배정된 학생이 없습니다.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: '1px solid #d0d8e4' }}>
              <thead>
                <tr>
                  {['학생ID', '학생이름', '역할', '배정일', '마감일', '상태', '작업'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => (
                  <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e0e6ee' }}>
                    <td style={TD}>{a.student_id}</td>
                    <td style={TD}>{getStudentName(a.student_id)}</td>
                    <td style={TD}>{a.role}</td>
                    <td style={TD}>{a.assigned_at ? new Date(a.assigned_at).toLocaleDateString('ko-KR') : '-'}</td>
                    <td style={TD}>{a.due_date ? new Date(a.due_date).toLocaleDateString('ko-KR') : '-'}</td>
                    <td style={TD}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                        background: a.status === 'completed' ? '#d1fae5' : a.status === 'in_progress' ? '#dbeafe' : '#fef3c7',
                        color: a.status === 'completed' ? '#065f46' : a.status === 'in_progress' ? '#1e40af' : '#92400e',
                      }}>
                        {a.status === 'completed' ? '완료' : a.status === 'in_progress' ? '진행중' : '배정됨'}
                      </span>
                    </td>
                    <td style={TD}>
                      <button onClick={() => handleDelete(a.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
