'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MockBar from '@/components/layout/MockBar'
import GnbNav from '@/components/layout/GnbNav'
import Footer from '@/components/layout/Footer'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Assignment, PracticeRecord, SampleCase } from '@/types'

type ActivePage =
  | 'status'
  | 'assigned-cases'
  | 'practice-records'
  | 'case-proceeding'
  | 'interest-cases'
  | 'confirmed-cases'
  | 'completed-cases'
  | 'draft-docs'
  | 'submitted-docs'

const SCHEDULE_ITEMS = [
  { date: '2026-03-25', case: '서울중앙지방법원 2026가단12345', event: '1차 변론기일' },
  { date: '2026-04-10', case: '서울중앙지방법원 2026가단12346', event: '증거조사기일' },
  { date: '2026-05-08', case: '서울중앙지방법원 2026가단12347', event: '2차 변론기일' },
]

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? '#16a34a' : score >= 75 ? '#2563eb' : score >= 60 ? '#d97706' : '#dc2626'
  const bg =
    score >= 90 ? '#dcfce7' : score >= 75 ? '#dbeafe' : score >= 60 ? '#fef3c7' : '#fee2e2'
  return (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        color,
        border: `1px solid ${color}`,
        borderRadius: 6,
        padding: '2px 10px',
        fontWeight: 700,
        fontSize: 14,
        minWidth: 42,
        textAlign: 'center',
      }}
    >
      {score}
    </span>
  )
}

export default function MyPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activePage, setActivePage] = useState<ActivePage>('status')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    '나의사건관리': true,
    '사건진행': false,
    '나의문서함': false,
    '실습전용': true,
  })

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)

  const [practiceRecords, setPracticeRecords] = useState<PracticeRecord[]>([])
  const [practiceLoading, setPracticeLoading] = useState(false)
  const [expandedFeedback, setExpandedFeedback] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!loading && !user) router.push('/')
    if (!loading && user?.role === 'admin') router.push('/admin')
  }, [user, loading, router])

  useEffect(() => {
    if (activePage === 'assigned-cases' && user) {
      fetchAssignments()
    }
    if (activePage === 'practice-records' && user) {
      fetchPracticeRecords()
    }
    // preload for status widget
    if (activePage === 'status' && user) {
      fetchAssignments()
    }
  }, [activePage, user])

  async function fetchAssignments() {
    if (!user) return
    setAssignmentsLoading(true)
    const SURL = 'https://knpvayujykoqjncctxrr.supabase.co'
    const SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtucHZheXVqeWtvcWpuY2N0eHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzA3NDUsImV4cCI6MjA4OTE0Njc0NX0.rXlo5IsOW6FS5N1X3vgqNM1RvzB84TYPqVhnYyc6FSg'
    const res = await fetch(
      `${SURL}/rest/v1/assignments?select=*,sample_cases(*)&user_id=eq.${user.id}&order=id.desc`,
      { headers: { apikey: SKEY, Authorization: `Bearer ${SKEY}` } }
    )
    const data = await res.json()
    setAssignments(Array.isArray(data) ? data : [])
    setAssignmentsLoading(false)
  }

  async function fetchPracticeRecords() {
    if (!user) return
    setPracticeLoading(true)
    const { data } = await supabase
      .from('practice_records')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
    setPracticeRecords(data || [])
    setPracticeLoading(false)
  }

  function toggleGroup(g: string) {
    setOpenGroups(prev => ({ ...prev, [g]: !prev[g] }))
  }

  function handleCaseWrite(sc: SampleCase, docType: 'complaint' | 'answer' = 'complaint') {
    sessionStorage.setItem('assigned_case', JSON.stringify(sc))
    router.push(docType === 'answer' ? '/answer' : '/apply')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#0067c2', fontSize: 18 }}>로딩 중...</span>
      </div>
    )
  }

  if (!user || user.role === 'admin') return null

  // ────────────────────────────────────────────────────────────
  // Sidebar
  // ────────────────────────────────────────────────────────────
  const SidebarItem = ({
    label,
    page,
    indent = false,
  }: {
    label: string
    page: ActivePage
    indent?: boolean
  }) => (
    <div
      onClick={() => setActivePage(page)}
      style={{
        padding: indent ? '7px 16px 7px 32px' : '7px 16px',
        fontSize: 13,
        cursor: 'pointer',
        background: activePage === page ? '#e8f0fc' : 'transparent',
        color: activePage === page ? '#0067c2' : '#333',
        fontWeight: activePage === page ? 700 : 400,
        borderLeft: activePage === page ? '3px solid #0067c2' : '3px solid transparent',
        transition: 'all .15s',
      }}
    >
      {label}
    </div>
  )

  const GroupHeader = ({
    label,
    groupKey,
    gold,
  }: {
    label: string
    groupKey: string
    gold?: boolean
  }) => (
    <div
      onClick={() => toggleGroup(groupKey)}
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
      <span>{openGroups[groupKey] ? '▲' : '▼'}</span>
    </div>
  )

  // ────────────────────────────────────────────────────────────
  // Status page content
  // ────────────────────────────────────────────────────────────
  const StatusContent = () => (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a3a6b', margin: 0 }}>나의사건현황</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '5px 14px', fontSize: 12, border: '1px solid #b0bec5', background: '#fff', borderRadius: 4, cursor: 'pointer' }}>나의 메뉴 추가</button>
          <button style={{ padding: '5px 14px', fontSize: 12, border: '1px solid #b0bec5', background: '#fff', borderRadius: 4, cursor: 'pointer' }}>출력</button>
        </div>
      </div>

      {/* 2-column top boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* 나의 사건관리 */}
        <div style={{ border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: '#1a3a6b', color: '#fff', padding: '10px 16px', fontSize: 14, fontWeight: 700 }}>나의 사건관리</div>
          <div style={{ padding: '16px', display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0067c2' }}>3</div>
              <div style={{ fontSize: 12, color: '#666' }}>진행중사건</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#333' }}>0</div>
              <div style={{ fontSize: 12, color: '#666' }}>미확인송달</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#333' }}>0</div>
              <div style={{ fontSize: 12, color: '#666' }}>관심사건</div>
            </div>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <button style={{ width: '100%', padding: '7px', fontSize: 13, border: '1px solid #0067c2', color: '#0067c2', background: '#f0f6ff', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>사건등록</button>
          </div>
        </div>

        {/* 나의 문서함 */}
        <div style={{ border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: '#1a3a6b', color: '#fff', padding: '10px 16px', fontSize: 14, fontWeight: 700 }}>나의 문서함</div>
          <div style={{ padding: '16px', display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#333' }}>0</div>
              <div style={{ fontSize: 12, color: '#666' }}>임시저장</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#333' }}>0</div>
              <div style={{ fontSize: 12, color: '#666' }}>제출서류</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#333' }}>0</div>
              <div style={{ fontSize: 12, color: '#666' }}>확정된사건</div>
            </div>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <button style={{ width: '100%', padding: '7px', fontSize: 13, border: '1px solid #ccc', color: '#555', background: '#fafafa', borderRadius: 4, cursor: 'pointer' }}>문서함 바로가기</button>
          </div>
        </div>
      </div>

      {/* Teal quick-bar */}
      <div style={{ display: 'flex', background: '#00796b', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
        {['각종신청', '재판일정'].map((item, i) => (
          <div
            key={item}
            style={{
              flex: 1,
              padding: '10px',
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,.3)' : 'none',
            }}
          >
            {item}
          </div>
        ))}
      </div>

      {/* 2x2 widget grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 재판일정 */}
        <div style={{ border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: '#1a3a6b', color: '#fff', padding: '8px 14px', fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
            <span>📅 재판일정</span>
          </div>
          <div style={{ padding: 12 }}>
            {SCHEDULE_ITEMS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < 2 ? '1px solid #f0f0f0' : 'none' }}>
                <span style={{ fontSize: 11, background: '#e8f0fc', color: '#0067c2', padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap', fontWeight: 600 }}>{s.date}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.case}</div>
                  <div style={{ fontSize: 11, color: '#0067c2' }}>{s.event}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 미확인 송달문서 */}
        <div style={{ border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: '#1a3a6b', color: '#fff', padding: '8px 14px', fontSize: 13, fontWeight: 700 }}>📬 미확인 송달문서</div>
          <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>미확인 송달문서가 없습니다.</div>
        </div>

        {/* 작성중 서류 */}
        <div style={{ border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: '#1a3a6b', color: '#fff', padding: '8px 14px', fontSize: 13, fontWeight: 700 }}>📝 작성중 서류</div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              onClick={() => router.push('/apply')}
              style={{ padding: '10px 14px', border: '2px dashed #0067c2', borderRadius: 6, textAlign: 'center', color: '#0067c2', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              새 소장 작성하기 +
            </div>
            <div
              onClick={() => router.push('/answer')}
              style={{ padding: '10px 14px', border: '2px dashed #16a34a', borderRadius: 6, textAlign: 'center', color: '#16a34a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              새 답변서 작성하기 +
            </div>
          </div>
        </div>

        {/* 배정된 실습사건 preview */}
        <div style={{ border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(90deg,#7c5800,#b8922a)', color: '#ffe082', padding: '8px 14px', fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📋 배정된 실습사건</span>
            <span
              onClick={() => setActivePage('assigned-cases')}
              style={{ fontSize: 11, cursor: 'pointer', opacity: 0.85 }}
            >
              전체보기 →
            </span>
          </div>
          <div style={{ padding: 12 }}>
            {assignmentsLoading ? (
              <div style={{ textAlign: 'center', color: '#999', fontSize: 13, padding: 8 }}>로딩 중...</div>
            ) : assignments.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', fontSize: 13, padding: 8 }}>배정된 사건이 없습니다.</div>
            ) : (
              assignments.slice(0, 2).map(a => (
                <div
                  key={a.id}
                  onClick={() => setActivePage('assigned-cases')}
                  style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                >
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

  // ────────────────────────────────────────────────────────────
  // Assigned cases content
  // ────────────────────────────────────────────────────────────
  const AssignedCasesContent = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a3a6b', margin: 0 }}>📋 배정된 실습사건</h2>
        <span style={{ fontSize: 13, color: '#666' }}>총 {assignments.length}건</span>
      </div>

      {assignmentsLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#0067c2', fontSize: 16 }}>로딩 중...</div>
      ) : assignments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999', fontSize: 15 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          배정된 실습사건이 없습니다.<br />
          <span style={{ fontSize: 13 }}>관리자가 사건을 배정하면 여기에 표시됩니다.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {assignments.map(a => {
            const sc = a.sample_cases
            const statusColor = a.status === 'completed' ? '#16a34a' : a.status === 'in_progress' ? '#2563eb' : '#666'
            const statusLabel = a.status === 'completed' ? '완료' : a.status === 'in_progress' ? '진행중' : '대기중'
            return (
              <div key={a.id} style={{ border: '1px solid #d0d8e8', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                {/* Card header */}
                <div style={{ background: 'linear-gradient(135deg,#1a3a6b,#2952a3)', color: '#fff', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{sc?.title || '사건명 없음'}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{sc?.case_type} | {sc?.court}</div>
                  </div>
                  <span style={{ background: statusColor, color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap', marginTop: 2 }}>
                    {statusLabel}
                  </span>
                </div>
                {/* Card body */}
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 11, color: '#999' }}>원고 </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{sc?.plaintiff || '-'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#999' }}>피고 </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{sc?.defendant || '-'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#999' }}>배정일 </span>
                      <span style={{ fontSize: 13 }}>{a.assigned_at?.slice(0, 10)}</span>
                    </div>
                    {sc?.difficulty && (
                      <div>
                        <span style={{ fontSize: 11, color: '#999' }}>난이도 </span>
                        <span style={{ fontSize: 13 }}>{sc.difficulty}</span>
                      </div>
                    )}
                  </div>
                  {sc?.background && (
                    <div style={{ fontSize: 13, color: '#444', background: '#f8f9fb', padding: '8px 12px', borderRadius: 6, marginBottom: 8, lineHeight: 1.6 }}>
                      {sc.background}
                    </div>
                  )}
                  {sc?.key_facts && (
                    <div style={{ fontSize: 12, color: '#555', background: '#fffbf0', border: '1px solid #f0e0b0', padding: '8px 12px', borderRadius: 6, marginBottom: 12, lineHeight: 1.6 }}>
                      <strong style={{ color: '#7c5800' }}>사실관계: </strong>{sc.key_facts}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => sc && handleCaseWrite(sc, 'complaint')}
                      style={{ padding: '9px 0', background: 'linear-gradient(90deg,#0067c2,#0052a3)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', flex: 1 }}
                    >
                      📝 소장 작성
                    </button>
                    <button
                      onClick={() => sc && handleCaseWrite(sc, 'answer')}
                      style={{ padding: '9px 0', background: 'linear-gradient(90deg,#16a34a,#15803d)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', flex: 1 }}
                    >
                      ✍️ 답변서 작성
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

  // ────────────────────────────────────────────────────────────
  // Practice records content
  // ────────────────────────────────────────────────────────────
  const PracticeRecordsContent = () => {
    const avg = practiceRecords.length > 0
      ? Math.round(practiceRecords.reduce((s, r) => s + r.score, 0) / practiceRecords.length)
      : 0
    const best = practiceRecords.length > 0 ? Math.max(...practiceRecords.map(r => r.score)) : 0

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a3a6b', margin: 0 }}>📈 나의 실습기록</h2>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: '총 실습횟수', value: `${practiceRecords.length}회`, color: '#0067c2' },
            { label: '평균점수', value: `${avg}점`, color: avg >= 75 ? '#16a34a' : avg >= 60 ? '#d97706' : '#dc2626' },
            { label: '최고점수', value: `${best}점`, color: '#7c3aed' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #d0d8e8', borderRadius: 8, padding: '16px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.05)' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{practiceLoading ? '-' : s.value}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {practiceLoading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#0067c2', fontSize: 16 }}>로딩 중...</div>
        ) : practiceRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999', fontSize: 15 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            실습 기록이 없습니다.<br />
            <span style={{ fontSize: 13 }}>소장을 작성하고 제출하면 AI가 채점합니다.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {practiceRecords.map((r, i) => (
              <div key={r.id} style={{ border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#f7f9fc', borderBottom: '1px solid #e8edf5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: '#999' }}>#{i + 1}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
                      background: r.doc_type === 'answer' ? '#dcfce7' : '#dbeafe',
                      color: r.doc_type === 'answer' ? '#15803d' : '#1d4ed8',
                    }}>
                      {r.doc_type === 'answer' ? '답변서' : '소장'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a3a6b' }}>
                      {r.case_type || '사건'} — {r.court || '법원 미정'}
                    </span>
                    <span style={{ fontSize: 11, color: '#666' }}>
                      {r.plaintiff || '-'} vs {r.defendant || '-'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ScoreBadge score={r.score} />
                    <span style={{ fontSize: 11, color: '#999' }}>{r.created_at?.slice(0, 10)}</span>
                  </div>
                </div>
                {r.feedback && (
                  <div style={{ padding: '10px 16px' }}>
                    <div
                      onClick={() => setExpandedFeedback(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: expandedFeedback[r.id] ? 8 : 0 }}
                    >
                      <span style={{ fontSize: 12, color: '#0067c2', fontWeight: 600 }}>🤖 AI 피드백</span>
                      <span style={{ fontSize: 11, color: '#999' }}>{expandedFeedback[r.id] ? '▲ 접기' : '▼ 펼치기'}</span>
                    </div>
                    {expandedFeedback[r.id] && (
                      <div style={{ fontSize: 13, color: '#444', background: '#f8f9fb', padding: '10px 14px', borderRadius: 6, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {r.feedback}
                      </div>
                    )}
                  </div>
                )}
                {r.evidence_count !== undefined && (
                  <div style={{ padding: '6px 16px 10px', display: 'flex', gap: 16 }}>
                    <span style={{ fontSize: 11, color: '#888' }}>증거 {r.evidence_count}건</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const PlaceholderContent = ({ title }: { title: string }) => (
    <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔧</div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 13, marginTop: 8 }}>준비 중입니다.</div>
    </div>
  )

  function renderContent() {
    switch (activePage) {
      case 'status': return <StatusContent />
      case 'assigned-cases': return <AssignedCasesContent />
      case 'practice-records': return <PracticeRecordsContent />
      case 'case-proceeding': return <PlaceholderContent title="재판일정" />
      case 'interest-cases': return <PlaceholderContent title="관심사건" />
      case 'confirmed-cases': return <PlaceholderContent title="확정된사건" />
      case 'completed-cases': return <PlaceholderContent title="완료된사건" />
      case 'draft-docs': return <PlaceholderContent title="작성중서류" />
      case 'submitted-docs': return <PlaceholderContent title="제출서류" />
      default: return <StatusContent />
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', flexDirection: 'column' }}>
      <MockBar />
      <GnbNav active="나의전자소송" />

      {/* Breadcrumb */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8edf5', padding: '8px 20px', fontSize: 12, color: '#666' }}>
        <span style={{ maxWidth: 1200, margin: '0 auto', display: 'block' }}>
          홈 &gt; <strong style={{ color: '#1a3a6b' }}>나의전자소송</strong>
          {activePage !== 'status' && (
            <> &gt; <strong style={{ color: '#0067c2' }}>
              {activePage === 'assigned-cases' ? '배정된 실습사건' :
               activePage === 'practice-records' ? '나의 실습기록' :
               activePage === 'case-proceeding' ? '재판일정' : activePage}
            </strong></>
          )}
        </span>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, maxWidth: 1200, margin: '20px auto', width: '100%', padding: '0 20px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Left sidebar */}
        <aside style={{ width: 190, flexShrink: 0, background: '#fff', border: '1px solid #d0d8e8', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          {/* Sidebar header */}
          <div style={{ background: 'linear-gradient(135deg,#1a3a6b,#2952a3)', color: '#fff', padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>
            📁 나의전자소송
          </div>

          {/* 나의사건현황 (always visible, highlighted) */}
          <div
            onClick={() => setActivePage('status')}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              cursor: 'pointer',
              background: activePage === 'status' ? '#1a3a6b' : '#eef2fb',
              color: activePage === 'status' ? '#fff' : '#1a3a6b',
              fontWeight: 700,
              borderBottom: '1px solid #d0d8e8',
            }}
          >
            나의사건현황
          </div>

          {/* 나의사건관리 group */}
          <GroupHeader label="나의사건관리" groupKey="나의사건관리" />
          {openGroups['나의사건관리'] && (
            <>
              <SidebarItem label="진행중사건" page="status" indent />
              <SidebarItem label="관심사건" page="interest-cases" indent />
              <SidebarItem label="확정된사건" page="confirmed-cases" indent />
              <SidebarItem label="완료된사건" page="completed-cases" indent />
            </>
          )}

          {/* 사건진행 group */}
          <GroupHeader label="사건진행" groupKey="사건진행" />
          {openGroups['사건진행'] && (
            <SidebarItem label="재판일정" page="case-proceeding" indent />
          )}

          {/* 나의문서함 group */}
          <GroupHeader label="나의문서함" groupKey="나의문서함" />
          {openGroups['나의문서함'] && (
            <>
              <SidebarItem label="작성중서류" page="draft-docs" indent />
              <SidebarItem label="제출서류" page="submitted-docs" indent />
            </>
          )}

          {/* 실습 전용 group */}
          <GroupHeader label="🎓 실습 전용" groupKey="실습전용" gold />
          {openGroups['실습전용'] && (
            <>
              <SidebarItem label="📋 배정된 실습사건" page="assigned-cases" indent />
              <SidebarItem label="나의 실습기록" page="practice-records" indent />
            </>
          )}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, background: '#fff', border: '1px solid #d0d8e8', borderRadius: 8, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,.06)', minHeight: 500 }}>
          {renderContent()}
        </main>
      </div>

      <Footer />
    </div>
  )
}
