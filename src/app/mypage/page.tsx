'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MockBar from '@/components/layout/MockBar'
import GnbNav from '@/components/layout/GnbNav'
import Footer from '@/components/layout/Footer'
import { useAuth } from '@/context/AuthContext'

const SB_URL = 'https://knpvayujykoqjncctxrr.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtucHZheXVqeWtvcWpuY2N0eHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzA3NDUsImV4cCI6MjA4OTE0Njc0NX0.rXlo5IsOW6FS5N1X3vgqNM1RvzB84TYPqVhnYyc6FSg'
const SB_HDR = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

type ActivePage =
  | 'status'
  | 'active-cases'
  | 'assigned-cases'
  | 'practice-records'
  | 'submitted-docs'
  | 'draft-docs'
  | 'schedule'
  | 'interest-cases'
  | 'confirmed-cases'
  | 'completed-cases'
  | 'pay'
  | 'myinfo-user'
  | 'myinfo-pw'
  | 'generic'

interface Assignment {
  id: number
  student_id: string
  status: string
  assigned_at: string
  sample_cases?: {
    title?: string
    case_type?: string
    court?: string
    plaintiff?: string
    defendant?: string
    claim_amount?: string
    description?: string
    facts?: string
    background?: string
    key_facts?: string
    difficulty?: string
  }
}

interface PracticeRecord {
  id: string
  user_id: string
  user_name?: string
  score: number
  feedback?: string
  case_type?: string
  court?: string
  plaintiff?: string
  defendant?: string
  has_agent?: boolean
  evidence_count?: number
  date_str?: string
  created_at: string
  doc_type?: string
}

const SCHEDULE_ITEMS = [
  { date: '2026-03-25', caseNo: '서울중앙지방법원 2026가단12345', event: '1차 변론기일' },
  { date: '2026-04-10', caseNo: '서울중앙지방법원 2026가단12346', event: '증거조사기일' },
  { date: '2026-05-08', caseNo: '서울중앙지방법원 2026가단12347', event: '2차 변론기일' },
]

function gradeFn(s: number) {
  return s >= 90 ? '🏆 우수' : s >= 70 ? '✅ 양호' : s >= 50 ? '📝 보통' : '⚠️ 미흡'
}
function colorFn(s: number) {
  return s >= 90 ? '#15803d' : s >= 70 ? '#1e40af' : s >= 50 ? '#92400e' : '#991b1b'
}
function bgFn(s: number) {
  return s >= 90 ? '#f0fdf4' : s >= 70 ? '#eff6ff' : s >= 50 ? '#fffbeb' : '#fef2f2'
}

export default function MyPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activePage, setActivePage] = useState<ActivePage>('status')
  const [genericTitle, setGenericTitle] = useState('')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    '나의사건관리': true,
    '사건진행': false,
    '나의문서함': false,
    '납부환급관리': false,
    '기득열람': false,
    '실습전용': true,
    '나의정보관리': false,
  })

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [allCases, setAllCases] = useState<Assignment[]>([])  // B방식: 전체 sample_cases
  const [allCasesLoading, setAllCasesLoading] = useState(false)
  const [practiceRecords, setPracticeRecords] = useState<PracticeRecord[]>([])
  const [practiceLoading, setPracticeLoading] = useState(false)
  const [expandedFeedback, setExpandedFeedback] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!loading && !user) router.push('/')
    if (!loading && user?.role === 'admin') router.push('/admin')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    if (activePage === 'active-cases') fetchAllCases()
    if (activePage === 'assigned-cases' || activePage === 'status') fetchAssignments()
    if (activePage === 'practice-records' || activePage === 'submitted-docs') fetchPracticeRecords()
  }, [activePage, user])

  async function fetchAllCases() {
    setAllCasesLoading(true)
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/sample_cases?select=*&order=created_at.desc`,
        { headers: SB_HDR }
      )
      const data = await res.json()
      // sample_cases를 Assignment 형태로 변환 (id를 그대로 사용)
      const converted: Assignment[] = Array.isArray(data) ? data.map((c: Assignment['sample_cases'] & { id: number; created_at?: string }) => ({
        id: c.id,
        student_id: '',
        status: '진행중',
        assigned_at: c.created_at || new Date().toISOString(),
        sample_cases: c,
      })) : []
      setAllCases(converted)
    } catch {
      setAllCases([])
    }
    setAllCasesLoading(false)
  }

  async function fetchAssignments() {
    if (!user) return
    setAssignmentsLoading(true)
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/assignments?select=*,sample_cases(*)&student_id=eq.${encodeURIComponent(user.id)}&order=assigned_at.desc`,
        { headers: SB_HDR }
      )
      const data = await res.json()
      setAssignments(Array.isArray(data) ? data : [])
    } catch {
      setAssignments([])
    }
    setAssignmentsLoading(false)
  }

  async function fetchPracticeRecords() {
    if (!user) return
    setPracticeLoading(true)
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/practice_records?user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc&limit=50`,
        { headers: SB_HDR }
      )
      const data = await res.json()
      // also merge localStorage backup
      const localKey = 'ec_records_' + user.id
      let local: PracticeRecord[] = []
      try { local = JSON.parse(localStorage.getItem(localKey) || '[]') } catch { /* ignore */ }
      const rows: PracticeRecord[] = Array.isArray(data) ? data : []
      setPracticeRecords(rows.length > 0 ? rows : local)
    } catch {
      setPracticeRecords([])
    }
    setPracticeLoading(false)
  }

  function toggleGroup(g: string) {
    setOpenGroups(prev => ({ ...prev, [g]: !prev[g] }))
  }

  function goToApply(sc: Assignment['sample_cases']) {
    sessionStorage.setItem('assigned_case', JSON.stringify(sc))
    router.push('/apply')
  }

  function navTo(page: ActivePage, title = '') {
    setGenericTitle(title)
    setActivePage(page)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#0067c2', fontSize: 18 }}>로딩 중...</span>
      </div>
    )
  }

  if (!user || user.role === 'admin') return null

  // ── Sidebar helpers ──────────────────────────────────────────
  const SbItem = ({ label, page, title = '', indent = true }: { label: string; page: ActivePage; title?: string; indent?: boolean }) => (
    <div
      onClick={() => navTo(page, title || label)}
      style={{
        padding: indent ? '7px 16px 7px 30px' : '7px 16px',
        fontSize: 13,
        cursor: 'pointer',
        background: activePage === page && (title === genericTitle || !title) ? '#e8f0fc' : 'transparent',
        color: activePage === page && (title === genericTitle || !title) ? '#0067c2' : '#333',
        fontWeight: activePage === page && (title === genericTitle || !title) ? 700 : 400,
        borderLeft: activePage === page && (title === genericTitle || !title) ? '3px solid #0067c2' : '3px solid transparent',
      }}
    >
      {label}
    </div>
  )

  const GrpHd = ({ label, gKey, gold }: { label: string; gKey: string; gold?: boolean }) => (
    <div
      onClick={() => toggleGroup(gKey)}
      style={{
        padding: '8px 16px',
        fontSize: 12,
        fontWeight: 700,
        background: gold ? '#7c5800' : '#2a3f6b',
        color: gold ? '#ffe082' : '#b8c8e8',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        userSelect: 'none',
      }}
    >
      <span>{label}</span>
      <span>{openGroups[gKey] ? '▲' : '▼'}</span>
    </div>
  )

  // ── Page header helper ───────────────────────────────────────
  const PageHd = ({ title, actions }: { title: string; actions?: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderBottom: '2px solid #003366', padding: '10px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: '#003366' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#003366' }} />
        {title}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>{actions}</div>
    </div>
  )

  const ActBtn = ({ label, onClick, primary }: { label: string; onClick?: () => void; primary?: boolean }) => (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px', fontSize: 12, border: primary ? 'none' : '1px solid #c8cdd6',
        background: primary ? '#006699' : '#fff', color: primary ? '#fff' : '#555',
        borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  )

  // ── STATUS PAGE ──────────────────────────────────────────────
  const StatusContent = () => (
    <div>
      <PageHd title="나의사건현황" actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />

      {/* Counter boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16, background: '#fff', borderBottom: '1px solid #eee' }}>
        <div style={{ border: '1px solid #dde0e8', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ background: '#1a3a6b', color: '#fff', padding: '9px 14px', fontSize: 13, fontWeight: 700 }}>나의 사건관리</div>
          <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, textAlign: 'center' }}>
            {[
              { n: allCases.length || assignments.length, l: '진행중사건', c: '#006699' },
              { n: 0, l: '미확인송달', c: '#555' },
              { n: 0, l: '관심사건', c: '#555' },
            ].map(({ n, l, c }) => (
              <div key={l}>
                <div style={{ fontSize: 26, fontWeight: 700, color: c }}>{assignmentsLoading ? '…' : n}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 16px 14px' }}>
            <button onClick={() => navTo('assigned-cases')} style={{ width: '100%', padding: '6px', fontSize: 12, border: '1px solid #006699', color: '#006699', background: '#f0f7ff', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit' }}>
              배정된 사건 보기
            </button>
          </div>
        </div>

        <div style={{ border: '1px solid #dde0e8', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ background: '#1a3a6b', color: '#fff', padding: '9px 14px', fontSize: 13, fontWeight: 700 }}>나의 문서함</div>
          <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, textAlign: 'center' }}>
            {[
              { n: 0, l: '임시저장', c: '#555' },
              { n: practiceRecords.length, l: '제출서류', c: '#555' },
              { n: 0, l: '확정된사건', c: '#555' },
            ].map(({ n, l, c }) => (
              <div key={l}>
                <div style={{ fontSize: 26, fontWeight: 700, color: c }}>{n}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 16px 14px' }}>
            <button onClick={() => navTo('submitted-docs')} style={{ width: '100%', padding: '6px', fontSize: 12, border: '1px solid #ccc', color: '#555', background: '#fafafa', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit' }}>
              문서함 바로가기
            </button>
          </div>
        </div>
      </div>

      {/* Quick bar */}
      <div style={{ display: 'flex', background: '#005f87', borderRadius: 0, overflow: 'hidden' }}>
        {['각종신청', '재판일정', '납부/환급'].map((item, i) => (
          <div key={item} style={{ flex: 1, padding: '9px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', borderLeft: i > 0 ? '1px solid rgba(255,255,255,.25)' : 'none' }}
            onClick={() => i === 1 ? navTo('schedule') : navTo('pay')}>
            {item}
          </div>
        ))}
      </div>

      {/* Widget grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16, background: '#f5f6fa' }}>
        {/* 재판일정 */}
        <div style={{ border: '1px solid #dde0e8', borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
          <div style={{ background: '#1a3a6b', color: '#fff', padding: '8px 14px', fontSize: 13, fontWeight: 700 }}>📅 재판일정</div>
          <div style={{ padding: 12 }}>
            {SCHEDULE_ITEMS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: i < SCHEDULE_ITEMS.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <span style={{ fontSize: 11, background: '#e8f0fc', color: '#0067c2', padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap', fontWeight: 600 }}>{s.date}</span>
                <div>
                  <div style={{ fontSize: 11, color: '#333' }}>{s.caseNo}</div>
                  <div style={{ fontSize: 11, color: '#0067c2' }}>{s.event}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 미확인 송달문서 */}
        <div style={{ border: '1px solid #dde0e8', borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
          <div style={{ background: '#1a3a6b', color: '#fff', padding: '8px 14px', fontSize: 13, fontWeight: 700 }}>📬 미확인 송달문서</div>
          <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>미확인 송달문서가 없습니다.</div>
        </div>

        {/* 작성중 서류 */}
        <div style={{ border: '1px solid #dde0e8', borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
          <div style={{ background: '#1a3a6b', color: '#fff', padding: '8px 14px', fontSize: 13, fontWeight: 700 }}>📝 작성중 서류</div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div onClick={() => router.push('/apply')} style={{ padding: '10px', border: '2px dashed #006699', borderRadius: 5, textAlign: 'center', color: '#006699', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              새 소장 작성하기 +
            </div>
            <div onClick={() => router.push('/answer')} style={{ padding: '10px', border: '2px dashed #16a34a', borderRadius: 5, textAlign: 'center', color: '#16a34a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              새 답변서 작성하기 +
            </div>
          </div>
        </div>

        {/* 배정된 실습사건 */}
        <div style={{ border: '1px solid #dde0e8', borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
          <div style={{ background: 'linear-gradient(90deg,#7c5800,#b8922a)', color: '#ffe082', padding: '8px 14px', fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📋 배정된 실습사건</span>
            <span onClick={() => navTo('assigned-cases')} style={{ fontSize: 11, cursor: 'pointer', opacity: 0.85 }}>전체보기 →</span>
          </div>
          <div style={{ padding: 12 }}>
            {assignmentsLoading ? (
              <div style={{ textAlign: 'center', color: '#999', fontSize: 13, padding: 8 }}>로딩 중...</div>
            ) : assignments.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', fontSize: 13, padding: 8 }}>배정된 사건이 없습니다.</div>
            ) : (
              assignments.slice(0, 2).map(a => (
                <div key={a.id} onClick={() => navTo('assigned-cases')} style={{ padding: '7px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a3a6b' }}>{a.sample_cases?.title || '사건명 없음'}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>{a.sample_cases?.court} | {a.assigned_at?.slice(0, 10)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // ── ASSIGNED CASES ───────────────────────────────────────────
  const AssignedCasesContent = () => (
    <div>
      <PageHd title="배정된 실습사건" actions={<ActBtn label="🔄 새로고침" onClick={fetchAssignments} />} />
      <div style={{ padding: '8px 14px', background: '#e8f4fb', border: '1px solid #c8ddf5', borderBottom: '2px solid #006699', fontSize: 12, color: '#1a4a6b' }}>
        💡 배정된 사건의 사실관계를 읽고 <strong>소장 작성하기</strong> 버튼을 클릭해 소장을 작성하세요.
      </div>
      {assignmentsLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>⏳ 배정된 사건을 불러오는 중...</div>
      ) : assignments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', border: '1px solid #dde0e8', borderTop: 'none' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#003366', marginBottom: 8 }}>배정된 사건이 없습니다</div>
          <div style={{ fontSize: 13, color: '#888', lineHeight: 1.8 }}>담당 선생님이 사건을 배정하면 여기서 확인할 수 있습니다.</div>
        </div>
      ) : (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {assignments.map(a => {
            const c = a.sample_cases || {}
            const statusLabel = a.status === 'completed' ? '✅ 완료' : a.status === 'in_progress' ? '📝 진행중' : '📋 배정됨'
            const statusBg = a.status === 'completed' ? '#d1fae5' : a.status === 'in_progress' ? '#dbeafe' : '#f3f4f6'
            const statusColor = a.status === 'completed' ? '#065f46' : a.status === 'in_progress' ? '#1e40af' : '#374151'
            return (
              <div key={a.id} style={{ background: '#fff', border: '1px solid #dde0e8', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                <div style={{ background: 'linear-gradient(135deg,#1a3a6b,#2952a3)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{c.title || '(제목 없음)'}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', marginTop: 3 }}>[{c.case_type || '민사'}] {c.court || ''}</div>
                  </div>
                  <span style={{ background: statusBg, color: statusColor, padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{statusLabel}</span>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: '원고 (신청인)', value: c.plaintiff || '–' },
                      { label: '피고 (피신청인)', value: c.defendant || '–' },
                      ...(c.claim_amount ? [{ label: '청구 금액', value: c.claim_amount }] : []),
                      { label: '배정일', value: a.assigned_at ? a.assigned_at.split('T')[0] : '–' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: '#f7f8fc', borderRadius: 4, padding: '9px 12px' }}>
                        <div style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {(c.description || c.background) && (
                    <div style={{ background: '#f0f7ff', border: '1px solid #c8ddf5', borderRadius: 4, padding: '10px 14px', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#003366', marginBottom: 5 }}>📄 사건 개요</div>
                      <div style={{ fontSize: 12, color: '#444', lineHeight: 1.8 }}>{c.description || c.background}</div>
                    </div>
                  )}
                  {(c.facts || c.key_facts) && (
                    <div style={{ background: '#fffbe6', border: '1px solid #ffe082', borderRadius: 4, padding: '10px 14px', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#7a6000', marginBottom: 5 }}>📋 사실관계</div>
                      <div style={{ fontSize: 12, color: '#555', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{c.facts || c.key_facts}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <button onClick={() => goToApply(c)} style={{ height: 38, padding: '0 22px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      📝 소장 작성하기 →
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── PRACTICE RECORDS ─────────────────────────────────────────
  const PracticeRecordsContent = () => {
    const avgScore = practiceRecords.length ? Math.round(practiceRecords.reduce((s, r) => s + r.score, 0) / practiceRecords.length) : 0
    const best = practiceRecords.length ? Math.max(...practiceRecords.map(r => r.score)) : 0
    return (
      <div>
        <PageHd title="나의 실습기록" actions={<><ActBtn label="🖨 출력" primary /><ActBtn label="📋 소장 작성하기" onClick={() => router.push('/apply')} primary /></>} />
        <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #dde0e8', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { n: practiceRecords.length, l: '총 실습 횟수', c: '#003366' },
            { n: avgScore, l: '평균 점수', c: '#006699' },
            { n: best, l: '최고 점수', c: '#15803d' },
            { n: practiceRecords.length ? gradeFn(avgScore).split(' ')[1] : '–', l: '평균 등급', c: colorFn(avgScore) },
          ].map(({ n, l, c }) => (
            <div key={l} style={{ background: '#f0f4f8', borderRadius: 6, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: c }}>{practiceLoading ? '…' : n}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
        {practiceLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>⏳ 기록을 불러오는 중...</div>
        ) : practiceRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#aaa' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 8 }}>아직 실습 기록이 없습니다</div>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 20 }}>소장 작성 실습을 완료하면 기록이 저장됩니다.</div>
            <button onClick={() => router.push('/apply')} style={{ background: '#006699', color: '#fff', border: 'none', height: 38, padding: '0 20px', fontSize: 13, fontWeight: 700, borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit' }}>📋 지금 실습 시작하기</button>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid #eee' }}>
            {practiceRecords.map((r, i) => (
              <div key={r.id || i} style={{ borderBottom: '1px solid #eaecf4', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ background: bgFn(r.score), borderRadius: 8, padding: '12px 16px', textAlign: 'center', minWidth: 76, flexShrink: 0 }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: colorFn(r.score), lineHeight: 1 }}>{r.score}</div>
                    <div style={{ fontSize: 10, color: colorFn(r.score), marginTop: 2 }}>/ 100점</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: colorFn(r.score), marginTop: 4 }}>{gradeFn(r.score).split(' ')[1]}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#003366' }}>{r.case_type || '소장 실습'}</span>
                      <span style={{ fontSize: 11, color: '#888' }}>{r.court || ''}</span>
                      <span style={{ fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>{r.date_str || r.created_at?.slice(0, 10) || ''}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                      원고: {r.plaintiff || '–'} | 피고: {r.defendant || '–'} | 입증서류: {r.evidence_count || 0}건
                    </div>
                    {r.feedback && (
                      <div style={{ background: '#f8f9fc', border: '1px solid #e0e6ee', borderRadius: 4, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#003366', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          🤖 AI 피드백
                          <button onClick={() => setExpandedFeedback(prev => ({ ...prev, [r.id]: !prev[r.id] }))} style={{ background: 'none', border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 10, padding: '1px 6px', cursor: 'pointer', color: '#555', marginLeft: 'auto', fontFamily: 'inherit' }}>
                            {expandedFeedback[r.id] ? '접기' : '펼치기'}
                          </button>
                        </div>
                        {expandedFeedback[r.id] && (
                          <div style={{ fontSize: 11, color: '#444', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{r.feedback}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── SUBMITTED DOCS ───────────────────────────────────────────
  const SubmittedDocsContent = () => (
    <div>
      <PageHd title="제출서류" actions={<><ActBtn label="🖨 출력" /><ActBtn label="📋 새 소장 작성" onClick={() => router.push('/apply')} primary /></>} />
      <div style={{ padding: '10px 14px', background: '#fff', borderBottom: '1px solid #eee', fontSize: 12, color: '#555', lineHeight: 1.8 }}>
        ※ 소장 작성 실습 후 <strong>문서제출</strong>을 완료한 서류 목록입니다.
      </div>
      <div style={{ background: '#fff', border: '1px solid #dde0e8', borderTop: 'none' }}>
        <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee' }}>
          <span style={{ fontSize: 12, color: '#555' }}>총 <strong>{practiceLoading ? '…' : practiceRecords.length}</strong>건</span>
        </div>
        {practiceLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>⏳ 기록을 불러오는 중...</div>
        ) : practiceRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#aaa' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 8 }}>제출된 서류가 없습니다</div>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 20 }}>소장 작성 후 문서제출까지 완료하면 이곳에 기록됩니다.</div>
            <button onClick={() => router.push('/apply')} style={{ height: 38, padding: '0 20px', background: '#006699', color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>📋 소장 작성하기</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f5f6fa', borderBottom: '1px solid #dde0e8' }}>
                {['번호', '사건명', '법원', '원고', '피고', '입증서류', '실습점수', '제출일시'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#555', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {practiceRecords.map((r, i) => (
                <tr key={r.id || i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#888' }}>{practiceRecords.length - i}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.case_type || '소장'}</td>
                  <td style={{ padding: '8px 10px', color: '#666' }}>{r.court || '–'}</td>
                  <td style={{ padding: '8px 10px', color: '#666' }}>{r.plaintiff || '–'}</td>
                  <td style={{ padding: '8px 10px', color: '#666' }}>{r.defendant || '–'}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{r.evidence_count || 0}건</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ background: bgFn(r.score), color: colorFn(r.score), padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{r.score}</span>
                      <span style={{ fontSize: 11, color: colorFn(r.score), fontWeight: 600 }}>{gradeFn(r.score).split(' ')[1]}</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#888' }}>{r.date_str || r.created_at?.slice(0, 10) || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )

  // ── SCHEDULE ─────────────────────────────────────────────────
  const ScheduleContent = () => (
    <div>
      <PageHd title="재판일정" actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />
      <div style={{ padding: 14, background: '#fff', borderBottom: '1px solid #eee', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>기간</span>
        <input type="date" defaultValue="2026-02-01" style={{ height: 32, border: '1px solid #c8cdd6', borderRadius: 3, padding: '0 8px', fontSize: 12, fontFamily: 'inherit' }} />
        <span style={{ fontSize: 12 }}>~</span>
        <input type="date" defaultValue="2026-03-31" style={{ height: 32, border: '1px solid #c8cdd6', borderRadius: 3, padding: '0 8px', fontSize: 12, fontFamily: 'inherit' }} />
        <button style={{ height: 32, padding: '0 16px', background: '#003366', color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>조 회</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, background: '#fff' }}>
        <thead>
          <tr style={{ background: '#f5f6fa', borderBottom: '1px solid #dde0e8' }}>
            {['법원', '사건번호', '기일종류', '기일일시', '장소'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#555' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SCHEDULE_ITEMS.map((s, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>서울중앙지방법원</td>
              <td style={{ padding: '8px 12px' }}>{s.caseNo.split(' ')[1] || s.caseNo}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center', color: '#006699', fontWeight: 600 }}>{s.event}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>{s.date} 10:00</td>
              <td style={{ padding: '8px 12px', textAlign: 'center', color: '#888' }}>제{(i + 1) * 3}호 법정</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // ── PAY ──────────────────────────────────────────────────────
  const PayContent = () => (
    <div>
      <PageHd title="납부관리" actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />
      <div style={{ padding: 16, background: '#fff', borderBottom: '1px solid #eee', display: 'flex', gap: 16 }}>
        {[
          { label: '납부예정 금액', amount: '0', btnLabel: '납부하기', btnColor: '#006699' },
          { label: '납부완료 금액', amount: '0' },
          { label: '환급예정 금액', amount: '0', btnLabel: '환급신청', btnColor: '#27ae60' },
        ].map(({ label, amount, btnLabel, btnColor }) => (
          <div key={label} style={{ flex: 1, border: '1px solid #dde0e8', borderRadius: 6, padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#003366' }}>{amount}<span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4 }}>원</span></div>
            {btnLabel && (
              <button onClick={() => alert('납부 (실습 모드)')} style={{ marginTop: 10, padding: '6px 16px', background: btnColor, color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{btnLabel}</button>
            )}
          </div>
        ))}
      </div>
      <div style={{ padding: 14, background: '#fff', borderBottom: '1px solid #eee', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>납부기간</span>
        <input type="date" defaultValue="2026-02-01" style={{ height: 32, border: '1px solid #c8cdd6', borderRadius: 3, padding: '0 8px', fontSize: 12, fontFamily: 'inherit' }} />
        <span style={{ fontSize: 12 }}>~</span>
        <input type="date" defaultValue="2026-03-31" style={{ height: 32, border: '1px solid #c8cdd6', borderRadius: 3, padding: '0 8px', fontSize: 12, fontFamily: 'inherit' }} />
        <button style={{ height: 32, padding: '0 16px', background: '#003366', color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>조 회</button>
      </div>
      <div style={{ background: '#fff', padding: 14, textAlign: 'center', color: '#aaa', fontSize: 13 }}>조회된 결과가 없습니다.</div>
    </div>
  )

  // ── MY INFO ──────────────────────────────────────────────────
  const MyInfoContent = ({ type }: { type: 'user' | 'pw' }) => {
    if (type === 'pw') return (
      <div>
        <PageHd title="비밀번호변경" />
        <div style={{ padding: 20, background: '#fff', border: '1px solid #dde0e8', borderTop: 'none' }}>
          <div style={{ maxWidth: 360 }}>
            {['현재 비밀번호', '새 비밀번호', '새 비밀번호 확인'].map(label => (
              <div key={label} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{label}</label>
                <input type="password" style={{ width: '100%', height: 36, border: '1px solid #c8cdd6', borderRadius: 3, padding: '0 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} placeholder={label} />
              </div>
            ))}
            <button onClick={() => alert('비밀번호 변경 (실습 모드)')} style={{ height: 38, padding: '0 24px', background: '#003366', color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>변경하기</button>
          </div>
        </div>
      </div>
    )
    return (
      <div>
        <PageHd title="사용자정보변경" actions={<ActBtn label="📌 나의 메뉴 추가" />} />
        <div style={{ padding: 20, background: '#fff', border: '1px solid #dde0e8', borderTop: 'none' }}>
          <div style={{ border: '1px solid #dde0e8', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ background: '#f0f4f8', borderBottom: '1px solid #dde0e8', padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#003366' }}>👤 기본 정보</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              {[
                { th: '아이디', td: `${user.id} (변경 불가)` },
                { th: '이름', td: user.name },
                { th: '소속', td: user.org || '미입력' },
                { th: '권한', td: user.role === 'admin' ? '관리자' : '일반사용자' },
              ].map(({ th, td }) => (
                <tr key={th} style={{ borderBottom: '1px solid #eee' }}>
                  <th style={{ padding: '9px 14px', background: '#fafbfc', fontWeight: 600, color: '#555', width: 100, textAlign: 'left' }}>{th}</th>
                  <td style={{ padding: '9px 14px', color: '#333' }}>{td}</td>
                </tr>
              ))}
            </table>
          </div>
          <div style={{ border: '1px solid #dde0e8', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ background: '#f0f4f8', borderBottom: '1px solid #dde0e8', padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#003366' }}>🔑 보안 설정</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '9px 14px', background: '#fafbfc', fontWeight: 600, color: '#555', width: 100, textAlign: 'left' }}>비밀번호</th>
                <td style={{ padding: '9px 14px' }}>
                  ●●●●●●●● <button onClick={() => navTo('myinfo-pw')} style={{ marginLeft: 8, padding: '2px 10px', fontSize: 11, border: '1px solid #c8cdd6', background: '#fff', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit' }}>변경</button>
                </td>
              </tr>
              <tr>
                <th style={{ padding: '9px 14px', background: '#fafbfc', fontWeight: 600, color: '#555', width: 100, textAlign: 'left' }}>마지막 로그인</th>
                <td style={{ padding: '9px 14px', color: '#888' }}>{new Date().toLocaleString('ko-KR')}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ── ACTIVE CASES (진행중사건) ─────────────────────────────────
  const ActiveCasesContent = () => {
    const [filterType, setFilterType] = useState('전체')
    const [filterCourt, setFilterCourt] = useState('전체')
    const [currentPage, setCurrentPage] = useState(1)
    const [menuModal, setMenuModal] = useState<Assignment | null>(null)
    const perPage = 10

    const LAWSUIT_TYPES = ['전체','민사','형사','가사','보호','행정','특허','회생파산','민사(지급명령)','민사집행','관태료']
    const COURTS = ['전체','서울중앙지방법원','서울동부지방법원','서울서부지방법원','서울남부지방법원','서울북부지방법원','수원지방법원','인천지방법원','의정부지방법원','춘천지방법원','대전지방법원','청주지방법원','대구지방법원','부산지방법원','울산지방법원','창원지방법원','광주지방법원','전주지방법원','제주지방법원']
    const JAEJANBU: Record<string, string> = { '대여금':'민사4단독','손해배상':'민사2단독','매매대금':'민사3단독','임금':'민사4단독','부당이득금':'민사5단독','소유권이전등기':'민사합의11부','기타':'민사1단독' }

    function mockCaseNo(a: Assignment) {
      const year = a.assigned_at?.slice(0,4) || '2026'
      const code = a.sample_cases?.case_type === '소유권이전등기' ? '가합' : '가단'
      return `${year}${code}${String(a.id).padStart(5,'0')}`
    }
    function mockHearingDate(a: Assignment) {
      if (!a.assigned_at) return ''
      const d = new Date(a.assigned_at); d.setDate(d.getDate()+45)
      const times = ['10:00','10:30','11:00','14:00','14:30']
      return `${d.toISOString().slice(0,10)} ${times[a.id % 5]}`
    }
    function mockRoom(a: Assignment) {
      return ['제1법정','제2법정','제3법정','제11법정','제201호 법정'][a.id % 5]
    }
    function courtShort(c: string) {
      return c.replace('지방법원','지법').replace('고등법원','고법')
    }
    function caseLabel(a: Assignment) {
      return `${mockCaseNo(a)}(${a.sample_cases?.case_type || '민사'})`
    }

    const filtered = allCases.filter(a => {
      if (filterType !== '전체' && filterType !== '민사') return false
      if (filterCourt !== '전체' && !(a.sample_cases?.court || '').includes(filterCourt)) return false
      return true
    })
    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const paged = filtered.slice((currentPage-1)*perPage, currentPage*perPage)

    const tdS: React.CSSProperties = { padding:'7px 8px', fontSize:12, borderBottom:'1px solid #e8edf0', verticalAlign:'middle' }

    return (
      <div style={{ fontFamily:'inherit' }}>
        <PageHd title="진행중사건" actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />

        {/* 필터 영역 */}
        <div style={{ background:'#fff', borderBottom:'1px solid #dde0e8', padding:'10px 14px', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:12, color:'#555', fontWeight:600, minWidth:40 }}>소송유형</span>
            <select value={filterType} onChange={e=>{setFilterType(e.target.value);setCurrentPage(1)}} style={{ height:30, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 6px', fontFamily:'inherit' }}>
              {LAWSUIT_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <select style={{ height:30, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 6px', fontFamily:'inherit' }}>
              {['전체','민사본안','민사신청','항고제재고','기타'].map(t=><option key={t}>{t}</option>)}
            </select>
            <span style={{ fontSize:12, color:'#555', fontWeight:600, minWidth:20, marginLeft:8 }}>법원</span>
            <select value={filterCourt} onChange={e=>{setFilterCourt(e.target.value);setCurrentPage(1)}} style={{ height:30, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 6px', fontFamily:'inherit' }}>
              {COURTS.map(c=><option key={c}>{c}</option>)}
            </select>
            <button style={{ height:30, padding:'0 10px', background:'#fff', border:'1px solid #c8cdd6', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>나이법원설정</button>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <label style={{ fontSize:12, display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}><input type="radio" name="searchMode" defaultChecked style={{ margin:0 }}/>접수일자</label>
            <label style={{ fontSize:12, display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}><input type="radio" name="searchMode" style={{ margin:0 }}/>사건번호</label>
            <input type="date" style={{ height:30, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 6px', fontSize:12, fontFamily:'inherit' }} />
            <span style={{ fontSize:12 }}>~</span>
            <input type="date" style={{ height:30, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 6px', fontSize:12, fontFamily:'inherit' }} />
            {['오늘','3일','1주일','1개월','전체'].map(l=>(
              <button key={l} style={{ height:28, padding:'0 10px', background:'#fff', border:'1px solid #c8cdd6', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>{l}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:12, color:'#555', fontWeight:600, minWidth:40 }}>정렬순서</span>
            {[['접수일↓','접수일↑'],['법원↑','법원↓'],['사건번호↓','사건번호↑']].map((opts,i)=>(
              <select key={i} defaultValue={opts[0]} style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, fontSize:11, padding:'0 4px', fontFamily:'inherit' }}>
                {opts.map(o=><option key={o}>{o}</option>)}
              </select>
            ))}
          </div>
          <div style={{ textAlign:'center' }}>
            <button style={{ height:34, padding:'0 40px', background:'#003366', color:'#fff', border:'none', borderRadius:3, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>조 회</button>
          </div>
        </div>

        {/* 상단 액션 버튼 */}
        <div style={{ background:'#fff', borderBottom:'1px solid #dde0e8', padding:'6px 14px', display:'flex', justifyContent:'flex-end', gap:6 }}>
          <ActBtn label="관심사건 지정" />
          <ActBtn label="완료사건 지정" />
          <button style={{ height:28, padding:'0 10px', background:'#1a7a3a', color:'#fff', border:'none', borderRadius:3, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
            <span style={{ fontSize:13 }}>📗</span> 엑셀로 저장
          </button>
        </div>

        {/* 테이블 */}
        {allCasesLoading ? (
          <div style={{ padding:60, textAlign:'center', color:'#aaa', background:'#fff' }}>⏳ 사건을 불러오는 중...</div>
        ) : total === 0 ? (
          <div style={{ padding:60, textAlign:'center', color:'#aaa', background:'#fff' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
            진행중인 사건이 없습니다.
          </div>
        ) : (
          <div style={{ background:'#fff', overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#f0f3f8', borderBottom:'2px solid #b8c8e0' }}>
                  <th style={{ padding:'8px 8px', width:28 }}><input type="checkbox" /></th>
                  {['법원','사건번호','재판부','사건지위','접수일자','원고','피고','기일시간','기일장소','바로가기'].map(h=>(
                    <th key={h} style={{ padding:'8px 8px', fontWeight:600, fontSize:11, color:'#333', whiteSpace:'nowrap', textAlign:'center' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((a, i) => {
                  const sc = a.sample_cases || {}
                  const caseNo = mockCaseNo(a)
                  const hearing = mockHearingDate(a)
                  return (
                    <tr key={a.id} style={{ background: i%2===0 ? '#fff' : '#fafbfe', borderBottom:'1px solid #e8edf0' }}>
                      <td style={{ ...tdS, textAlign:'center' }}><input type="checkbox" /></td>
                      <td style={{ ...tdS, whiteSpace:'nowrap' }}>{courtShort(sc.court || '서울중앙지법')}</td>
                      <td style={{ ...tdS }}>
                        <span
                          onClick={() => goToApply(sc)}
                          style={{ color:'#0057a8', textDecoration:'underline', cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}
                        >{caseNo}</span>
                      </td>
                      <td style={{ ...tdS, textAlign:'center', whiteSpace:'nowrap', color:'#555' }}>{JAEJANBU[sc.case_type||''] || '민사1단독'}</td>
                      <td style={{ ...tdS, textAlign:'center', color:'#555' }}>원고대리인</td>
                      <td style={{ ...tdS, textAlign:'center', whiteSpace:'nowrap', color:'#555' }}>{a.assigned_at?.slice(0,10).replace(/-/g,'.')}</td>
                      <td style={{ ...tdS, maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sc.plaintiff || '–'}</td>
                      <td style={{ ...tdS, maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sc.defendant || '–'}</td>
                      <td style={{ ...tdS, textAlign:'center', whiteSpace:'nowrap', color:'#555', fontSize:11 }}>{hearing}</td>
                      <td style={{ ...tdS, textAlign:'center', whiteSpace:'nowrap', color:'#888', fontSize:11 }}>{hearing ? mockRoom(a) : ''}</td>
                      <td style={{ ...tdS, textAlign:'center' }}>
                        <button
                          onClick={() => setMenuModal(a)}
                          style={{ height:24, padding:'0 8px', background:'#fff', border:'1px solid #8899bb', borderRadius:3, fontSize:11, cursor:'pointer', color:'#003366', fontFamily:'inherit' }}
                        >메뉴선택</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 페이지네이션 */}
        {total > 0 && (
          <div style={{ background:'#fff', borderTop:'1px solid #e8edf0', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
            <span style={{ fontSize:12, color:'#555' }}>총 <strong>{total}</strong>건</span>
            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
              <button onClick={()=>setCurrentPage(1)} disabled={currentPage===1} style={{ width:26, height:26, border:'1px solid #ccc', background:'#fff', borderRadius:3, cursor:'pointer', fontSize:11 }}>«</button>
              <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} style={{ width:26, height:26, border:'1px solid #ccc', background:'#fff', borderRadius:3, cursor:'pointer', fontSize:12 }}>‹</button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                <button key={p} onClick={()=>setCurrentPage(p)} style={{ width:26, height:26, border:`1px solid ${p===currentPage?'#003366':'#ccc'}`, background:p===currentPage?'#003366':'#fff', color:p===currentPage?'#fff':'#333', borderRadius:3, cursor:'pointer', fontSize:12, fontWeight:p===currentPage?700:400 }}>{p}</button>
              ))}
              <button onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} style={{ width:26, height:26, border:'1px solid #ccc', background:'#fff', borderRadius:3, cursor:'pointer', fontSize:12 }}>›</button>
              <button onClick={()=>setCurrentPage(totalPages)} disabled={currentPage===totalPages} style={{ width:26, height:26, border:'1px solid #ccc', background:'#fff', borderRadius:3, cursor:'pointer', fontSize:11 }}>»</button>
            </div>
            <select defaultValue="10" style={{ height:28, border:'1px solid #ccc', borderRadius:3, fontSize:11, padding:'0 4px', fontFamily:'inherit' }}>
              {['10','20','30'].map(n=><option key={n}>{n}개씩 보기</option>)}
            </select>
          </div>
        )}

        {/* 참고하세요 */}
        <div style={{ background:'#f8f9fc', border:'1px solid #dde0e8', borderTop:'none', borderRadius:'0 0 4px 4px', padding:'14px 18px', display:'flex', gap:12, alignItems:'flex-start' }}>
          <div style={{ fontSize:28, marginTop:2 }}>🖥</div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#003366', marginBottom:6 }}>참고하세요</div>
            <ul style={{ margin:0, paddingLeft:16, fontSize:11, color:'#555', lineHeight:1.9 }}>
              <li>전자소송인증번호 없이 전자소송사건등록을 한 대리인이나 참가신청서를 제출한 참가인은 재판부에서 관련서류를 확인하기 전에는 사건 기록열람과 알림서비스변경을 할 수 없습니다.</li>
              <li>본소에 병합된 사건의 경우 소송서류제출, 소송비용납부, 알림서비스변경을 할 수 없으며, 본소 사건번호로 진행하시기 바랍니다.</li>
              <li>완료사건 지정은 <strong>확정일</strong> 또는 <strong>기록인계일이 입력된 사건</strong>이나 본소인 중 <strong>송기록 송부일이 입력된 사건</strong>에 한하여 완료된 사건으로 지정 가능합니다.</li>
            </ul>
          </div>
        </div>

        {/* 메뉴선택 모달 */}
        {menuModal && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'#fff', borderRadius:6, width:480, boxShadow:'0 8px 32px rgba(0,0,0,.3)', overflow:'hidden' }}>
              {/* 모달 헤더 */}
              <div style={{ background:'linear-gradient(90deg,#0d2244,#1a3a6b)', color:'#fff', padding:'12px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:700, fontSize:15 }}>메뉴선택</span>
                <button onClick={()=>setMenuModal(null)} style={{ background:'none', border:'none', color:'#fff', fontSize:20, cursor:'pointer', lineHeight:1 }}>✕</button>
              </div>
              {/* 사건번호 */}
              <div style={{ padding:'18px 20px 8px', textAlign:'center' }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#003366', marginBottom:6 }}>{caseLabel(menuModal)}</div>
                <div style={{ fontSize:12, color:'#555' }}>아래 항목을 클릭하시면, 해당 화면으로 바로가기 됩니다.</div>
              </div>
              {/* 버튼 그리드 */}
              <div style={{ padding:'12px 20px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[
                  { label:'사건기록열람', action: null },
                  { label:'제출/송달내역', action: null },
                  { label:'관련사건등록', action: null },
                  { label:'관련사건조회', action: null },
                  { label:'재증명신청', action: null },
                  { label:'📝 소장 작성하기', action: () => { setMenuModal(null); goToApply(menuModal.sample_cases || {}) }, primary: true },
                ].map(({ label, action, primary }) => (
                  <button
                    key={label}
                    onClick={action ? action : () => alert('실습 모드에서는 지원하지 않는 기능입니다.')}
                    style={{ padding:'12px 8px', border:`1px solid ${primary ? '#0067c2' : '#8899bb'}`, background: primary ? '#0067c2' : '#fff', color: primary ? '#fff' : '#003366', borderRadius:4, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}
                  >{label}</button>
                ))}
              </div>
              {/* 닫기 */}
              <div style={{ padding:'8px 20px 18px', textAlign:'center' }}>
                <button onClick={()=>setMenuModal(null)} style={{ height:34, padding:'0 40px', background:'#555', color:'#fff', border:'none', borderRadius:3, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>닫기</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── GENERIC ──────────────────────────────────────────────────
  const GenericContent = ({ title }: { title: string }) => (
    <div>
      <PageHd title={title} actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />
      <div style={{ padding: 14, background: '#fff', borderBottom: '1px solid #eee', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button style={{ height: 32, padding: '0 20px', background: '#003366', color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>조 회</button>
      </div>
      <div style={{ background: '#fff', padding: 60, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>🔍</div>
        조회된 결과가 없습니다.
      </div>
    </div>
  )

  function renderContent() {
    switch (activePage) {
      case 'status': return <StatusContent />
      case 'active-cases': return <ActiveCasesContent />
      case 'assigned-cases': return <AssignedCasesContent />
      case 'practice-records': return <PracticeRecordsContent />
      case 'submitted-docs': return <SubmittedDocsContent />
      case 'schedule': return <ScheduleContent />
      case 'pay': return <PayContent />
      case 'myinfo-user': return <MyInfoContent type="user" />
      case 'myinfo-pw': return <MyInfoContent type="pw" />
      default: return <GenericContent title={genericTitle || activePage} />
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', flexDirection: 'column' }}>
      <MockBar />
      <GnbNav active="나의전자소송" />

      {/* Breadcrumb */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8edf5', padding: '8px 20px', fontSize: 12, color: '#666' }}>
        <span style={{ maxWidth: 1200, margin: '0 auto', display: 'block' }}>홈 &gt; <strong style={{ color: '#1a3a6b' }}>나의전자소송</strong></span>
      </div>

      {/* Layout */}
      <div style={{ flex: 1, maxWidth: 1200, margin: '20px auto', width: '100%', padding: '0 20px', display: 'flex', gap: 20, alignItems: 'flex-start', boxSizing: 'border-box' }}>
        {/* Sidebar */}
        <aside style={{ width: 190, flexShrink: 0, background: '#fff', border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <div style={{ background: 'linear-gradient(135deg,#1a3a6b,#2952a3)', color: '#fff', padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>
            📁 나의전자소송
          </div>
          {/* 나의사건현황 */}
          <div onClick={() => navTo('status')} style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', background: activePage === 'status' ? '#1a3a6b' : '#eef2fb', color: activePage === 'status' ? '#fff' : '#1a3a6b', fontWeight: 700, borderBottom: '1px solid #d0d8e8' }}>
            나의사건현황
          </div>

          <GrpHd label="나의사건관리" gKey="나의사건관리" />
          {openGroups['나의사건관리'] && (
            <>
              <SbItem label="진행중사건" page="active-cases" />
              <SbItem label="관심사건" page="generic" title="관심사건" />
              <SbItem label="확정된사건" page="generic" title="확정된사건" />
              <SbItem label="완료된사건" page="generic" title="완료된사건" />
            </>
          )}

          <GrpHd label="사건진행" gKey="사건진행" />
          {openGroups['사건진행'] && (
            <>
              <SbItem label="재판일정" page="schedule" />
              <SbItem label="각종신청" page="generic" title="각종신청" />
              <SbItem label="전자결제" page="generic" title="전자결제" />
            </>
          )}

          <GrpHd label="나의문서함" gKey="나의문서함" />
          {openGroups['나의문서함'] && (
            <>
              <SbItem label="미확인송달문서" page="generic" title="미확인송달문서" />
              <SbItem label="전체송달문서" page="generic" title="전체송달문서" />
              <SbItem label="작성중서류" page="generic" title="작성중서류" />
              <SbItem label="제출서류" page="submitted-docs" />
            </>
          )}

          <GrpHd label="납부/환급관리" gKey="납부환급관리" />
          {openGroups['납부환급관리'] && (
            <>
              <SbItem label="납부관리" page="pay" />
              <SbItem label="환급관리" page="generic" title="환급관리" />
            </>
          )}

          <GrpHd label="기득 열람" gKey="기득열람" />
          {openGroups['기득열람'] && (
            <>
              <SbItem label="열람신청" page="generic" title="열람신청" />
              <SbItem label="열람내역" page="generic" title="열람내역" />
            </>
          )}

          <GrpHd label="🎓 실습 전용" gKey="실습전용" gold />
          {openGroups['실습전용'] && (
            <>
              <SbItem label="📋 배정된 실습사건" page="assigned-cases" />
              <SbItem label="나의 실습기록" page="practice-records" />
              <SbItem label="제출서류 확인" page="submitted-docs" />
            </>
          )}

          <GrpHd label="나의정보관리" gKey="나의정보관리" />
          {openGroups['나의정보관리'] && (
            <>
              <SbItem label="사용자정보변경" page="myinfo-user" />
              <SbItem label="비밀번호변경" page="myinfo-pw" />
            </>
          )}
        </aside>

        {/* Main */}
        <main style={{ flex: 1, background: '#fff', border: '1px solid #d0d8e8', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.06)', minHeight: 500, overflow: 'hidden' }}>
          {renderContent()}
        </main>
      </div>

      <Footer />
    </div>
  )
}
