'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MockBar from '@/components/layout/MockBar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { HARDCODED_ACCOUNTS } from '@/lib/auth'
import type { SampleCase, Assignment, PracticeRecord } from '@/types'

type Panel = 'dashboard' | 'accounts' | 'cases' | 'assign' | 'records' | 'settings'

const PANEL_ITEMS: { key: Panel; icon: string; label: string }[] = [
  { key: 'dashboard', icon: '📊', label: '대시보드' },
  { key: 'accounts', icon: '👥', label: '계정 관리' },
  { key: 'cases', icon: '📋', label: '사건 관리' },
  { key: 'assign', icon: '🎯', label: '학생 배정' },
  { key: 'records', icon: '📈', label: '실습 현황' },
  { key: 'settings', icon: '⚙', label: '설정' },
]

const STUDENT_IDS = Object.entries(HARDCODED_ACCOUNTS)
  .filter(([, v]) => v.role === 'student')
  .map(([id]) => id)

const COURT_OPTIONS = ['서울중앙지방법원', '서울동부지방법원', '서울서부지방법원', '서울남부지방법원', '서울북부지방법원', '수원지방법원', '인천지방법원', '부산지방법원']
const CASE_TYPE_OPTIONS = ['대여금', '손해배상', '매매대금', '임금', '부당이득금', '소유권이전등기', '기타']

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: '#1a3a6b', color: '#fff', padding: '12px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
      ✅ {message}
    </div>
  )
}

export default function AdminPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [activePanel, setActivePanel] = useState<Panel>('dashboard')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/')
  }, [user, loading, router])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#0067c2', fontSize: 18 }}>로딩 중...</span>
      </div>
    )
  }
  if (!user || user.role !== 'admin') return null

  function showToast(msg: string) {
    setToast(msg)
  }

  // ─────────────────────────────────────────────
  // Dashboard Panel
  // ─────────────────────────────────────────────
  function DashboardPanel() {
    const [stats, setStats] = useState({
      practiceCount: 0,
      avgScore: 0,
      weekCount: 0,
      assignmentCount: 0,
      loaded: false,
    })

    useEffect(() => {
      async function load() {
        const monday = new Date()
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
        monday.setHours(0, 0, 0, 0)

        const [prRes, assignRes] = await Promise.all([
          supabase.from('practice_records').select('score, created_at'),
          supabase.from('assignments').select('id', { count: 'exact', head: true }),
        ])

        const records = prRes.data || []
        const total = records.length
        const avg = total > 0 ? Math.round(records.reduce((s: number, r: { score: number }) => s + r.score, 0) / total) : 0
        const week = records.filter((r: { created_at: string }) => new Date(r.created_at) >= monday).length

        setStats({
          practiceCount: total,
          avgScore: avg,
          weekCount: week,
          assignmentCount: assignRes.count || 0,
          loaded: true,
        })
      }
      load()
    }, [])

    const totalAccounts = Object.keys(HARDCODED_ACCOUNTS).length
    const studentCount = STUDENT_IDS.length

    const cards = [
      { label: '전체 계정', value: totalAccounts, color: '#1a3a6b', bg: '#eef2fb' },
      { label: '실습생 수', value: studentCount, color: '#0067c2', bg: '#dbeafe' },
      { label: '총 실습기록', value: stats.loaded ? stats.practiceCount : '-', color: '#7c3aed', bg: '#f3e8ff' },
      { label: '평균 점수', value: stats.loaded ? `${stats.avgScore}점` : '-', color: '#16a34a', bg: '#dcfce7' },
      { label: '이번 주 제출', value: stats.loaded ? stats.weekCount : '-', color: '#d97706', bg: '#fef3c7' },
      { label: '배정된 사건', value: stats.loaded ? stats.assignmentCount : '-', color: '#dc2626', bg: '#fee2e2' },
    ]

    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', marginBottom: 20 }}>📊 대시보드</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          {cards.map(c => (
            <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.color}22`, borderRadius: 10, padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 6 }}>{c.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#fffbf0', border: '1px solid #f0e0b0', borderRadius: 8, padding: '16px 20px', color: '#7c5800' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ 실습 모드 안내</div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>
            본 시스템은 <strong>전자소송 실습 전용 모의 플랫폼</strong>입니다. 실제 법원 접수 시스템과 무관하며, 작성된 소장 및 제출 내용은 법적 효력이 없습니다.<br />
            실습생이 소장을 제출하면 AI가 자동으로 채점하고 피드백을 제공합니다. 관리자는 사건을 배정하고 실습 현황을 모니터링할 수 있습니다.
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Account Management Panel
  // ─────────────────────────────────────────────
  function AccountsPanel() {
    const [search, setSearch] = useState('')
    const allEntries = Object.entries(HARDCODED_ACCOUNTS)
    const filtered = allEntries.filter(([id, acc]) =>
      id.includes(search) || acc.name.includes(search) || acc.org.includes(search)
    )

    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', marginBottom: 16 }}>👥 계정 관리</h2>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="이름 또는 아이디로 검색..."
          style={{ width: '100%', padding: '9px 14px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13, marginBottom: 16, boxSizing: 'border-box' }}
        />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#1a3a6b', color: '#fff' }}>
                {['아이디', '이름', '소속', '역할', '이메일', '상태'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(([id, acc], i) => (
                <tr key={id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fb', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '9px 14px', fontFamily: 'monospace', color: '#0067c2', fontWeight: 600 }}>{id}</td>
                  <td style={{ padding: '9px 14px', fontWeight: 600 }}>{acc.name}</td>
                  <td style={{ padding: '9px 14px', color: '#555' }}>{acc.org}</td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: acc.role === 'admin' ? '#fee2e2' : '#dbeafe',
                      color: acc.role === 'admin' ? '#dc2626' : '#1d4ed8',
                    }}>
                      {acc.role === 'admin' ? '관리자' : '학생'}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', color: '#555' }}>{acc.email}</td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>● 활성</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Cases Management Panel
  // ─────────────────────────────────────────────
  function CasesPanel() {
    const [cases, setCases] = useState<SampleCase[]>([])
    const [casesLoading, setCasesLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
      title: '', case_type: '대여금', court: '서울중앙지방법원',
      plaintiff: '', defendant: '', claim_amount: '',
      description: '', facts: '', difficulty: '보통',
    })

    const fetchCases = useCallback(async () => {
      setCasesLoading(true)
      const { data } = await supabase.from('sample_cases').select('*').order('created_at', { ascending: false })
      setCases(data || [])
      setCasesLoading(false)
    }, [])

    useEffect(() => { fetchCases() }, [fetchCases])

    async function handleSave() {
      if (!form.title || !form.plaintiff || !form.defendant) {
        alert('제목, 원고, 피고는 필수입니다.')
        return
      }
      setSaving(true)
      const { error } = await supabase.from('sample_cases').insert({
        title: form.title,
        case_type: form.case_type,
        court: form.court,
        plaintiff: form.plaintiff,
        defendant: form.defendant,
        claim_amount: form.claim_amount ? Number(form.claim_amount) : null,
        description: form.description || null,
        facts: form.facts || null,
        difficulty: form.difficulty,
        created_at: new Date().toISOString(),
      })
      setSaving(false)
      if (error) { alert('저장 실패: ' + error.message); return }
      setShowModal(false)
      setForm({ title: '', case_type: '대여금', court: '서울중앙지방법원', plaintiff: '', defendant: '', claim_amount: '', description: '', facts: '', difficulty: '보통' })
      fetchCases()
      showToast('사건이 추가되었습니다.')
    }

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', margin: 0 }}>📋 사건 관리</h2>
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: '8px 18px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            + 새 사건 추가
          </button>
        </div>

        {casesLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#0067c2' }}>로딩 중...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#1a3a6b', color: '#fff' }}>
                  {['제목', '유형', '법원', '원고', '피고', '난이도', '생성일'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#999' }}>등록된 사건이 없습니다.</td></tr>
                ) : cases.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fb', borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1a3a6b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                    <td style={{ padding: '9px 12px' }}><span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{c.case_type}</span></td>
                    <td style={{ padding: '9px 12px', color: '#555', whiteSpace: 'nowrap' }}>{c.court}</td>
                    <td style={{ padding: '9px 12px' }}>{c.plaintiff}</td>
                    <td style={{ padding: '9px 12px' }}>{c.defendant}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ color: c.difficulty === '어려움' ? '#dc2626' : c.difficulty === '쉬움' ? '#16a34a' : '#d97706', fontWeight: 600, fontSize: 12 }}>
                        {c.difficulty || '보통'}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', color: '#888', whiteSpace: 'nowrap' }}>{c.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Case Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 12, width: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,.25)' }}>
              <div style={{ background: '#1a3a6b', color: '#fff', padding: '14px 20px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>새 사건 추가</span>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: '제목 *', key: 'title', type: 'text' },
                  { label: '원고 *', key: 'plaintiff', type: 'text' },
                  { label: '피고 *', key: 'defendant', type: 'text' },
                  { label: '청구금액 (원)', key: 'claim_amount', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input
                      type={f.type}
                      value={(form as Record<string, string>)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>사건유형</label>
                  <select value={form.case_type} onChange={e => setForm(prev => ({ ...prev, case_type: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13 }}>
                    {CASE_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>법원</label>
                  <select value={form.court} onChange={e => setForm(prev => ({ ...prev, court: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13 }}>
                    {COURT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>난이도</label>
                  <select value={form.difficulty} onChange={e => setForm(prev => ({ ...prev, difficulty: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13 }}>
                    {['쉬움', '보통', '어려움'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>사건개요</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>사실관계</label>
                  <textarea
                    value={form.facts}
                    onChange={e => setForm(prev => ({ ...prev, facts: e.target.value }))}
                    rows={4}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', background: '#f5f5f5', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>취소</button>
                  <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? '저장 중...' : '저장하기'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Assignment Panel
  // ─────────────────────────────────────────────
  function AssignPanel() {
    const [cases, setCases] = useState<SampleCase[]>([])
    const [selectedCase, setSelectedCase] = useState<string>('')
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
    const [assigning, setAssigning] = useState(false)
    const [currentAssignments, setCurrentAssignments] = useState<(Assignment & { sample_cases?: SampleCase })[]>([])
    const [assignLoading, setAssignLoading] = useState(true)

    const fetchData = useCallback(async () => {
      setAssignLoading(true)
      const [caseRes, assignRes] = await Promise.all([
        supabase.from('sample_cases').select('*').order('created_at', { ascending: false }),
        supabase.from('assignments').select('*,sample_cases(*)').order('assigned_at', { ascending: false }),
      ])
      setCases(caseRes.data || [])
      setCurrentAssignments(assignRes.data || [])
      setAssignLoading(false)
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    function toggleStudent(id: string) {
      setSelectedStudents(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    function toggleAll() {
      if (selectedStudents.size === STUDENT_IDS.length) setSelectedStudents(new Set())
      else setSelectedStudents(new Set(STUDENT_IDS))
    }

    async function handleAssign() {
      if (!selectedCase) { alert('사건을 선택해주세요.'); return }
      if (selectedStudents.size === 0) { alert('학생을 선택해주세요.'); return }
      setAssigning(true)
      const rows = Array.from(selectedStudents).map(sid => ({
        case_id: selectedCase,
        student_id: sid,
        assigned_at: new Date().toISOString(),
        status: 'pending',
      }))
      const { error } = await supabase.from('assignments').insert(rows)
      setAssigning(false)
      if (error) { alert('배정 실패: ' + error.message); return }
      showToast(`${selectedStudents.size}명에게 배정 완료!`)
      setSelectedStudents(new Set())
      setSelectedCase('')
      fetchData()
    }

    // Group assignments by student
    const assignByStudent: Record<string, typeof currentAssignments> = {}
    currentAssignments.forEach(a => {
      if (!assignByStudent[a.student_id]) assignByStudent[a.student_id] = []
      assignByStudent[a.student_id].push(a)
    })

    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', marginBottom: 20 }}>🎯 학생 배정</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          {/* 사건 선택 */}
          <div style={{ border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: '#1a3a6b', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>1. 사건 선택</div>
            <div style={{ padding: 16 }}>
              <select
                value={selectedCase}
                onChange={e => setSelectedCase(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #d0d8e8', borderRadius: 6, fontSize: 13 }}
              >
                <option value="">-- 사건을 선택하세요 --</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.case_type})</option>
                ))}
              </select>
              {selectedCase && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: '#f0f6ff', border: '1px solid #c8d8f0', borderRadius: 6, fontSize: 12, color: '#1a3a6b' }}>
                  {(() => {
                    const sc = cases.find(c => c.id === selectedCase)
                    return sc ? `${sc.plaintiff} vs ${sc.defendant} | ${sc.court}` : ''
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* 학생 선택 */}
          <div style={{ border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: '#1a3a6b', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>2. 학생 선택</div>
            <div style={{ padding: '10px 16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#0067c2', marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedStudents.size === STUDENT_IDS.length} onChange={toggleAll} />
                전체 선택/해제
              </label>
              <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {STUDENT_IDS.map(id => {
                  const acc = HARDCODED_ACCOUNTS[id]
                  return (
                    <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '3px 0' }}>
                      <input type="checkbox" checked={selectedStudents.has(id)} onChange={() => toggleStudent(id)} />
                      <span style={{ fontWeight: 600, color: '#1a3a6b' }}>{acc.name}</span>
                      <span style={{ fontSize: 11, color: '#888' }}>({id})</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleAssign}
          disabled={assigning}
          style={{ display: 'block', width: '100%', padding: '12px', background: assigning ? '#999' : 'linear-gradient(90deg,#1a3a6b,#2952a3)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: assigning ? 'not-allowed' : 'pointer', marginBottom: 28 }}
        >
          {assigning ? '배정 중...' : `🎯 ${selectedStudents.size}명에게 배정하기`}
        </button>

        {/* Current assignments table */}
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3a6b', marginBottom: 12 }}>현재 배정 현황</h3>
        {assignLoading ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>로딩 중...</div>
        ) : Object.keys(assignByStudent).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#999', border: '1px solid #eee', borderRadius: 8 }}>배정된 사건이 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(assignByStudent).map(([sid, asgns]) => {
              const acc = HARDCODED_ACCOUNTS[sid]
              return (
                <div key={sid} style={{ border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ background: '#f0f4fc', padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#1a3a6b', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{acc?.name || sid}</span>
                    <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>({sid}) — {asgns.length}건</span>
                  </div>
                  <div style={{ padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {asgns.map(a => (
                      <span key={a.id} style={{ fontSize: 12, background: '#e8f0fc', color: '#1a3a6b', padding: '3px 10px', borderRadius: 20 }}>
                        {(a.sample_cases as SampleCase | undefined)?.title || a.case_id}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Practice Records Panel
  // ─────────────────────────────────────────────
  function RecordsPanel() {
    const [records, setRecords] = useState<PracticeRecord[]>([])
    const [recLoading, setRecLoading] = useState(true)
    const [selectedStudent, setSelectedStudent] = useState<string | null>(null)

    useEffect(() => {
      async function load() {
        setRecLoading(true)
        const { data } = await supabase.from('practice_records').select('*').order('created_at', { ascending: false })
        setRecords(data || [])
        setRecLoading(false)
      }
      load()
    }, [])

    // Group by student
    const byStudent: Record<string, PracticeRecord[]> = {}
    records.forEach(r => {
      if (!byStudent[r.student_id]) byStudent[r.student_id] = []
      byStudent[r.student_id].push(r)
    })

    const studentSummaries = STUDENT_IDS.map(id => {
      const recs = byStudent[id] || []
      const count = recs.length
      const avg = count > 0 ? Math.round(recs.reduce((s, r) => s + r.score, 0) / count) : 0
      const best = count > 0 ? Math.max(...recs.map(r => r.score)) : 0
      const acc = HARDCODED_ACCOUNTS[id]
      return { id, name: acc?.name || id, count, avg, best, recs }
    }).filter(s => s.count > 0)

    const selectedRecs = selectedStudent ? byStudent[selectedStudent] || [] : []
    const selectedAcc = selectedStudent ? HARDCODED_ACCOUNTS[selectedStudent] : null

    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', marginBottom: 20 }}>📈 실습 현황</h2>

        {recLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#0067c2' }}>로딩 중...</div>
        ) : studentSummaries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>제출된 실습기록이 없습니다.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 24 }}>
              {studentSummaries.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelectedStudent(selectedStudent === s.id ? null : s.id)}
                  style={{
                    border: `2px solid ${selectedStudent === s.id ? '#0067c2' : '#d0d8e8'}`,
                    borderRadius: 10,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    background: selectedStudent === s.id ? '#eef2fb' : '#fff',
                    transition: 'all .15s',
                    boxShadow: selectedStudent === s.id ? '0 2px 10px rgba(0,103,194,.15)' : 'none',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3a6b', marginBottom: 6 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{s.id}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0067c2' }}>{s.count}</div>
                      <div style={{ fontSize: 10, color: '#999' }}>제출</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: s.avg >= 75 ? '#16a34a' : s.avg >= 60 ? '#d97706' : '#dc2626' }}>{s.avg}</div>
                      <div style={{ fontSize: 10, color: '#999' }}>평균</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed' }}>{s.best}</div>
                      <div style={{ fontSize: 10, color: '#999' }}>최고</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedStudent && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3a6b', marginBottom: 12 }}>
                  {selectedAcc?.name} ({selectedStudent}) 상세 기록
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#1a3a6b', color: '#fff' }}>
                        {['점수', '사건유형', '법원', '원고', '피고', 'AI 피드백', '제출일'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecs.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fb', borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '9px 12px' }}>
                            <span style={{
                              display: 'inline-block', padding: '2px 10px', borderRadius: 6, fontWeight: 700, fontSize: 13,
                              background: r.score >= 90 ? '#dcfce7' : r.score >= 75 ? '#dbeafe' : r.score >= 60 ? '#fef3c7' : '#fee2e2',
                              color: r.score >= 90 ? '#16a34a' : r.score >= 75 ? '#2563eb' : r.score >= 60 ? '#d97706' : '#dc2626',
                            }}>
                              {r.score}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px' }}>{r.case_type || '-'}</td>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{r.court || '-'}</td>
                          <td style={{ padding: '9px 12px' }}>{r.plaintiff || '-'}</td>
                          <td style={{ padding: '9px 12px' }}>{r.defendant || '-'}</td>
                          <td style={{ padding: '9px 12px', maxWidth: 200 }}>
                            <span style={{ fontSize: 12, color: '#555', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {r.feedback || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: '#888' }}>{r.created_at?.slice(0, 10)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Settings Panel
  // ─────────────────────────────────────────────
  function SettingsPanel() {
    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', marginBottom: 20 }}>⚙ 설정</h2>
        <div style={{ background: '#f8f9fb', border: '1px solid #d0d8e8', borderRadius: 8, padding: '24px', color: '#555', fontSize: 14, lineHeight: 1.8 }}>
          <p>🔧 시스템 설정 기능은 준비 중입니다.</p>
          <p>현재 모든 계정은 하드코딩된 계정을 사용하며, 데이터베이스 연동은 Supabase를 통해 이루어집니다.</p>
        </div>
      </div>
    )
  }

  function renderPanel() {
    switch (activePanel) {
      case 'dashboard': return <DashboardPanel />
      case 'accounts': return <AccountsPanel />
      case 'cases': return <CasesPanel />
      case 'assign': return <AssignPanel />
      case 'records': return <RecordsPanel />
      case 'settings': return <SettingsPanel />
      default: return <DashboardPanel />
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f7', display: 'flex', flexDirection: 'column' }}>
      <MockBar />

      {/* Admin header */}
      <div style={{ background: 'linear-gradient(90deg,#0d2244,#1a3a6b)', color: '#fff', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>⚖ 전자소송 실습 관리자</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>{user.name} 관리자</span>
          <button
            onClick={() => { logout(); router.push('/') }}
            style={{ padding: '5px 14px', background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Layout */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left sidebar */}
        <aside style={{ width: 220, flexShrink: 0, background: '#0d2244', display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
          {PANEL_ITEMS.map(item => (
            <div
              key={item.key}
              onClick={() => setActivePanel(item.key)}
              style={{
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: activePanel === item.key ? '#fff' : 'rgba(255,255,255,.6)',
                background: activePanel === item.key ? 'rgba(255,255,255,.12)' : 'transparent',
                borderLeft: activePanel === item.key ? '3px solid #b8922a' : '3px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all .15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </div>
          ))}

          <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', lineHeight: 1.6 }}>
              전자소송 실습 관리자<br />
              실습 전용 시스템
            </div>
          </div>
        </aside>

        {/* Content area */}
        <main style={{ flex: 1, padding: 28, overflowY: 'auto', minWidth: 0 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,.07)', minHeight: 500 }}>
            {renderPanel()}
          </div>
        </main>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
