'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { fetchStudents, type AccountRow } from '@/lib/accounts'
import StudentPicker from '@/components/admin/StudentPicker'
import { NAVY, TH, TD, SEL } from '@/lib/constants'

interface Submission {
  id: string
  assignment_id: string
  doc_type: string
  submitted_at: string
  rule_score: number | null
  ai_score: number | null
  final_score: number | null
  feedback: string | null
}

interface AssignmentMap {
  [id: string]: {
    student_id: string
    case_id: string
  }
}

interface CaseMap {
  [id: string]: {
    case_number: string
    case_name: string
  }
}

// 동적 로드 (아래 useEffect에서 설정)

function scoreColor(score: number | null): string {
  if (score === null || score === undefined) return '#888'
  if (score >= 90) return '#16a34a'
  if (score >= 70) return '#2563eb'
  if (score >= 50) return '#ea580c'
  return '#dc2626'
}

export default function AdminScoresPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [studentList, setStudentList] = useState<{ id: string; name: string }[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [assignmentMap, setAssignmentMap] = useState<AssignmentMap>({})
  const [caseMap, setCaseMap] = useState<CaseMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStudent, setFilterStudent] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')

    // Fetch submissions
    const { data: subs, error: subErr } = await supabase
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
    if (subErr) { setError(subErr.message); setLoading(false); return }

    // Collect unique assignment_ids
    const assignmentIds = [...new Set((subs || []).map(s => s.assignment_id).filter(Boolean))]

    // Fetch assignments
    let aMap: AssignmentMap = {}
    if (assignmentIds.length > 0) {
      const { data: assignments } = await supabase
        .from('case_assignments')
        .select('id, student_id, case_id')
        .in('id', assignmentIds)
      if (assignments) {
        for (const a of assignments) {
          aMap[a.id] = { student_id: a.student_id, case_id: a.case_id }
        }
      }
    }

    // Collect unique case_ids
    const caseIds = [...new Set(Object.values(aMap).map(a => a.case_id).filter(Boolean))]

    // Fetch cases
    let cMap: CaseMap = {}
    if (caseIds.length > 0) {
      const { data: cases } = await supabase
        .from('practice_cases')
        .select('id, case_number, case_name')
        .in('id', caseIds)
      if (cases) {
        for (const c of cases) {
          cMap[c.id] = { case_number: c.case_number, case_name: c.case_name }
        }
      }
    }

    setSubmissions(subs || [])
    setAssignmentMap(aMap)
    setCaseMap(cMap)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/admin')
      return
    }
    if (!authLoading && user?.role === 'admin') {
      fetchStudents().then(s => setStudentList(s.map(a => ({ id: a.login_id, name: a.name }))))
      fetchData()
    }
  }, [authLoading, user, router, fetchData])

  function getStudentName(studentId: string): string {
    const s = studentList.find(a => a.id === studentId)
    return s ? s.name : studentId
  }

  function getStudentId(sub: Submission): string {
    const a = assignmentMap[sub.assignment_id]
    return a ? a.student_id : '-'
  }

  function getCaseNumber(sub: Submission): string {
    const a = assignmentMap[sub.assignment_id]
    if (!a) return '-'
    const c = caseMap[a.case_id]
    return c ? c.case_number : '-'
  }

  const filteredSubmissions = filterStudent
    ? submissions.filter(s => getStudentId(s) === filterStudent)
    : submissions

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

        <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: '16px 0 20px' }}>채점 현황</h1>

        {error && <div style={{ color: 'red', marginBottom: 12, fontSize: 13 }}>{error}</div>}

        {/* Filter */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>학생 필터:</span>
          <div style={{ width: 220 }}>
            <StudentPicker students={studentList} selected={filterStudent ? new Set([filterStudent]) : new Set()} onChange={s => setFilterStudent(s.size > 0 ? [...s][0] : '')} placeholder="전체" single />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>불러오는 중...</div>
        ) : filteredSubmissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>제출된 서류가 없습니다.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: '1px solid #d0d8e4' }}>
              <thead>
                <tr>
                  {['학생', '사건번호', '서류유형', '제출일', '규칙점수', 'AI점수', '최종점수', '피드백'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((s, i) => {
                  const studentId = getStudentId(s)
                  return (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e0e6ee' }}>
                      <td style={TD}>{getStudentName(studentId)}</td>
                      <td style={TD}>{getCaseNumber(s)}</td>
                      <td style={TD}>{s.doc_type === 'complaint' ? '소장' : s.doc_type === 'answer' ? '답변서' : (s.doc_type || '-')}</td>
                      <td style={TD}>{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('ko-KR') : '-'}</td>
                      <td style={{ ...TD, color: scoreColor(s.rule_score), fontWeight: 700 }}>
                        {s.rule_score !== null && s.rule_score !== undefined ? s.rule_score : '-'}
                      </td>
                      <td style={{ ...TD, color: scoreColor(s.ai_score), fontWeight: 700 }}>
                        {s.ai_score !== null && s.ai_score !== undefined ? s.ai_score : '-'}
                      </td>
                      <td style={{ ...TD, color: scoreColor(s.final_score), fontWeight: 700 }}>
                        {s.final_score !== null && s.final_score !== undefined ? s.final_score : '-'}
                      </td>
                      <td style={{ ...TD, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.feedback || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
