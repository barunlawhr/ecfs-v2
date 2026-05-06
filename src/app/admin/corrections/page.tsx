'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { buildNameMap } from '@/lib/accounts'

const TEAL = '#00a99d'
const NAVY = '#1a3a6b'

interface PracticeCase {
  id: string
  case_number: string
  case_name: string
}

interface CaseAssignment {
  student_id: string
}

interface CorrectionOrder {
  id: string
  case_id: string
  student_id: string
  order_number: string
  order_date: string
  deadline: string
  order_content: string
  order_type: string
  status: string
  created_at: string
  practice_cases?: { case_number: string; case_name: string }
}

export default function AdminCorrectionsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [cases, setCases] = useState<PracticeCase[]>([])
  const [assignments, setAssignments] = useState<CaseAssignment[]>([])
  const [nameMap, setNameMap] = useState<Record<string, string>>({})
  const [orders, setOrders] = useState<CorrectionOrder[]>([])

  const [caseId, setCaseId] = useState('')
  const [checkedStudents, setCheckedStudents] = useState<Set<string>>(new Set())
  const [orderNumber, setOrderNumber] = useState('')
  const [orderDate, setOrderDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [orderContent, setOrderContent] = useState('')
  const [orderType, setOrderType] = useState('general')
  const [submitting, setSubmitting] = useState(false)

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Load cases + name map + all student ids
  useEffect(() => {
    ;(async () => {
      const [{ data }, nm] = await Promise.all([
        supabase.from('practice_cases').select('id, case_number, case_name').order('created_at', { ascending: false }),
        buildNameMap(),
      ])
      if (data) setCases(data)
      setNameMap(nm)
    })()
  }, [])

  // Load assignments when case changes
  useEffect(() => {
    if (!caseId) { setAssignments([]); return }
    ;(async () => {
      const { data } = await supabase.from('case_assignments').select('student_id').eq('case_id', caseId)
      if (data) setAssignments(data)
    })()
  }, [caseId])

  // Load orders
  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('correction_orders')
      .select('*, practice_cases(case_number, case_name)')
      .order('created_at', { ascending: false })
    if (data) setOrders(data as CorrectionOrder[])
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleSubmit = async () => {
    if (!caseId || checkedStudents.size === 0 || !orderNumber || !orderDate || !deadline || !orderContent) {
      alert('모든 필드를 입력해주세요.')
      return
    }
    setSubmitting(true)
    const targets = [...checkedStudents]

    const rows = targets.map(sid => ({
      case_id: caseId,
      student_id: sid,
      order_number: orderNumber,
      order_date: orderDate,
      deadline,
      order_content: orderContent,
      order_type: orderType,
      status: 'pending',
    }))
    const { error } = await supabase.from('correction_orders').insert(rows)
    if (error) {
      alert('등록 실패: ' + error.message)
    } else {
      setOrderNumber('')
      setOrderDate('')
      setDeadline('')
      setOrderContent('')
      setOrderType('general')
      fetchOrders()
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('correction_orders').delete().eq('id', id)
    fetchOrders()
  }

  if (authLoading || !user) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>로딩 중...</div>

  const inp: React.CSSProperties = { height: 32, border: '1px solid #c8cdd6', borderRadius: 3, padding: '0 10px', fontSize: 13, width: '100%', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 4, display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', fontFamily: "'Malgun Gothic', sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: NAVY, color: '#fff', padding: '8px 20px', fontSize: 12, textAlign: 'center', fontWeight: 700 }}>
        관리자 모드
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ marginBottom: 16 }}>
          <span onClick={() => router.push('/admin')} style={{ fontSize: 13, color: NAVY, cursor: 'pointer', fontWeight: 600 }}>
            &larr; 관리자 홈
          </span>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 20 }}>보정명령 관리</h1>

        {/* Form */}
        <div style={{ background: '#fff', border: '1px solid #d8dce8', borderRadius: 6, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={lbl}>사건 선택</label>
              <select value={caseId} onChange={e => setCaseId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="">-- 사건 선택 --</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.case_number} {c.case_name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>학생 선택</label>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  {assignments.length > 0 && (
                    <label style={{ fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontWeight:700, color:NAVY }}>
                      <input type="checkbox" checked={checkedStudents.size === assignments.length && assignments.length > 0}
                        onChange={e => setCheckedStudents(e.target.checked ? new Set(assignments.map(a=>a.student_id)) : new Set())}
                        style={{ accentColor:NAVY }} />
                      전체 선택
                    </label>
                  )}
                  {checkedStudents.size > 0 && <span style={{ fontSize:11, color:'#e53e3e', fontWeight:700 }}>{checkedStudents.size}명 선택됨</span>}
                </div>
                {assignments.length === 0 ? (
                  <p style={{ fontSize:12, color:'#999' }}>사건을 먼저 선택하세요</p>
                ) : (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 14px', padding:'6px 10px', background:'#fff', border:'1px solid #dde0e8', borderRadius:4 }}>
                    {assignments.map(a => (
                      <label key={a.student_id} style={{ fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                        <input type="checkbox" checked={checkedStudents.has(a.student_id)}
                          onChange={e => { const n = new Set(checkedStudents); e.target.checked ? n.add(a.student_id) : n.delete(a.student_id); setCheckedStudents(n) }}
                          style={{ accentColor:NAVY }} />
                        {nameMap[a.student_id] || a.student_id}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label style={lbl}>보정명령번호</label>
              <input type="text" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="예: 보정명령 제1호" style={inp} />
            </div>
            <div>
              <label style={lbl}>명령일자</label>
              <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>보정기한</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>보정유형</label>
              <div style={{ display: 'flex', gap: 16, paddingTop: 6 }}>
                <label style={{ fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="radio" name="orderType" value="general" checked={orderType === 'general'} onChange={() => setOrderType('general')} style={{ accentColor: TEAL }} />
                  일반보정
                </label>
                <label style={{ fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="radio" name="orderType" value="address" checked={orderType === 'address'} onChange={() => setOrderType('address')} style={{ accentColor: TEAL }} />
                  주소보정
                </label>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={lbl}>명령내용</label>
            <textarea value={orderContent} onChange={e => setOrderContent(e.target.value)} placeholder="보정명령 내용을 입력하세요..." style={{ ...inp, height: 80, padding: '8px 10px', resize: 'vertical' }} />
          </div>
          <div style={{ textAlign: 'right', marginTop: 14 }}>
            <button onClick={handleSubmit} disabled={submitting} style={{ height: 34, padding: '0 28px', background: submitting ? '#aaa' : TEAL, color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #d8dce8', borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f0f3f8' }}>
                {['사건번호', '학생', '명령번호', '기한', '유형', '상태', '삭제'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', fontWeight: 700, borderBottom: '2px solid #003366', textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#888' }}>등록된 보정명령이 없습니다.</td></tr>
              )}
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>{o.practice_cases?.case_number || '-'}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>{nameMap[o.student_id] || o.student_id}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>{o.order_number}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>{o.deadline}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>{o.order_type === 'address' ? '주소보정' : '일반보정'}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    {o.status === 'pending' ? (
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 10, background: '#fff5f5', color: '#e53e3e', fontSize: 11, fontWeight: 700, border: '1px solid #feb2b2' }}>미보정</span>
                    ) : (
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 10, background: '#f0fff4', color: '#38a169', fontSize: 11, fontWeight: 700, border: '1px solid #9ae6b4' }}>보정완료</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <button onClick={() => handleDelete(o.id)} style={{ padding: '3px 10px', fontSize: 11, background: '#fff', border: '1px solid #e53e3e', color: '#e53e3e', borderRadius: 3, cursor: 'pointer' }}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
