'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import MockBar from '@/components/layout/MockBar'
import GnbNav from '@/components/layout/GnbNav'
import Footer from '@/components/layout/Footer'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { calculateScore, generateFeedback } from '@/lib/scoring'

import { SB_URL, SB_KEY, SB_HDR } from '@/lib/supabase'

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
  | 'ecfs-reg'
  | 'pay'
  | 'myinfo-user'
  | 'myinfo-pw'
  | 'all-delivery'
  | 'unread-delivery'
  | 'alert-service'
  | 'doc-history'
  | 'delivery-detail'
  | 'submit-detail'
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

interface ViewDocCase {
  caseNo: string; court: string; dept: string
  plaintiff: string; defendant: string; caseName: string
}
interface DocItem {
  no: number; docName: string; gubun: '송달' | '제출'
  submitDate: string; delivDate: string; confirmDate: string
  docSubmitNo?: string; sender?: string; submitter?: string
}

interface PracticeRecord {
  id: string
  student_id?: string
  user_id?: string
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
  complaint_data?: unknown
  case_id?: string
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
    '국선전담사건': false,
    '각종신청': false,
    '나의문서함': false,
    '납부환급관리': false,
    '기록열람': false,
    '전자소송사건등록': false,
    '맞춤형문서함': false,
    '실습전용': true,
    '나의정보관리': false,
  })

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignDebug, setAssignDebug] = useState<string>('')
  const [allCases, setAllCases] = useState<Assignment[]>([])  // B방식: 전체 sample_cases
  const [allCasesLoading, setAllCasesLoading] = useState(false)
  const [practiceRecords, setPracticeRecords] = useState<PracticeRecord[]>([])
  const [localRecords, setLocalRecords] = useState<PracticeRecord[]>([])
  const [practiceLoading, setPracticeLoading] = useState(false)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [syncToast, setSyncToast] = useState('')
  const [expandedFeedback, setExpandedFeedback] = useState<Record<string, boolean>>({})
  const [viewDocCase, setViewDocCase] = useState<ViewDocCase | null>(null)
  const [viewDocItem, setViewDocItem] = useState<DocItem | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/')
    if (!loading && user?.role === 'admin') router.push('/admin')
  }, [user, loading, router])

  const fetchControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!user) return
    // 이전 fetch들을 abort하여 unmount/재실행 시 stale 업데이트 방지
    fetchControllerRef.current?.abort()
    fetchControllerRef.current = new AbortController()

    if (activePage === 'active-cases' || activePage === 'status') fetchAllCases()
    if (activePage === 'assigned-cases' || activePage === 'status') fetchAssignments()
    if (activePage === 'practice-records' || activePage === 'submitted-docs') fetchPracticeRecords()

    return () => { fetchControllerRef.current?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setAssignError(null)
    const debugLines: string[] = [`user.id = ${user.id}`]
    try {
      // 1단계: Supabase user_id 조회
      let sbRows: Record<string, unknown>[] = []
      const res = await fetch(
        `${SB_URL}/rest/v1/assignments?user_id=eq.${encodeURIComponent(user.id)}&select=*`,
        { headers: SB_HDR }
      )
      const d = await res.json()
      debugLines.push(`Supabase 응답 (status ${res.status}): ${JSON.stringify(d).slice(0, 300)}`)
      if (Array.isArray(d) && !(d[0]?.code)) sbRows = d

      // 2단계: localStorage
      const localAll: Record<string, unknown>[] = JSON.parse(localStorage.getItem('ec_assignments') || '[]')
      const localRows = localAll.filter(r => r.user_id === user.id || r.student_id === user.id)
      debugLines.push(`localStorage 건수: ${localRows.length}`)

      const seen = new Set<string>()
      const combined = [...sbRows, ...localRows].filter(r => {
        const key = `${r.user_id || r.student_id}-${r.case_id}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      debugLines.push(`합계: ${combined.length}건`)
      setAssignDebug(debugLines.join('\n'))

      // 3단계: case_id로 sample_cases 별도 조회
      const caseIds = [...new Set(combined.map(r => r.case_id).filter(Boolean))]
      let caseMap: Record<string | number, unknown> = {}
      if (caseIds.length > 0) {
        try {
          const caseRes = await fetch(
            `${SB_URL}/rest/v1/sample_cases?id=in.(${caseIds.join(',')})&select=*`,
            { headers: SB_HDR }
          )
          const cases = await caseRes.json()
          if (Array.isArray(cases)) {
            cases.forEach((c: Record<string, unknown>) => { caseMap[c.id as string | number] = c })
          }
        } catch { /* ignore */ }
      }

      const result: Assignment[] = combined.map(r => ({
        id: r.id as number,
        student_id: (r.user_id || r.student_id || '') as string,
        status: (r.status || '미제출') as string,
        assigned_at: (r.assigned_at || r.created_at || new Date().toISOString()) as string,
        case_id: r.case_id as string,
        sample_cases: (caseMap[r.case_id as string | number] || {}) as Assignment['sample_cases'],
      }))

      setAssignments(result)
    } catch (err) {
      debugLines.push(`예외: ${String(err)}`)
      setAssignDebug(debugLines.join('\n'))
      setAssignments([])
    }
    setAssignmentsLoading(false)
  }

  function loadLocalRecords() {
    if (!user) return
    try {
      const all = JSON.parse(localStorage.getItem('ecfs_practice_records') || '[]')
      setLocalRecords(all.filter((r: PracticeRecord & { student_id?: string }) => r.student_id === user.id))
    } catch { setLocalRecords([]) }
  }

  async function fetchPracticeRecords() {
    if (!user) return
    setPracticeLoading(true)
    // Supabase에서 이미 제출된 기록
    try {
      const res = await fetch(`${SB_URL}/rest/v1/practice_records?student_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc&limit=50`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      })
      const data = await res.json()
      setPracticeRecords(Array.isArray(data) && !data[0]?.code ? data : [])
    } catch { setPracticeRecords([]) }
    // localStorage에서 미제출 기록
    loadLocalRecords()
    setPracticeLoading(false)
  }

  async function submitRecord(r: PracticeRecord) {
    if (!user) return
    setSubmittingId(r.id)
    try {
      let score = r.score || 0
      let feedback = r.feedback || ''
      let breakdown = (r as unknown as Record<string, unknown>).grade_breakdown
      const docType = r.doc_type || 'complaint'

      // AI 자동채점 시도
      if (!score || score === 0) {
        setSyncToast('🤖 AI 채점 중...')
        try {
          const mockCase = {
            id: 'manual', title: r.case_type || '', case_type: r.case_type || '',
            court: r.court || '', plaintiff: r.plaintiff || '', defendant: r.defendant || '',
            created_at: new Date().toISOString(),
          }
          const gradeRes = await fetch('/api/grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formData: r.complaint_data || r, sampleCase: mockCase, doc_type: docType }),
          })
          if (gradeRes.ok) {
            const aiResult = await gradeRes.json()
            if (aiResult.score > 0) {
              score = aiResult.score; feedback = aiResult.feedback || ''; breakdown = aiResult.breakdown
            }
          }
        } catch { /* AI 실패 시 클라이언트 채점 */ }

        if (!score || score === 0) {
          const res = calculateScore(r.complaint_data || r)
          score = res.score; breakdown = res.breakdown
          feedback = generateFeedback(score, res.breakdown, docType as 'complaint' | 'answer')
        }
      }

      const payload = {
        id: r.id,
        student_id: r.student_id || user.id,
        user_name: r.user_name || user.name,
        doc_type: docType,
        case_type: r.case_type,
        court: r.court,
        plaintiff: r.plaintiff,
        defendant: r.defendant,
        has_agent: r.has_agent,
        evidence_count: r.evidence_count,
        score,
        feedback,
        grade_breakdown: breakdown,
        complaint_data: r.complaint_data,
        case_id: (r as unknown as Record<string, unknown>).case_id || null,
        submitted_at: (r as unknown as Record<string, unknown>).submitted_at || r.created_at,
      }
      const sbRes = await fetch('/api/practice/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (sbRes.ok) {
        const all = JSON.parse(localStorage.getItem('ecfs_practice_records') || '[]')
        localStorage.setItem('ecfs_practice_records', JSON.stringify(all.filter((x: { id: string }) => x.id !== r.id)))
        setSyncToast('✅ 제출 완료! AI 채점 결과가 반영되었습니다.')
        setTimeout(() => setSyncToast(''), 3000)
        await fetchPracticeRecords()
      } else {
        const errJson = await sbRes.json().catch(() => ({}))
        const msg = errJson.error || errJson.message || sbRes.status
        console.error('[submitRecord] failed:', sbRes.status, errJson)
        setSyncToast(`제출 실패: ${msg}`)
        setTimeout(() => setSyncToast(''), 5000)
      }
    } catch (e) {
      setSyncToast('제출 오류: ' + String(e))
      setTimeout(() => setSyncToast(''), 3000)
    }
    setSubmittingId(null)
  }

  function toggleGroup(g: string) {
    setOpenGroups(prev => ({ ...prev, [g]: !prev[g] }))
  }

  function goToApply(sc: Assignment['sample_cases']) {
    sessionStorage.setItem('assigned_case', JSON.stringify(sc))
    router.push('/apply?new=true')
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
  const SbItem = ({ label, page, title = '', indent = true }: { label: string; page: ActivePage; title?: string; indent?: boolean }) => {
    const isActive = activePage === page && (title === genericTitle || !title)
    return (
      <div
        onClick={() => navTo(page, title || label)}
        style={{
          padding: indent ? '7px 16px 7px 28px' : '7px 16px',
          fontSize: 13,
          cursor: 'pointer',
          background: isActive ? '#eef4ff' : '#fff',
          color: isActive ? '#0067c2' : '#444',
          fontWeight: isActive ? 600 : 400,
          borderBottom: '1px solid #eef0f5',
          borderLeft: isActive ? '3px solid #0067c2' : '3px solid transparent',
        }}
      >
        {label}
      </div>
    )
  }

  const GrpHd = ({ label, gKey, gold }: { label: string; gKey: string; gold?: boolean }) => (
    <div
      onClick={() => toggleGroup(gKey)}
      style={{
        padding: '9px 16px',
        fontSize: 13,
        fontWeight: 600,
        background: gold ? '#7c5800' : '#f0f2f6',
        color: gold ? '#ffe082' : '#333',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        userSelect: 'none',
        borderBottom: '1px solid #dde0ea',
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 10, color: gold ? '#ffe082' : '#999' }}>{openGroups[gKey] ? '▲' : '▼'}</span>
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

  // ── 사건기본정보 공용 테이블 ──────────────────────────────────
  const CaseInfoTable = ({ ci }: { ci: ViewDocCase }) => {
    const thS: React.CSSProperties = { padding:'8px 14px', background:'#f5f6fa', fontWeight:600, color:'#555', width:'12%', textAlign:'left', whiteSpace:'nowrap', borderBottom:'1px solid #eee', fontSize:12 }
    const tdS: React.CSSProperties = { padding:'8px 14px', width:'38%', fontSize:12, borderBottom:'1px solid #eee' }
    return (
      <div style={{ background:'#fff' }}>
        <div style={{ padding:'8px 14px', fontSize:13, fontWeight:700, color:'#003366', borderBottom:'1px solid #dde0e8', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ color:'#0098a3', fontSize:15 }}>○</span> 사건기본정보
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <tbody>
            <tr>
              <th style={thS}>법원</th><td style={tdS}>{ci.court}</td>
              <th style={thS}>사건번호</th><td style={{...tdS, fontWeight:600, color:'#0057a8'}}>{ci.caseNo}</td>
            </tr>
            <tr>
              <th style={thS}>재판부</th><td style={tdS}>{ci.dept}</td>
              <th style={thS}>사건명</th><td style={tdS}>{ci.caseName}</td>
            </tr>
            <tr>
              <th style={{...thS, borderBottom:'none'}}>원고</th><td style={{...tdS, borderBottom:'none'}}>{ci.plaintiff}</td>
              <th style={{...thS, borderBottom:'none', background:'#fff0f0', color:'#c0392b'}}>피고</th>
              <td style={{...tdS, borderBottom:'none'}}>{ci.defendant}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  // ── STATUS PAGE ──────────────────────────────────────────────
  const StatusContent = () => {
    const TC = '#0098a3' // teal color

    const WBox = ({ title, onPlus, children }: { title: string; onPlus?: () => void; children: React.ReactNode }) => (
      <div style={{ border: '1px solid #d0d8e8', borderRadius: 6, background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8edf0' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#222', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: TC, fontSize: 16, lineHeight: 1 }}>○</span> {title}
          </span>
          <button onClick={onPlus} style={{ width: 22, height: 22, border: '1px solid #c8cdd6', background: '#f5f6fa', borderRadius: 3, cursor: 'pointer', fontSize: 15, lineHeight: '20px', color: '#555', fontFamily: 'inherit', padding: 0 }}>+</button>
        </div>
        {children}
      </div>
    )

    return (
      <div>
        <PageHd title="나의사건현황" actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />

        {/* 상단 카드 2개 */}
        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 12, padding: 16, background: '#fff', borderBottom: '1px solid #eee' }}>

          {/* 나의 사건관리 */}
          <div style={{ border: '1px solid #d0d8e8', borderRadius: 6, background: '#fff', padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#222', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: TC, fontSize: 16, lineHeight: 1 }}>○</span> 나의 사건관리
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ flex: 1, display: 'flex' }}>
                {[
                  { n: allCases.length, l: '진행중사건' },
                  { n: getUnreadDocs().filter(d => !d.confirmed).length, l: '미확인송달' },
                  { n: 0, l: '관심사건' },
                ].map(({ n, l }) => (
                  <div key={l} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 30, fontWeight: 700, color: '#222', lineHeight: 1.1 }}>{allCasesLoading ? '…' : n}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{l}</div>
                  </div>
                ))}
              </div>
              {/* 원형 아이콘 */}
              <div style={{ width: 62, height: 62, borderRadius: '50%', border: '2px dashed #c8cdd6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, color: '#8899bb' }}>📋</div>
            </div>
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button onClick={() => router.push('/apply?new=true')} style={{ padding: '7px 32px', background: TC, color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                사건등록
              </button>
            </div>
          </div>

          {/* 나의 문서함 */}
          <div style={{ border: '1px solid #d0d8e8', borderRadius: 6, background: '#fff', padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#222', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: TC, fontSize: 16, lineHeight: 1 }}>○</span> 나의 문서함
            </div>
            <div style={{ display: 'flex' }}>
              {[
                { n: 0, l: '임시저장' },
                { n: 0, l: '전자서명' },
                { n: practiceRecords.length, l: '제출대기' },
              ].map(({ n, l }, i) => (
                <div key={l} style={{ flex: 1, textAlign: 'center', borderLeft: i > 0 ? '1px solid #eee' : 'none' }}>
                  <div style={{ fontSize: 30, fontWeight: 700, color: '#222', lineHeight: 1.1 }}>{n}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', margin: '0', background: TC }}>
          {[
            { label: '각종신청', action: () => navTo('alert-service') },
            { label: '재판일정', action: () => navTo('schedule') },
          ].map(({ label, action }, i) => (
            <div
              key={label}
              onClick={action}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 18px', cursor: 'pointer', borderLeft: i > 0 ? '1px solid rgba(255,255,255,.3)' : 'none' }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 16, lineHeight: 1 }}>○</span> {label}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', whiteSpace: 'nowrap' }}>상세보기 &gt;</span>
            </div>
          ))}
        </div>

        {/* Widget grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 16, background: '#f5f6fa' }}>

          {/* 제증명 발급내역 */}
          <WBox title="제증명 발급내역" onPlus={() => navTo('generic', '제증명발급신청')}>
            <div style={{ padding: '8px 14px' }}>
              {[
                { caseNo: '2026가볼10218', type: '접수증명', date: '2026.02.05', extra: '' },
                { caseNo: '2024가다55226', type: '송달및확정증명', date: '2026.02.05', extra: '출력' },
              ].map(({ caseNo, type, date, extra }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i === 0 ? '1px solid #f0f0f0' : 'none', fontSize: 12 }}>
                  <span style={{ color: '#0057a8', textDecoration: 'underline', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 11 }}>· {caseNo}</span>
                  <span style={{ color: '#555', flex: 1 }}>{type}</span>
                  <span style={{ color: '#888', whiteSpace: 'nowrap' }}>{date}</span>
                  {extra && <span style={{ color: '#0067c2', cursor: 'pointer' }}>{extra}</span>}
                </div>
              ))}
            </div>
          </WBox>

          {/* 납부/환급관리 */}
          <WBox title="납부/환급관리" onPlus={() => navTo('pay')}>
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#bbb', fontSize: 12 }}>조회된 결과가 없습니다.</div>
          </WBox>

          {/* 사건별 게시판 */}
          <WBox title="사건별 게시판" onPlus={() => navTo('generic', '사건별게시판')}>
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#bbb', fontSize: 12 }}>게시된 내용이 없습니다.</div>
          </WBox>

          {/* 대조형 쟁점요약 */}
          <WBox title="대조형 쟁점요약" onPlus={() => navTo('generic', '대조형쟁점요약')}>
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#bbb', fontSize: 12 }}>조회된 결과가 없습니다.</div>
          </WBox>

        </div>
      </div>
    )
  }

  // ── ASSIGNED CASES ───────────────────────────────────────────
  const AssignedCasesContent = () => (
    <div>
      <PageHd title="배정된 실습사건" actions={<ActBtn label="🔄 새로고침" onClick={fetchAssignments} />} />
      <div style={{ padding: '8px 14px', background: '#e8f4fb', border: '1px solid #c8ddf5', borderBottom: '2px solid #006699', fontSize: 12, color: '#1a4a6b' }}>
        💡 배정된 사건의 사실관계를 읽고 <strong>소장 작성하기</strong> 버튼을 클릭해 소장을 작성하세요.
      </div>
      {assignmentsLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>⏳ 배정된 사건을 불러오는 중...</div>
      ) : assignError ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#fff3f3', border: '1px solid #f5c6c6', borderTop: 'none' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#c00', marginBottom: 8 }}>⚠️ 데이터 조회 오류</div>
          <div style={{ fontSize: 12, color: '#888', whiteSpace: 'pre-wrap' }}>{assignError}</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 12 }}>Supabase Dashboard → SQL Editor에서 아래 SQL을 실행해주세요:<br />
            <code style={{ background: '#f5f5f5', padding: '6px 10px', display: 'block', marginTop: 6, textAlign: 'left', fontSize: 11 }}>
              {`ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "allow_all" ON public.assignments FOR ALL USING (true) WITH CHECK (true);`}
            </code>
          </div>
        </div>
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
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4, gap: 8 }}>
                    <button onClick={() => goToApply(c)} style={{ height: 38, padding: '0 22px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      📝 소장 작성하기 →
                    </button>
                    <button onClick={() => { sessionStorage.setItem('assigned_case', JSON.stringify(c)); router.push('/answer'); }} style={{ height: 38, padding: '0 22px', background: '#fff', color: '#1a3a6b', border: '1px solid #1a3a6b', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      📋 답변서 작성하기 →
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

  // ── DRAFT DOCS ───────────────────────────────────────────────
  interface DraftItem {
    id: string
    savedAt: string
    userId: string
    title: string
    formData: unknown
  }

  const DraftDocsContent = () => {
    const [drafts, setDrafts] = useState<DraftItem[]>([])

    useEffect(() => {
      loadDrafts()
    }, [])

    function loadDrafts() {
      try {
        const all: DraftItem[] = JSON.parse(localStorage.getItem('ecfs_drafts') || '[]')
        setDrafts(all.filter(d => d.userId === user?.id))
      } catch { setDrafts([]) }
    }

    function deleteDraft(id: string) {
      if (!confirm('삭제하시겠습니까?')) return
      try {
        const all: DraftItem[] = JSON.parse(localStorage.getItem('ecfs_drafts') || '[]')
        localStorage.setItem('ecfs_drafts', JSON.stringify(all.filter(d => d.id !== id)))
        loadDrafts()
      } catch { /* ignore */ }
    }

    return (
      <div>
        <PageHd title="작성중서류" actions={<ActBtn label="📋 새 소장 작성" onClick={() => router.push('/apply?new=true')} primary />} />
        {drafts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: '#fff', border: '1px solid #dde0e8', borderTop: 'none' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#003366', marginBottom: 8 }}>임시저장된 서류가 없습니다</div>
            <div style={{ fontSize: 12, color: '#888' }}>소장 작성 중 [임시저장] 버튼을 클릭하면 여기에 저장됩니다.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #dde0e8', borderTop: 'none' }}>
            <thead>
              <tr style={{ background: '#f0f2f6', borderBottom: '2px solid #c8d0dc' }}>
                <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, textAlign: 'left', color: '#333' }}>제목</th>
                <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, textAlign: 'center', color: '#333', width: 160 }}>저장일시</th>
                <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, textAlign: 'center', color: '#333', width: 160 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '11px 14px', fontSize: 13 }}>📄 {d.title}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#666', textAlign: 'center' }}>
                    {new Date(d.savedAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                    <button onClick={() => router.push(`/apply?draftId=${d.id}`)} style={{ height: 30, padding: '0 14px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginRight: 6, fontFamily: 'inherit' }}>이어쓰기</button>
                    <button onClick={() => deleteDraft(d.id)} style={{ height: 30, padding: '0 14px', background: '#fff', color: '#c00', border: '1px solid #fca5a5', borderRadius: 3, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  // ── PRACTICE RECORDS ─────────────────────────────────────────
  const RecordCard = ({ r, isLocal }: { r: PracticeRecord; isLocal?: boolean }) => (
    <div style={{ borderBottom: '1px solid #eaecf4', padding: '16px 20px', background: isLocal ? '#fffbeb' : '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ background: bgFn(r.score), borderRadius: 8, padding: '12px 16px', textAlign: 'center', minWidth: 76, flexShrink: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: colorFn(r.score), lineHeight: 1 }}>{r.score}</div>
          <div style={{ fontSize: 10, color: colorFn(r.score), marginTop: 2 }}>/ 100점</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: colorFn(r.score), marginTop: 4 }}>{gradeFn(r.score).split(' ')[1]}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, background: r.doc_type === 'answer' ? '#e0e7ff' : '#dcfce7', color: r.doc_type === 'answer' ? '#3730a3' : '#166534', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{r.doc_type === 'answer' ? '답변서' : '소장'}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#003366' }}>{r.case_type || (r.doc_type === 'answer' ? '답변서 실습' : '소장 실습')}</span>
            <span style={{ fontSize: 11, color: '#888' }}>{r.court || ''}</span>
            {isLocal && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>미제출</span>}
            <span style={{ fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>{r.created_at?.slice(0, 10) || ''}</span>
          </div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
            원고: {r.plaintiff || '–'} | 피고: {r.defendant || '–'} | 입증서류: {r.evidence_count || 0}건
          </div>
          {r.feedback && (
            <div style={{ background: '#f8f9fc', border: '1px solid #e0e6ee', borderRadius: 4, padding: '10px 12px', marginBottom: isLocal ? 8 : 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#003366', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                📋 채점 피드백
                <button onClick={() => setExpandedFeedback(prev => ({ ...prev, [r.id]: !prev[r.id] }))} style={{ background: 'none', border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 10, padding: '1px 6px', cursor: 'pointer', color: '#555', marginLeft: 'auto', fontFamily: 'inherit' }}>
                  {expandedFeedback[r.id] ? '접기' : '펼치기'}
                </button>
              </div>
              {expandedFeedback[r.id] && (
                <div style={{ fontSize: 11, color: '#444', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{r.feedback}</div>
              )}
            </div>
          )}
          {isLocal && (
            <button
              onClick={() => submitRecord(r)}
              disabled={submittingId === r.id}
              style={{ height: 32, padding: '0 16px', background: submittingId === r.id ? '#ccc' : '#0067c2', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: submittingId === r.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              {submittingId === r.id ? '제출 중…' : '☁ admin에 제출'}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const PracticeRecordsContent = () => {
    const allRecords = [...practiceRecords]
    const avgScore = allRecords.length ? Math.round(allRecords.reduce((s, r) => s + r.score, 0) / allRecords.length) : 0
    const best = allRecords.length ? Math.max(...allRecords.map(r => r.score)) : 0
    return (
      <div>
        <PageHd title="나의 실습기록" actions={<ActBtn label="📋 소장 작성하기" onClick={() => router.push('/apply?new=true')} primary />} />
        {syncToast && (
          <div style={{ margin: '8px 20px', padding: '10px 16px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, fontSize: 13, color: '#065f46', fontWeight: 600 }}>
            {syncToast}
          </div>
        )}
        <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #dde0e8', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { n: allRecords.length + localRecords.length, l: '총 실습 횟수', c: '#003366' },
            { n: avgScore || 0, l: '평균 점수', c: '#006699' },
            { n: best || 0, l: '최고 점수', c: '#15803d' },
            { n: localRecords.length, l: '미제출', c: localRecords.length > 0 ? '#d97706' : '#888' },
          ].map(({ n, l, c }) => (
            <div key={l} style={{ background: '#f0f4f8', borderRadius: 6, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: c }}>{practiceLoading ? '…' : n}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
        {practiceLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>⏳ 기록을 불러오는 중...</div>
        ) : (
          <div style={{ borderTop: '1px solid #eee' }}>
            {localRecords.length > 0 && (
              <>
                <div style={{ padding: '10px 20px', background: '#fffbeb', borderBottom: '1px solid #fcd34d', fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                  📤 미제출 기록 ({localRecords.length}건) — admin에 제출하면 실습 현황에 반영됩니다
                </div>
                {localRecords.map((r, i) => <RecordCard key={r.id || i} r={r} isLocal />)}
              </>
            )}
            {practiceRecords.length > 0 && (
              <>
                <div style={{ padding: '10px 20px', background: '#f0f4f8', borderBottom: '1px solid #dde0e8', fontSize: 12, color: '#003366', fontWeight: 600 }}>
                  ✅ 제출 완료 ({practiceRecords.length}건)
                </div>
                {practiceRecords.map((r, i) => <RecordCard key={r.id || i} r={r} />)}
              </>
            )}
            {localRecords.length === 0 && practiceRecords.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: '#aaa' }}>
                <div style={{ fontSize: 48, marginBottom: 14 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 8 }}>아직 실습 기록이 없습니다</div>
                <button onClick={() => router.push('/apply?new=true')} style={{ background: '#006699', color: '#fff', border: 'none', height: 38, padding: '0 20px', fontSize: 13, fontWeight: 700, borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit' }}>📋 지금 실습 시작하기</button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── SUBMITTED DOCS ───────────────────────────────────────────
  const SubmittedDocsContent = () => (
    <div>
      <PageHd title="제출서류" actions={<><ActBtn label="🖨 출력" /><ActBtn label="📋 새 소장 작성" onClick={() => router.push('/apply?new=true')} primary /></>} />
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
            <button onClick={() => router.push('/apply?new=true')} style={{ height: 38, padding: '0 20px', background: '#006699', color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>📋 소장 작성하기</button>
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
  const ScheduleContent = () => {
    const [calYear, setCalYear] = useState(2026)
    const [calMonth, setCalMonth] = useState(3)
    const [selectedDate, setSelectedDate] = useState<number | null>(null)

    type TrialEvent = { court: string; caseNo: string; dept: string; type: string; time: string; place: string; plaintiff: string; defendant: string }
    const TRIAL_EVENTS: Record<string, TrialEvent[]> = {
      '2026-3-12': [
        { court: '의정부지법', caseNo: '2025가단50357', dept: '제11 민사 부', type: '변론기일', time: '10:20', place: '제12호법정(제3별관 1층)', plaintiff: '이정무 외 10명', defendant: '이은철 외 1명' },
        { court: '서울서부지법', caseNo: '2023가단5727', dept: '민사21단독', type: '변론기일', time: '10:30', place: '제411호 법정', plaintiff: '진지훈 외 1명', defendant: '김용규 외 1명' },
      ],
      '2026-3-26': [
        { court: '서울남부지법', caseNo: '2024가단260874 (보소)', dept: '민사4단독', type: '변론기일', time: '10:20', place: '별관 법정 201호', plaintiff: '김시형', defendant: '김상우' },
      ],
    }

    const daysInMonth = new Date(calYear, calMonth, 0).getDate()
    // Build weeks (Mon–Fri only)
    const weeks: (number | null)[][] = []
    let week: (number | null)[] = [null, null, null, null, null]
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(calYear, calMonth - 1, d).getDay()
      if (dow === 0 || dow === 6) continue
      week[dow - 1] = d
      if (dow === 5) { weeks.push(week); week = [null, null, null, null, null] }
    }
    if (week.some(x => x !== null)) weeks.push(week)

    const getEvents = (d: number) => TRIAL_EVENTS[`${calYear}-${calMonth}-${d}`] || []
    const getCourtGroups = (d: number) => {
      const map: Record<string, number> = {}
      getEvents(d).forEach(e => { map[e.court] = (map[e.court] || 0) + 1 })
      return Object.entries(map)
    }

    const selEvents = selectedDate ? getEvents(selectedDate) : []

    return (
      <div style={{ fontFamily: 'inherit' }}>
        <PageHd title="재판일정" actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />

        {/* 필터 */}
        <div style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e0e4ec', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>소송유형</span>
          <select style={{ height: 30, border: '1px solid #c8cdd6', borderRadius: 3, padding: '0 6px', fontSize: 12, fontFamily: 'inherit' }}>
            <option>민사</option><option>형사</option><option>가사</option><option>행정</option><option>전체</option>
          </select>
          <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>법원</span>
          <select style={{ height: 30, border: '1px solid #c8cdd6', borderRadius: 3, padding: '0 6px', fontSize: 12, fontFamily: 'inherit' }}>
            <option>전체</option><option>서울중앙지법</option><option>서울서부지법</option><option>의정부지법</option><option>서울남부지법</option>
          </select>
          <button onClick={() => setCalMonth(m => m > 1 ? m - 1 : (setCalYear(y => y - 1), 12))} style={{ width: 26, height: 26, border: '1px solid #c8cdd6', background: '#fff', borderRadius: 3, cursor: 'pointer', fontSize: 15 }}>‹</button>
          <select value={calYear} onChange={e => setCalYear(Number(e.target.value))} style={{ height: 30, border: '1px solid #c8cdd6', borderRadius: 3, padding: '0 4px', fontSize: 12, fontFamily: 'inherit' }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <select value={calMonth} onChange={e => setCalMonth(Number(e.target.value))} style={{ height: 30, border: '1px solid #c8cdd6', borderRadius: 3, padding: '0 4px', fontSize: 12, fontFamily: 'inherit' }}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={() => setCalMonth(m => m < 12 ? m + 1 : (setCalYear(y => y + 1), 1))} style={{ width: 26, height: 26, border: '1px solid #c8cdd6', background: '#fff', borderRadius: 3, cursor: 'pointer', fontSize: 15 }}>›</button>
          <button style={{ height: 30, padding: '0 20px', background: '#0098a3', color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>조회</button>
        </div>

        {/* 달력 */}
        <div style={{ padding: '0 16px 16px', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['월','화','수','목','금'].map(d => (
                  <th key={d} style={{ padding: '10px 0', textAlign: 'center', fontWeight: 600, color: '#444', border: '1px solid #dde0e8', background: '#f7f8fb' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((wk, wi) => (
                <tr key={wi}>
                  {wk.map((d, di) => (
                    <td key={di} style={{ verticalAlign: 'top', padding: 8, height: 80, border: '1px solid #e8eaf0' }}>
                      {d && (
                        <>
                          <div style={{ fontWeight: 500, color: '#333', marginBottom: 4, fontSize: 13 }}>{d}</div>
                          {getCourtGroups(d).map(([court, cnt]) => (
                            <div key={court} onClick={() => setSelectedDate(d)} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '2px 0' }}>
                              <span style={{ color: '#1060b0', fontSize: 12 }}>■</span>
                              <span style={{ color: '#1060b0', fontSize: 11, textDecoration: 'underline' }}>{court}[{cnt}]</span>
                            </div>
                          ))}
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 참고하세요 */}
        <div style={{ margin: '0 16px 16px', border: '1px solid #dde0e8', borderRadius: 6, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', background: '#fafbfd' }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>📋</div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
            <strong>참고하세요</strong><br />
            • 소송유형 또는 법원을 전체로 조회한 결과 진행중사건이 500건 이상일 경우 조회가 제한될 수 있으니, 소송유형과 법원을 지정하여 조회하시기 바랍니다.
          </div>
        </div>

        {/* 재판일정상세 모달 */}
        {selectedDate !== null && (
          <div onClick={() => setSelectedDate(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 6, width: 720, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,.25)' }}>
              <div style={{ background: '#1a3a6b', color: '#fff', padding: '12px 20px', borderRadius: '6px 6px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>재판일정상세</span>
                <button onClick={() => setSelectedDate(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ color: '#0098a3', fontSize: 16, fontWeight: 900 }}>○</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{calYear}. {calMonth}. {selectedDate}. 재판일정</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f0f4fa' }}>
                      {['법원','사건번호','재판부','기일종류','기일시간','기일장소','원고','피고'].map(h => (
                        <th key={h} style={{ padding: '7px 8px', border: '1px solid #dde0e8', textAlign: 'center', fontWeight: 600, color: '#333', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selEvents.map((e, i) => (
                      <tr key={i}>
                        <td style={{ padding: '7px 8px', border: '1px solid #dde0e8', textAlign: 'center', whiteSpace: 'nowrap' }}>{e.court}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #dde0e8', textAlign: 'center', whiteSpace: 'nowrap' }}>{e.caseNo}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #dde0e8', textAlign: 'center' }}>{e.dept}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #dde0e8', textAlign: 'center' }}>{e.type}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #dde0e8', textAlign: 'center' }}>{e.time}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #dde0e8', textAlign: 'center' }}>{e.place}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #dde0e8', textAlign: 'center' }}>{e.plaintiff}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid #dde0e8', textAlign: 'center' }}>{e.defendant}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setSelectedDate(null)} style={{ padding: '6px 24px', background: '#fff', border: '1px solid #aaa', borderRadius: 3, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>닫기</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

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
  // 진행중사건 mock 데이터 (실제 대법원 화면과 동일)
  interface MockCase { id: number; court: string; caseNum: string; division: string; status: string; filedDate: string; plaintiff: string; defendant: string; hearingDate: string; hearingPlace: string }
  const MOCK_ACTIVE_CASES: MockCase[] = [
    { id:1, court:'제주지법', caseNum:'2025가단7122', division:'미배당', status:'원고대리인', filedDate:'2025.03.12', plaintiff:'박준호', defendant:'주식회사 하나솔루션즈 외 1명', hearingDate:'', hearingPlace:'' },
    { id:2, court:'인천지법', caseNum:'2025머11269', division:'민사조정17단독', status:'원고대리인', filedDate:'2025.03.11', plaintiff:'최영민', defendant:'주식회사 블루오션테크', hearingDate:'', hearingPlace:'' },
    { id:3, court:'서울서부지법', caseNum:'2025머2151', division:'민사61단독(조정)', status:'원고대리인', filedDate:'2025.03.04', plaintiff:'한소영', defendant:'정태우 외 1명', hearingDate:'', hearingPlace:'' },
    { id:4, court:'인천지법 부천지원', caseNum:'2025가단103674', division:'민사5단독', status:'원고대리인', filedDate:'2025.02.25', plaintiff:'오세진', defendant:'주식회사 그린라이트 외 1명', hearingDate:'', hearingPlace:'' },
    { id:5, court:'대전지법', caseNum:'2024머237008', division:'대전3조정부', status:'원고대리인', filedDate:'2024.12.31', plaintiff:'이하은 외', defendant:'강민석 외', hearingDate:'2025.02.04 14:00', hearingPlace:'본관(1층) 15호 조정실' },
  ]

  const ActiveCasesContent = () => {
    const [filterType, setFilterType] = useState('전체')
    const [filterCourt, setFilterCourt] = useState('전체')
    const [currentPage, setCurrentPage] = useState(1)
    const [menuCaseNum, setMenuCaseNum] = useState<string | null>(null)
    const perPage = 10

    const LAWSUIT_TYPES = ['전체','민사','형사','가사','보호','행정','특허','회생파산','민사(지급명령)','민사집행','과태료']
    const COURTS = ['전체','서울중앙지방법원','서울동부지방법원','서울서부지방법원','서울남부지방법원','서울북부지방법원','수원지방법원','인천지방법원','의정부지방법원','춘천지방법원','대전지방법원','청주지방법원','대구지방법원','부산지방법원','울산지방법원','창원지방법원','광주지방법원','전주지방법원','제주지방법원']

    // allCases(배정사건)를 mock 형식으로 변환 + 기본 mock 데이터 합치기
    const assignedMock: MockCase[] = allCases.map((a, i) => {
      const sc = a.sample_cases
      const year = a.assigned_at?.slice(0,4) || '2026'
      const code = sc?.case_type === '소유권이전등기' ? '가합' : '가단'
      const caseNo = `${year}${code}${String(100000+i+1)}`
      const div = { '대여금':'민사4단독','손해배상(기)':'민사2단독','매매대금':'민사3단독','임금':'민사4단독' }[sc?.case_type||''] || '민사1단독'
      const courtS = (sc?.court||'서울중앙지방법원').replace('지방법원','지법')
      return { id: 100+i, court: courtS, caseNum: caseNo, division: div, status:'원고대리인', filedDate: a.assigned_at?.slice(0,10).replace(/-/g,'.') || '', plaintiff: sc?.plaintiff || '', defendant: sc?.defendant || '', hearingDate:'', hearingPlace:'' }
    })
    const allMock = [...MOCK_ACTIVE_CASES, ...assignedMock]

    const filtered = allMock.filter(c => {
      if (filterType !== '전체' && filterType !== '민사') return false
      if (filterCourt !== '전체' && !c.court.includes(filterCourt.replace('지방법원','지법'))) return false
      return true
    })
    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const paged = filtered.slice((currentPage-1)*perPage, currentPage*perPage)

    const selS: React.CSSProperties = { height:30, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 8px', fontFamily:'inherit', background:'#fff', cursor:'pointer' }
    const tdS: React.CSSProperties = { padding:'8px 10px', fontSize:12, borderBottom:'1px solid #e8edf0', verticalAlign:'middle' }

    return (
      <div style={{ fontFamily:'inherit' }}>
        <PageHd title="진행중사건" actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />

        {/* 필터 영역 */}
        <div style={{ background:'#fff', borderBottom:'1px solid #dde0e8', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {/* Row 1: 소송유형 + 법원 */}
          <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:12, color:'#333', fontWeight:600, minWidth:52 }}>소송유형</span>
            <select value={filterType} onChange={e=>{setFilterType(e.target.value);setCurrentPage(1)}} style={{ ...selS, width:100 }}>
              {LAWSUIT_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <select style={{ ...selS, width:100 }}>{['전체','민사본안','민사신청','항고제재고','기타'].map(t=><option key={t}>{t}</option>)}</select>
            <span style={{ fontSize:12, color:'#333', fontWeight:600, marginLeft:16 }}>법원</span>
            <select value={filterCourt} onChange={e=>{setFilterCourt(e.target.value);setCurrentPage(1)}} style={{ ...selS, width:140 }}>
              {COURTS.map(c=><option key={c}>{c}</option>)}
            </select>
            <button style={{ height:30, padding:'0 12px', background:'#fff', border:'1px solid #c8cdd6', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>나의법원설정</button>
          </div>
          {/* Row 2: 접수일자/사건번호 + 날짜 + 기간 버튼 */}
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <label style={{ fontSize:12, display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}><input type="radio" name="searchMode" defaultChecked style={{ margin:0 }}/>접수일자</label>
            <label style={{ fontSize:12, display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}><input type="radio" name="searchMode" style={{ margin:0 }}/>사건번호</label>
            <input type="date" style={{ height:30, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 6px', fontSize:12, fontFamily:'inherit' }} />
            <span style={{ fontSize:12 }}>~</span>
            <input type="date" style={{ height:30, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 6px', fontSize:12, fontFamily:'inherit' }} />
            {['오늘','3일','1주일','1개월','전체'].map(l=>(
              <button key={l} style={{ height:28, padding:'0 12px', background:'#fff', border:'1px solid #c8cdd6', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>{l}</button>
            ))}
          </div>
          {/* Row 3: 정렬순서 */}
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:12, color:'#333', fontWeight:600, minWidth:52 }}>정렬순서</span>
            {[['접수일자 ↓','접수일자 ↑'],['법원 ↑','법원 ↓'],['사건번호 ↓','사건번호 ↑']].map((opts,i)=>(
              <select key={i} defaultValue={opts[0]} style={{ ...selS, width:100 }}>{opts.map(o=><option key={o}>{o}</option>)}</select>
            ))}
          </div>
          {/* 조회 */}
          <div style={{ textAlign:'center', paddingTop:4 }}>
            <button style={{ height:36, padding:'0 50px', background:'#003366', color:'#fff', border:'none', borderRadius:3, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>조 회</button>
          </div>
        </div>

        {/* 상단 액션 버튼 */}
        <div style={{ background:'#fff', borderBottom:'1px solid #dde0e8', padding:'6px 16px', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button style={{ height:28, padding:'0 12px', background:'#fff', border:'1px solid #c8cdd6', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>관심사건 지정</button>
          <button style={{ height:28, padding:'0 12px', background:'#fff', border:'1px solid #c8cdd6', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>완료사건 지정</button>
          <button style={{ height:28, padding:'0 14px', background:'#1a7a3a', color:'#fff', border:'none', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>📗 엑셀로 저장</button>
        </div>

        {/* 테이블 */}
        {allCasesLoading ? (
          <div style={{ padding:60, textAlign:'center', color:'#aaa', background:'#fff' }}>⏳ 사건을 불러오는 중...</div>
        ) : (
          <div style={{ background:'#fff', overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#f0f3f8', borderBottom:'2px solid #b8c8e0' }}>
                  <th style={{ padding:'8px 8px', width:28 }}><input type="checkbox" /></th>
                  {['법원','사건번호','재판부','사건지위','접수일자','원고','피고','기일시간','기일장소','바로가기'].map(h=>(
                    <th key={h} style={{ padding:'8px 10px', fontWeight:600, fontSize:11, color:'#333', whiteSpace:'nowrap', textAlign:'center' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom:'1px solid #e8edf0' }}>
                    <td style={{ ...tdS, textAlign:'center' }}><input type="checkbox" /></td>
                    <td style={{ ...tdS, whiteSpace:'nowrap' }}>{c.court}</td>
                    <td style={tdS}>
                      <span style={{ color:'#0057a8', textDecoration:'underline', cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}>{c.caseNum}</span>
                    </td>
                    <td style={{ ...tdS, textAlign:'center', whiteSpace:'nowrap', color:'#555' }}>{c.division}</td>
                    <td style={{ ...tdS, textAlign:'center', color:'#555' }}>{c.status}</td>
                    <td style={{ ...tdS, textAlign:'center', whiteSpace:'nowrap', color:'#555' }}>{c.filedDate}</td>
                    <td style={{ ...tdS, maxWidth:70, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.plaintiff}</td>
                    <td style={{ ...tdS, maxWidth:100, overflow:'hidden', textOverflow:'ellipsis' }}>{c.defendant}</td>
                    <td style={{ ...tdS, textAlign:'center', whiteSpace:'nowrap', color:'#555', fontSize:11 }}>{c.hearingDate}</td>
                    <td style={{ ...tdS, textAlign:'center', whiteSpace:'nowrap', color:'#888', fontSize:11, maxWidth:90, overflow:'hidden', textOverflow:'ellipsis' }}>{c.hearingPlace}</td>
                    <td style={{ ...tdS, textAlign:'center' }}>
                      <button onClick={() => setMenuCaseNum(c.caseNum)} style={{ height:26, padding:'0 10px', background:'#fff', border:'1px solid #8899bb', borderRadius:3, fontSize:11, cursor:'pointer', color:'#003366', fontFamily:'inherit', whiteSpace:'nowrap' }}>메뉴선택</button>
                    </td>
                  </tr>
                ))}
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

        {/* 메뉴선택 모달 (실제 대법원 동일) */}
        {menuCaseNum && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:3000, display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:60 }}>
            <div style={{ background:'#fff', width:620, boxShadow:'0 8px 40px rgba(0,0,0,.35)', overflow:'hidden' }}>
              {/* 헤더 */}
              <div style={{ background:'#1a1a2e', color:'#fff', padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:700, fontSize:16, letterSpacing:1 }}>메뉴선택</span>
                <button onClick={()=>setMenuCaseNum(null)} style={{ background:'none', border:'none', color:'#fff', fontSize:24, cursor:'pointer', lineHeight:1 }}>✕</button>
              </div>
              {/* 사건번호 */}
              <div style={{ padding:'28px 20px 6px', textAlign:'center' }}>
                <div style={{ fontSize:17, fontWeight:700, color:'#1a1a2e', marginBottom:10 }}>{menuCaseNum}</div>
                <div style={{ fontSize:13, color:'#c00', marginBottom:20 }}>아래 항목을 클릭하시면, 해당 화면으로 바로가기 됩니다.</div>
              </div>
              {/* 버튼 그리드 3x4 */}
              <div style={{ padding:'0 36px 20px', display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
                {[
                  '사건기록열람','소송서류제출','소송비용납부',
                  '알림서비스','제출/송달내역','기록목록조회',
                  '관련사건등록','관련사건조회','미확인송달물확인처리',
                  '제증명신청',
                ].map(label => (
                  <button
                    key={label}
                    onClick={() => {
                      setMenuCaseNum(null)
                      if (label === '사건기록열람') window.open(`/case-viewer?case=${encodeURIComponent(menuCaseNum!)}`, '_blank', 'width=1400,height=900')
                      else if (label === '제출/송달내역') navTo('doc-history')
                      else if (label === '소송서류제출') router.push('/apply?new=true')
                      else if (label === '소송비용납부') navTo('pay')
                      else if (label === '미확인송달물확인처리') navTo('unread-delivery')
                      else if (label === '알림서비스') navTo('alert-service')
                      else if (label === '기록목록조회') window.open(`/case-viewer?case=${encodeURIComponent(menuCaseNum!)}`, '_blank', 'width=1400,height=900')
                      else if (label === '관련사건등록') navTo('active-cases')
                      else if (label === '관련사건조회') navTo('active-cases')
                      else if (label === '제증명신청') navTo('generic', '제증명신청')
                    }}
                    onMouseEnter={e => { e.currentTarget.style.border = '2px solid #0067c2'; e.currentTarget.style.color = '#0067c2'; e.currentTarget.style.fontWeight = '700' }}
                    onMouseLeave={e => { e.currentTarget.style.border = '1px solid #c8cdd6'; e.currentTarget.style.color = '#333'; e.currentTarget.style.fontWeight = '400' }}
                    style={{
                      padding:'13px 6px', border:'1px solid #c8cdd6',
                      background:'#fff', color:'#333',
                      borderRadius:3, fontSize:13, fontWeight:400,
                      cursor:'pointer', fontFamily:'inherit',
                    }}
                  >{label}</button>
                ))}
              </div>
              {/* 닫기 */}
              <div style={{ padding:'10px 20px 32px', display:'flex', justifyContent:'flex-end', paddingRight:36 }}>
                <button onClick={()=>setMenuCaseNum(null)} style={{ height:40, padding:'0 44px', background:'#fff', color:'#333', border:'1px solid #999', borderRadius:3, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>닫기</button>
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

  // ── 전체송달문서 / 미확인송달문서 공용 상수 ─────────────────────
  const MOCK_DELIVERY_DOCS = [
    { court:'서울중앙지방법원', dept:'민사3단독', caseNo:'2026가단11234', docName:'소장부본', sentAt:'2026.01.15', recvAt:'2026.01.15', canIssue:true,  rows:['조회','제출'] },
    { court:'수원지방법원',     dept:'민사2단독', caseNo:'2026가단22345', docName:'답변서부본', sentAt:'2026.02.10', recvAt:'2026.02.11(자동확인)', canIssue:false, rows:['조회'] },
    { court:'인천지방법원',     dept:'민사5단독', caseNo:'2025가단33456', docName:'보정명령등본', sentAt:'2026.02.20', recvAt:'2026.02.20', canIssue:true,  rows:['조회','제출'] },
    { court:'서울동부지방법원', dept:'민사1단독', caseNo:'2026가단44567', docName:'준비서면부본', sentAt:'2026.03.01', recvAt:'2026.03.05(자동확인)', canIssue:false, rows:['조회'] },
  ]

  // ── 전체송달문서 ─────────────────────────────────────────────
  const AllDeliveryContent = () => {
    const LAWSUIT_TYPES = ['전체','민사','형사','가사','행정','특허','회생파산']
    const COURTS_SEL = ['전체','서울중앙지방법원','서울동부지방법원','서울서부지방법원','서울남부지방법원','수원지방법원','인천지방법원','의정부지방법원','대전지방법원','대구지방법원','부산지방법원','광주지방법원']
    const [searchMode, setSearchMode] = useState<'date'|'caseNo'>('date')
    const tdS: React.CSSProperties = { padding:'7px 10px', fontSize:12, borderBottom:'1px solid #eee', verticalAlign:'middle', textAlign:'center' }
    return (
      <div>
        <PageHd title="전체송달문서" actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />
        {/* 필터 */}
        <div style={{ background:'#fff', borderBottom:'1px solid #eee', padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#555', minWidth:40 }}>소송유형</span>
            <select style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 6px', fontFamily:'inherit' }}>
              {LAWSUIT_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <select style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 6px', fontFamily:'inherit' }}>
              {['전체','민사본안','민사신청','기타'].map(t=><option key={t}>{t}</option>)}
            </select>
            <span style={{ fontSize:12, fontWeight:600, color:'#555', minWidth:20, marginLeft:8 }}>법원</span>
            <select style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 6px', fontFamily:'inherit' }}>
              {COURTS_SEL.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, cursor:'pointer' }}>
              <input type="radio" name="dlMode" checked={searchMode==='date'} onChange={()=>setSearchMode('date')} style={{ accentColor:'#003366' }} />발송일자
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, cursor:'pointer' }}>
              <input type="radio" name="dlMode" checked={searchMode==='caseNo'} onChange={()=>setSearchMode('caseNo')} style={{ accentColor:'#003366' }} />사건번호
            </label>
            {searchMode==='date' ? (
              <>
                <input type="date" defaultValue="2026-02-01" style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 6px', fontSize:12, fontFamily:'inherit' }} />
                <span style={{ fontSize:12 }}>~</span>
                <input type="date" defaultValue="2026-03-21" style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 6px', fontSize:12, fontFamily:'inherit' }} />
                {['오늘','3일','1주일','1개월'].map(l=>(
                  <button key={l} style={{ height:26, padding:'0 9px', background:'#fff', border:'1px solid #c8cdd6', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>{l}</button>
                ))}
              </>
            ) : (
              <>
                <select style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 4px', fontFamily:'inherit' }}>
                  {['2026','2025','2024'].map(y=><option key={y}>{y}</option>)}
                </select>
                <select style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 4px', fontFamily:'inherit' }}>
                  {['가단','가합','나','가소','가불'].map(t=><option key={t}>{t}</option>)}
                </select>
                <input type="text" style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 6px', fontSize:12, fontFamily:'inherit', width:100 }} placeholder="사건번호" />
              </>
            )}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#555' }}>정렬순서</span>
            {[['발송일자↓','발송일자↑'],['법원↑','법원↓'],['사건번호↓','사건번호↑']].map((opts,i)=>(
              <select key={i} defaultValue={opts[0]} style={{ height:26, border:'1px solid #c8cdd6', borderRadius:3, fontSize:11, padding:'0 4px', fontFamily:'inherit' }}>
                {opts.map(o=><option key={o}>{o}</option>)}
              </select>
            ))}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, cursor:'pointer' }}>
              <input type="checkbox" style={{ accentColor:'#003366' }} />결과내재검색
            </label>
            <input type="text" style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 8px', fontSize:12, fontFamily:'inherit', width:220 }} placeholder="" />
          </div>
          <div style={{ textAlign:'center' }}>
            <button style={{ height:32, padding:'0 40px', background:'#003366', color:'#fff', border:'none', borderRadius:3, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>조 회</button>
          </div>
        </div>
        {/* 안내 */}
        <div style={{ background:'#fffbe6', border:'1px solid #ffe082', borderBottom:'none', padding:'8px 14px', fontSize:11, color:'#7a6000', lineHeight:1.8 }}>
          ※ '발급/조회' 버튼을 이용하여 발급하여야 '열람'이라는 문구가 기재되지 않은 등본을 출력할 수 있고, 그렇지 않은 경우에는 '열람'이라는 문구가 포함되어 출력되는 점에 유의하시기 바랍니다.
        </div>
        {/* 테이블 헤더 도구 */}
        <div style={{ background:'#fff', borderTop:'1px solid #dde0e8', borderBottom:'1px solid #dde0e8', padding:'6px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <select style={{ height:26, border:'1px solid #c8cdd6', borderRadius:3, fontSize:11, padding:'0 4px', fontFamily:'inherit' }}>
            {['전체','미확인','확인'].map(t=><option key={t}>{t}</option>)}
          </select>
          <div style={{ display:'flex', gap:6 }}>
            <button style={{ height:26, padding:'0 12px', background:'#fff', border:'1px solid #c8cdd6', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>일괄확인 ›</button>
            <button style={{ height:26, padding:'0 12px', background:'#1a7a3a', color:'#fff', border:'none', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>📗 엑셀로 저장</button>
          </div>
        </div>
        {/* 테이블 */}
        <div style={{ background:'#fff', overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#f0f3f8', borderBottom:'2px solid #b8c8e0' }}>
                <th style={{ padding:'7px 8px', width:28 }}><input type="checkbox" /></th>
                {['법원','재판부','사건번호','송달문서','발송일자','수산일자','문서발급','송달내역','관련서류'].map(h=>(
                  <th key={h} style={{ padding:'7px 8px', fontWeight:600, fontSize:11, color:'#333', textAlign:'center', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_DELIVERY_DOCS.map((doc, i) => (
                <tr key={i} style={{ background:i%2===0?'#fff':'#fafbfe' }}>
                  <td style={{ ...tdS }}><input type="checkbox" /></td>
                  <td style={{ ...tdS }}>{doc.court.replace('지방법원','지법').replace('고등법원','고법')}</td>
                  <td style={{ ...tdS }}>{doc.dept}</td>
                  <td style={{ ...tdS }}>
                    <span style={{ color:'#0057a8', textDecoration:'underline', cursor:'pointer', fontWeight:600 }}>{doc.caseNo}</span>
                  </td>
                  <td style={{ ...tdS, textAlign:'left' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ color:'#555', fontSize:10 }}>ℹ️</span>
                      <span style={{ color:'#0057a8', textDecoration:'underline', cursor:'pointer' }}>{doc.docName}</span>
                    </div>
                  </td>
                  <td style={{ ...tdS }}>{doc.sentAt}</td>
                  <td style={{ ...tdS }}>{doc.recvAt}</td>
                  <td style={{ ...tdS }}>
                    {doc.canIssue && <button onClick={()=>alert('실습 모드 — 문서 발급 기능')} style={{ height:22, padding:'0 8px', background:'#fff', border:'1px solid #8899bb', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit', color:'#003366' }}>발급/조회</button>}
                  </td>
                  <td style={{ ...tdS }}>
                    <button onClick={()=>alert('실습 모드 — 송달내역 조회')} style={{ height:22, padding:'0 8px', background:'#fff', border:'1px solid #8899bb', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit', color:'#003366' }}>조회</button>
                  </td>
                  <td style={{ ...tdS }}>
                    {doc.rows.includes('제출') && <button onClick={()=>alert('실습 모드 — 관련서류 제출')} style={{ height:22, padding:'0 8px', background:'#fff', border:'1px solid #8899bb', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit', color:'#003366' }}>제출</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 페이지네이션 */}
        <div style={{ background:'#fff', borderTop:'1px solid #e8edf0', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:12, color:'#555' }}>총 <strong>{MOCK_DELIVERY_DOCS.length}</strong>건</span>
          <div style={{ display:'flex', gap:4 }}>
            {['«','‹','1','›','»'].map(b=>(
              <button key={b} style={{ width:26, height:26, border:`1px solid ${b==='1'?'#003366':'#ccc'}`, background:b==='1'?'#003366':'#fff', color:b==='1'?'#fff':'#555', borderRadius:3, cursor:'pointer', fontSize:12, fontWeight:b==='1'?700:400 }}>{b}</button>
            ))}
          </div>
          <select defaultValue="10" style={{ height:26, border:'1px solid #ccc', borderRadius:3, fontSize:11, padding:'0 4px', fontFamily:'inherit' }}>
            {['10','20','30'].map(n=><option key={n}>{n}개씩 보기</option>)}
          </select>
        </div>
        {/* 참고 */}
        <div style={{ background:'#f8f9fc', border:'1px solid #dde0e8', borderTop:'none', padding:'14px 18px', display:'flex', gap:12, alignItems:'flex-start' }}>
          <div style={{ fontSize:24, marginTop:2 }}>📬</div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#003366', marginBottom:6 }}>참고하세요</div>
            <ul style={{ margin:0, paddingLeft:16, fontSize:11, color:'#555', lineHeight:1.9 }}>
              <li>송달문서를 반드시 확인해 주세요. 송달문서에 대한 불복문서를 제출하고자 하는 경우 제출기간 도과에 따른 불이익이 발생하지 않도록 주의하시기 바랍니다.</li>
              <li>송달문서를 확인해 주세요. 제출기한이 있는 송달문서의 경우 기한 내에 해당 서류가 법원에 접수될 수 있도록 유의하시기 바랍니다.</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // ── 미확인송달문서 ────────────────────────────────────────────
  interface UnreadDoc { id: string; confirmed: boolean; court: string; division: string; caseNum: string; docName: string; sentDate: string; hasIssue: boolean; docType: string }
  function getUnreadDocs(): UnreadDoc[] {
    if (!user) return []
    const key = `ecfs_unread_delivery_${user.id}`
    const stored = localStorage.getItem(key)
    if (!stored) {
      const docs: UnreadDoc[] = [
        { id: 'ud1', confirmed: false, court: '인천지법', division: '민사7단독', caseNum: '2024가단318205', docName: '조정회부결정등본', sentDate: '2025.03.10', hasIssue: true, docType: '결정등본송달' },
        { id: 'ud2', confirmed: false, court: '김포시법원', division: '민사소액', caseNum: '2024가소68413', docName: '준비서면부본(25.03.06.자)', sentDate: '2025.03.09', hasIssue: false, docType: '준비서면부본송달' },
        { id: 'ud3', confirmed: false, court: '서울중앙지방법원', division: '민사302단독(소액)', caseNum: '2024가소1985402', docName: '변론기일통지서', sentDate: '2025.03.06', hasIssue: false, docType: '기일통지송달' },
        { id: 'ud4', confirmed: false, court: '서울행정법원', division: '행정10단독', caseNum: '2024구단14078', docName: '변론기일통지서', sentDate: '2025.03.06', hasIssue: false, docType: '기일통지송달' },
      ]
      localStorage.setItem(key, JSON.stringify(docs))
      return docs
    }
    return JSON.parse(stored)
  }
  function saveUnreadDocs(docs: UnreadDoc[]) {
    if (!user) return
    localStorage.setItem(`ecfs_unread_delivery_${user.id}`, JSON.stringify(docs))
  }

  const UnreadDeliveryContent = () => {
    const [docs, setDocs] = useState<UnreadDoc[]>([])
    const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
    const [confirmToast, setConfirmToast] = useState(false)
    const [viewDocId, setViewDocId] = useState<string | null>(null)

    useEffect(() => { setDocs(getUnreadDocs()) }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const unconfirmed = docs.filter(d => !d.confirmed)
    const allChecked = unconfirmed.length > 0 && unconfirmed.every(d => checkedIds.has(d.id))

    function toggleCheck(id: string) { setCheckedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n }) }
    function toggleAll() { allChecked ? setCheckedIds(new Set()) : setCheckedIds(new Set(unconfirmed.map(d => d.id))) }
    function confirmSingle(id: string) { const u = docs.map(d => d.id === id ? { ...d, confirmed: true } : d); setDocs(u); saveUnreadDocs(u); setConfirmToast(true); setTimeout(() => setConfirmToast(false), 2500); setViewDocId(null) }
    function confirmChecked() { if (checkedIds.size === 0) { alert('확인할 문서를 선택해주세요.'); return } const u = docs.map(d => checkedIds.has(d.id) ? { ...d, confirmed: true } : d); setDocs(u); saveUnreadDocs(u); setCheckedIds(new Set()); setConfirmToast(true); setTimeout(() => setConfirmToast(false), 2500) }
    function confirmAll() { const u = docs.map(d => ({ ...d, confirmed: true })); setDocs(u); saveUnreadDocs(u); setConfirmToast(true); setTimeout(() => setConfirmToast(false), 2500) }

    const selS: React.CSSProperties = { height:30, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 8px', fontFamily:'inherit', background:'#fff', cursor:'pointer' }
    const tdS: React.CSSProperties = { padding:'8px 10px', fontSize:12, borderBottom:'1px solid #eee', verticalAlign:'middle', textAlign:'center' }
    const viewDoc = docs.find(d => d.id === viewDocId)

    return (
      <div>
        {confirmToast && <div style={{ position:'fixed', bottom:32, right:32, background:'#065f46', color:'#fff', padding:'10px 20px', borderRadius:6, fontSize:13, fontWeight:600, zIndex:9999, boxShadow:'0 2px 12px rgba(0,0,0,.3)' }}>✓ 송달문서가 확인 처리되었습니다</div>}

        {/* 문서 상세 모달 */}
        {viewDoc && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:5000, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'#fff', width:620, borderRadius:6, boxShadow:'0 4px 24px rgba(0,0,0,.3)', overflow:'hidden' }}>
              <div style={{ background:'#003366', color:'#fff', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:700, fontSize:14 }}>📄 송달문서 확인 — {viewDoc.docName}</span>
                <button onClick={() => setViewDocId(null)} style={{ background:'none', border:'none', color:'#fff', fontSize:18, cursor:'pointer' }}>✕</button>
              </div>
              <div style={{ padding:'24px' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <tbody>
                    {[['법원', viewDoc.court], ['재판부', viewDoc.division], ['사건번호', viewDoc.caseNum], ['문서명', viewDoc.docName], ['발송일자', viewDoc.sentDate], ['송달유형', viewDoc.docType]].map(([k, v]) => (
                      <tr key={k}><th style={{ background:'#f5f7fb', padding:'9px 14px', fontWeight:600, textAlign:'left', width:100, borderBottom:'1px solid #eee', fontSize:12 }}>{k}</th><td style={{ padding:'9px 14px', borderBottom:'1px solid #eee' }}>{v}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ background:'#f0f7ff', border:'1px solid #c5d8f6', borderRadius:4, padding:'16px', marginTop:16, fontSize:12, color:'#1a4a6b', lineHeight:1.8 }}>
                  <p style={{ margin:'0 0 6px', fontWeight:700 }}>📋 송달문서 내용</p>
                  <p style={{ margin:0 }}>본 문서는 {viewDoc.court} {viewDoc.division}에서 발송된 <strong>{viewDoc.docName}</strong>입니다.</p>
                  <p style={{ margin:'6px 0 0' }}>사건번호 <strong>{viewDoc.caseNum}</strong>에 관하여 {viewDoc.sentDate}자로 발송되었습니다.</p>
                  <p style={{ margin:'6px 0 0', fontSize:11, color:'#888' }}>※ 아래 [확인 처리] 버튼을 누르면 이 문서는 확인 완료 처리되며, 미확인 목록에서 사라집니다.</p>
                </div>
                <div style={{ display:'flex', justifyContent:'center', gap:10, marginTop:20 }}>
                  {!viewDoc.confirmed && <button onClick={() => confirmSingle(viewDoc.id)} style={{ padding:'9px 32px', background:'#003366', color:'#fff', border:'none', borderRadius:4, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>확인 처리</button>}
                  <button onClick={() => setViewDocId(null)} style={{ padding:'9px 32px', background:'#fff', color:'#333', border:'1px solid #ccc', borderRadius:4, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>닫기</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <PageHd title="미확인송달문서" actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />

        {/* ── 필터 (실제 대법원 동일) ── */}
        <div style={{ background:'#fff', borderBottom:'1px solid #eee', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {/* Row 1: 소송유형 + 법원 */}
          <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#333', minWidth:52 }}>소송유형</span>
            <select style={{ ...selS, width:100 }}>{['전체','민사','형사','가사','행정','특허','회생파산'].map(t=><option key={t}>{t}</option>)}</select>
            <select style={{ ...selS, width:100 }}>{['전체','민사본안','민사신청','기타'].map(t=><option key={t}>{t}</option>)}</select>
            <span style={{ fontSize:12, fontWeight:600, color:'#333', marginLeft:16 }}>법원</span>
            <select style={{ ...selS, width:140 }}>{['전체','서울중앙지방법원','서울동부지방법원','인천지방법원','김포시법원','수원지방법원','대전지방법원'].map(t=><option key={t}>{t}</option>)}</select>
          </div>
          {/* Row 2: 사건번호 */}
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, cursor:'pointer' }}><input type="checkbox" style={{ accentColor:'#003366' }} />사건번호</label>
            <select style={{ ...selS, width:75 }}>{['2026','2025','2024','2023'].map(y=><option key={y}>{y}</option>)}</select>
            <select style={{ ...selS, width:65 }}>{['가단','가합','나','가소','가불','다'].map(t=><option key={t}>{t}</option>)}</select>
            <input type="text" style={{ height:30, width:100, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 8px', fontSize:12, fontFamily:'inherit' }} />
            <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, cursor:'pointer', marginLeft:16 }}><input type="checkbox" style={{ accentColor:'#003366' }} />사건구분 가나다순 정렬</label>
          </div>
          {/* Row 3: 정렬순서 */}
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#333', minWidth:52 }}>정렬순서</span>
            {[['발송일자 ↓','발송일자 ↑'],['법원 ↑','법원 ↓'],['사건번호 ↓','사건번호 ↑']].map((opts,i)=>(
              <select key={i} defaultValue={opts[0]} style={{ ...selS, width:100 }}>{opts.map(o=><option key={o}>{o}</option>)}</select>
            ))}
          </div>
          {/* Row 4: 결과내재검색 */}
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, cursor:'pointer' }}><input type="checkbox" style={{ accentColor:'#003366' }} />결과내재검색</label>
            <input type="text" style={{ height:30, width:280, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 8px', fontSize:12, fontFamily:'inherit' }} />
          </div>
          {/* 조회 버튼 */}
          <div style={{ textAlign:'center', paddingTop:4 }}>
            <button style={{ height:36, padding:'0 50px', background:'#003366', color:'#fff', border:'none', borderRadius:3, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>조 회</button>
          </div>
        </div>

        {/* 안내 */}
        <div style={{ background:'#fffbe6', borderTop:'1px dotted #e0d8a0', borderBottom:'1px dotted #e0d8a0', padding:'8px 16px', fontSize:11, color:'#7a6000', lineHeight:1.8 }}>
          ※ &apos;발급/조회&apos; 버튼을 이용하여 발급하여야 &apos;열람용&apos;이라는 문구가 기재되지 않은 등본을 출력할 수 있고, 그렇지 않은 경우에는 &apos;열람용&apos;이라는 문구가 포함되어 출력되는 점에 유의하시기 바랍니다.
        </div>

        {/* 테이블 상단 도구 */}
        <div style={{ background:'#fff', borderBottom:'1px solid #dde0e8', padding:'6px 16px', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={confirmAll} style={{ height:28, padding:'0 14px', background:'#fff', border:'1px solid #c8cdd6', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>일괄확인 ›</button>
          <button style={{ height:28, padding:'0 14px', background:'#1a7a3a', color:'#fff', border:'none', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>📗 엑셀로 저장</button>
        </div>

        {/* ── 테이블 (실제 대법원 동일 컬럼) ── */}
        <div style={{ background:'#fff', overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#f0f3f8', borderBottom:'2px solid #b8c8e0' }}>
                <th style={{ padding:'8px 8px', width:28 }}><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                {['법원','재판부','사건번호','송달문서','발송일자','문서발급','송달내역','관련서류'].map(h=>(
                  <th key={h} style={{ padding:'8px 10px', fontWeight:600, fontSize:11, color:'#333', textAlign:'center', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {unconfirmed.length === 0 ? (
                <tr><td colSpan={9} style={{ ...tdS, padding:'48px', color:'#aaa', fontSize:13 }}>미확인 송달문서가 없습니다.</td></tr>
              ) : (
                unconfirmed.map(doc => (
                  <tr key={doc.id} style={{ background: checkedIds.has(doc.id) ? '#f0f5ff' : '#fff' }}>
                    <td style={tdS}><input type="checkbox" checked={checkedIds.has(doc.id)} onChange={() => toggleCheck(doc.id)} /></td>
                    <td style={tdS}>{doc.court}</td>
                    <td style={tdS}>{doc.division}</td>
                    <td style={{ ...tdS, textAlign:'left' }}>
                      <button onClick={() => setViewDocId(doc.id)} style={{ background:'none', border:'none', color:'#0067c2', cursor:'pointer', fontSize:12, fontFamily:'inherit', fontWeight:600, textDecoration:'underline', padding:0 }}>{doc.caseNum}</button>
                    </td>
                    <td style={{ ...tdS, textAlign:'left' }}>
                      <button onClick={() => setViewDocId(doc.id)} style={{ background:'none', border:'none', color:'#222', cursor:'pointer', fontSize:12, fontFamily:'inherit', fontWeight:700, padding:0, display:'flex', alignItems:'center', gap:4 }}>
                        {!doc.hasIssue && <span style={{ color:'#0067c2', fontSize:14 }}>ⓘ</span>}
                        <span style={{ textDecoration:'underline' }}>{doc.docName}</span>
                      </button>
                    </td>
                    <td style={tdS}>{doc.sentDate}</td>
                    <td style={tdS}>
                      {doc.hasIssue && <button onClick={() => setViewDocId(doc.id)} style={{ height:24, padding:'0 8px', background:'#fff', border:'1px solid #c8cdd6', borderRadius:2, fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>발급/조회</button>}
                    </td>
                    <td style={tdS}>
                      <button onClick={() => setViewDocId(doc.id)} style={{ height:24, padding:'0 10px', background:'#fff', border:'1px solid #c8cdd6', borderRadius:2, fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>조회</button>
                    </td>
                    <td style={tdS}></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div style={{ background:'#fff', borderTop:'1px solid #e8edf0', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:12, color:'#555' }}>총 <strong>{unconfirmed.length}</strong>건</span>
          <div style={{ display:'flex', gap:4 }}>
            {['«','‹','1','›','»'].map(b=>(
              <button key={b} style={{ width:26, height:26, border:'1px solid #ccc', background: b === '1' ? '#003366' : '#fff', color: b === '1' ? '#fff' : '#999', borderRadius:3, cursor:'pointer', fontSize:12, fontWeight: b === '1' ? 700 : 400 }}>{b}</button>
            ))}
          </div>
          <select defaultValue="10" style={{ height:26, border:'1px solid #ccc', borderRadius:3, fontSize:11, padding:'0 4px', fontFamily:'inherit' }}>
            {['10','20','30'].map(n=><option key={n}>{n}개씩 보기</option>)}
          </select>
        </div>
      </div>
    )
  }

  // ── 알림서비스신청 ────────────────────────────────────────────
  const AlertServiceContent = () => {
    const [caseYear, setCaseYear] = useState('2026')
    const [caseType, setCaseType] = useState('가단')
    const [caseNum, setCaseNum] = useState('')
    const [court, setCourt] = useState('전체')
    const [searched, setSearched] = useState(false)
    const [selectedRow, setSelectedRow] = useState<number | null>(null)
    const [alertKakao, setAlertKakao] = useState(true)
    const [alertSms, setAlertSms] = useState(false)
    const [alertEmail, setAlertEmail] = useState(false)

    const MOCK_ALERT_CASES = [
      { no: 1, court: '서울중앙지방법원', dept: '민사3단독', caseNo: '2026가단11234', plaintiff: '홍길동', defendant: '이순신', status: '신청가능', alertOn: false },
      { no: 2, court: '수원지방법원', dept: '민사2단독', caseNo: '2026가단22345', plaintiff: '홍길동', defendant: '김철수', status: '신청가능', alertOn: true },
    ]

    const COURTS_SEL = ['전체','서울중앙지방법원','서울동부지방법원','서울서부지방법원','서울남부지방법원','수원지방법원','인천지방법원','의정부지방법원','대전지방법원','대구지방법원','부산지방법원','광주지방법원']
    const thS: React.CSSProperties = { padding:'7px 10px', fontSize:11, fontWeight:600, color:'#333', textAlign:'center', whiteSpace:'nowrap', background:'#f0f3f8', borderBottom:'2px solid #b8c8e0' }
    const tdS: React.CSSProperties = { padding:'7px 10px', fontSize:12, borderBottom:'1px solid #eee', verticalAlign:'middle', textAlign:'center' }

    return (
      <div>
        <PageHd title="알림서비스신청" actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />

        {/* 안내문 */}
        <div style={{ background:'#e8f4fb', border:'1px solid #c8ddf5', borderBottom:'none', padding:'8px 14px', fontSize:11, color:'#1a4a6b', lineHeight:1.8 }}>
          ※ 알림서비스를 신청하면 재판기일, 송달문서, 납부 등 사건 진행상황을 알림톡·문자·전자우편으로 받을 수 있습니다.
        </div>

        {/* 조회 필터 */}
        <div style={{ background:'#fff', borderBottom:'1px solid #eee', padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#555', minWidth:40 }}>법원</span>
            <select value={court} onChange={e=>setCourt(e.target.value)} style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 6px', fontFamily:'inherit' }}>
              {COURTS_SEL.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#555', minWidth:40 }}>사건번호</span>
            <select value={caseYear} onChange={e=>setCaseYear(e.target.value)} style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 4px', fontFamily:'inherit' }}>
              {['2026','2025','2024'].map(y=><option key={y}>{y}</option>)}
            </select>
            <select value={caseType} onChange={e=>setCaseType(e.target.value)} style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 4px', fontFamily:'inherit' }}>
              {['가단','가합','나','가소','가불'].map(t=><option key={t}>{t}</option>)}
            </select>
            <input type="text" value={caseNum} onChange={e=>setCaseNum(e.target.value)} style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 8px', fontSize:12, fontFamily:'inherit', width:100 }} placeholder="번호 입력" />
          </div>
          <div style={{ textAlign:'center' }}>
            <button onClick={()=>setSearched(true)} style={{ height:32, padding:'0 40px', background:'#003366', color:'#fff', border:'none', borderRadius:3, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>조 회</button>
          </div>
        </div>

        {/* 사건 목록 테이블 */}
        <div style={{ background:'#fff', overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr>
                <th style={thS}>선택</th>
                <th style={thS}>번호</th>
                <th style={thS}>법원</th>
                <th style={thS}>재판부</th>
                <th style={thS}>사건번호</th>
                <th style={thS}>원고</th>
                <th style={thS}>피고</th>
                <th style={thS}>알림상태</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ALERT_CASES.map((c, i) => (
                <tr key={c.no} style={{ background: selectedRow === i ? '#e8f0fc' : i%2===0 ? '#fff' : '#fafbfe' }}>
                  <td style={tdS}><input type="radio" name="alertCase" checked={selectedRow === i} onChange={()=>setSelectedRow(i)} /></td>
                  <td style={tdS}>{c.no}</td>
                  <td style={tdS}>{c.court.replace('지방법원','지법')}</td>
                  <td style={tdS}>{c.dept}</td>
                  <td style={tdS}><span style={{ color:'#0057a8', textDecoration:'underline', cursor:'pointer', fontWeight:600 }}>{c.caseNo}</span></td>
                  <td style={tdS}>{c.plaintiff}</td>
                  <td style={tdS}>{c.defendant}</td>
                  <td style={tdS}>
                    <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:10, fontSize:11, fontWeight:700, background: c.alertOn ? '#d1fae5' : '#f3f4f6', color: c.alertOn ? '#065f46' : '#555' }}>
                      {c.alertOn ? '신청중' : '미신청'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 신청 폼 */}
        <div style={{ background:'#f7f8fc', border:'1px solid #dde0e8', borderTop:'none', padding:'16px 18px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#003366', marginBottom:12, borderBottom:'1px solid #dde0e8', paddingBottom:8 }}>알림 수단 선택</div>

          {/* 신청대상자 */}
          <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#555', minWidth:80 }}>신청대상자</span>
            <span style={{ fontSize:12 }}>본인 (당사자/대리인)</span>
          </div>

          {/* 알림톡/문자 */}
          <div style={{ background:'#fff', border:'1px solid #e0e6ee', borderRadius:4, padding:'12px 14px', marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#1a3a6b', marginBottom:8 }}>📱 알림톡 / 문자메시지</div>
            <div style={{ display:'flex', gap:16, alignItems:'center', marginBottom:8 }}>
              <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, cursor:'pointer' }}>
                <input type="checkbox" checked={alertKakao} onChange={e=>setAlertKakao(e.target.checked)} style={{ accentColor:'#003366' }} />
                알림톡 수신 (카카오 알림톡)
              </label>
              <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, cursor:'pointer' }}>
                <input type="checkbox" checked={alertSms} onChange={e=>setAlertSms(e.target.checked)} style={{ accentColor:'#003366' }} />
                문자메시지 수신 (SMS)
              </label>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:12, color:'#555' }}>수신번호</span>
              <input type="text" defaultValue="010-0000-0000" style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 8px', fontSize:12, fontFamily:'inherit', width:140 }} placeholder="휴대폰 번호" />
              <span style={{ fontSize:11, color:'#888' }}>(가상 연습용 번호)</span>
            </div>
          </div>

          {/* 전자우편 */}
          <div style={{ background:'#fff', border:'1px solid #e0e6ee', borderRadius:4, padding:'12px 14px', marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#1a3a6b', marginBottom:8 }}>📧 전자우편</div>
            <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, cursor:'pointer', marginBottom:8 }}>
              <input type="checkbox" checked={alertEmail} onChange={e=>setAlertEmail(e.target.checked)} style={{ accentColor:'#003366' }} />
              이메일 수신
            </label>
            {alertEmail && (
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:12, color:'#555' }}>이메일</span>
                <input type="email" defaultValue="practice@example.edu" style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 8px', fontSize:12, fontFamily:'inherit', width:200 }} placeholder="이메일 주소" />
                <span style={{ fontSize:11, color:'#888' }}>(가상 연습용)</span>
              </div>
            )}
          </div>

          <div style={{ display:'flex', justifyContent:'center', gap:8 }}>
            <button
              onClick={() => {
                if (selectedRow === null) { alert('사건을 선택하세요.'); return }
                alert('알림서비스 신청이 완료되었습니다. (실습 모드)')
              }}
              style={{ height:36, padding:'0 32px', background:'#003366', color:'#fff', border:'none', borderRadius:3, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
            >신청하기</button>
            <button
              onClick={() => alert('알림서비스가 해지되었습니다. (실습 모드)')}
              style={{ height:36, padding:'0 32px', background:'#fff', color:'#555', border:'1px solid #c8cdd6', borderRadius:3, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}
            >해지하기</button>
          </div>
        </div>

        {/* 참고 */}
        <div style={{ background:'#f8f9fc', border:'1px solid #dde0e8', borderTop:'none', padding:'14px 18px', display:'flex', gap:12, alignItems:'flex-start' }}>
          <div style={{ fontSize:24, marginTop:2 }}>🔔</div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#003366', marginBottom:6 }}>참고하세요</div>
            <ul style={{ margin:0, paddingLeft:16, fontSize:11, color:'#555', lineHeight:1.9 }}>
              <li>알림서비스를 신청하면 재판기일, 결정·명령 등 사건 진행 내용을 알림톡·문자·전자우편으로 받을 수 있습니다.</li>
              <li>알림 수신을 위해 정확한 휴대폰 번호와 이메일을 입력하시기 바랍니다.</li>
              <li>본 페이지는 실습용 모의 페이지로, 실제 알림은 발송되지 않습니다.</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // ── 전자소송사건등록 ──────────────────────────────────────────
  const EcfsRegContent = () => {
    const [agreed, setAgreed] = useState(false)
    const [tab, setTab] = useState<'cert' | 'nocert'>('cert')
    const [sosongType, setSosongType] = useState('민사')
    const [selCourt, setSelCourt] = useState('수원지방법원')
    const [caseYear, setCaseYear] = useState('2026')
    const [caseGubun, setCaseGubun] = useState('가단')
    const [caseNum, setCaseNum] = useState('')
    const [multiCase, setMultiCase] = useState(false)
    const [relationType, setRelationType] = useState('대리인')
    const [certNo, setCertNo] = useState('')
    const [partyName, setPartyName] = useState('')
    const [foundCase, setFoundCase] = useState<{ court: string; plaintiff: string; defendant: string; caseName: string } | null>(null)
    const [searched, setSearched] = useState(false)

    // 가상 사건 데이터 — admin에서 관리, localStorage(ecfs_virtual_cases) 우선, 없으면 기본값
    const DEFAULT_VIRTUAL_CASES = [
      { id: 'd1', caseYear: '2026', caseGubun: '가단', caseNum: '11234', court: '서울중앙지방법원', plaintiff: '홍길동', defendant: '이순신', caseName: '손해배상' },
      { id: 'd2', caseYear: '2026', caseGubun: '가단', caseNum: '22345', court: '수원지방법원', plaintiff: '홍길동', defendant: '김철수', caseName: '대여금' },
      { id: 'd3', caseYear: '2025', caseGubun: '가단', caseNum: '33456', court: '인천지방법원', plaintiff: '김정호', defendant: '주식회사 사아자컨설팅', caseName: '물품대금' },
      { id: 'd4', caseYear: '2026', caseGubun: '가단', caseNum: '44567', court: '서울동부지방법원', plaintiff: '박민수', defendant: '이재영', caseName: '임대차보증금' },
      { id: 'd5', caseYear: '2025', caseGubun: '타채', caseNum: '55001', court: '서울중앙지방법원', plaintiff: '이민준', defendant: '주식회사 라마바기술', caseName: '채권압류' },
    ]
    const vcList: typeof DEFAULT_VIRTUAL_CASES = (() => {
      try { const d = JSON.parse(localStorage.getItem('ecfs_virtual_cases') || 'null'); return Array.isArray(d) && d.length > 0 ? d : DEFAULT_VIRTUAL_CASES } catch { return DEFAULT_VIRTUAL_CASES }
    })()
    const VIRTUAL_CASES: Record<string, { court: string; plaintiff: string; defendant: string; caseName: string }> =
      Object.fromEntries(vcList.map(c => [`${c.caseYear}-${c.caseGubun}-${c.caseNum}`, { court: c.court, plaintiff: c.plaintiff, defendant: c.defendant, caseName: c.caseName }]))

    const handleSearch = () => {
      if (!caseNum.trim()) { alert('사건번호를 입력하세요.'); return }
      const key = `${caseYear}-${caseGubun}-${caseNum.trim()}`
      const found = VIRTUAL_CASES[key] || null
      setFoundCase(found)
      setSearched(true)
      if (!found) alert('등록된 가상 사건번호가 아닙니다. 확인 후 다시 입력하세요.')
    }

    const handleRegister = () => {
      if (!agreed) { alert('동의 체크박스를 선택해주세요.'); return }
      if (!caseNum.trim()) { alert('사건번호를 입력하세요.'); return }
      const record = {
        id: String(Date.now()),
        registeredAt: new Date().toISOString(),
        userId: user?.id || '알 수 없음',
        userName: user?.name || '알 수 없음',
        sosongType,
        court: selCourt,
        caseNo: `${caseYear}${caseGubun}${caseNum.trim()}`,
        relationType,
        tab,
        certNo: tab === 'cert' ? certNo : '',
        partyName: tab === 'nocert' ? partyName : '',
        caseInfo: foundCase,
      }
      try {
        const prev = JSON.parse(localStorage.getItem('ecfs_registrations') || '[]')
        localStorage.setItem('ecfs_registrations', JSON.stringify([record, ...prev]))
      } catch { /* ignore */ }
      alert('전자소송 사건등록이 완료되었습니다. (실습 모드)')
    }

    const fRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee', fontSize: 13 }
    const fLabel: React.CSSProperties = { fontWeight: 600, color: '#333', fontSize: 12 }
    const sel: React.CSSProperties = { height: 30, border: '1px solid #c8cdd6', borderRadius: 3, padding: '0 6px', fontSize: 12, fontFamily: 'inherit' }

    const SOSONG_TYPES = ['민사','형사','가사','보호','행정','특허','회생파산','민사(지급명령)','민사집행','과태료']
    const COURTS = ['수원지방법원','서울중앙지방법원','서울서부지방법원','서울동부지방법원','서울남부지방법원','의정부지방법원','인천지방법원','부산지방법원','대구지방법원','광주지방법원','대전지방법원']
    const GUBUN = ['가단','가합','가소','나','머','제가단','제가합','제가소','제나','제머']
    const RELATION_TYPES = ['대리인','원고','피고','채권자','채무자','신청인','피신청인']

    return (
      <div style={{ fontFamily: 'inherit' }}>
        <PageHd title="전자소송사건등록" actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />

        {/* 안내문 */}
        <div style={{ margin: '0 0 12px', padding: '16px 20px', border: '1px solid #dde0e8', borderRadius: 4, background: '#fff', fontSize: 12, lineHeight: 2, color: '#333' }}>
          전자소송시스템을 이용하여 민사소송 등을 수행하고자 할 경우에는 반드시 해당 사건에 관하여 <strong>전자소송 동의를 하여야 합니다.</strong><br />
          전자소송 동의를 한 경우에는 <strong style={{ color: '#c0392b' }}>법원에 제출할 서류를 전자소송시스템을 이용하여 전자문서로 제출</strong>하여야 합니다.<br />
          전자소송 동의를 한 소송관계인에 대하여는 송달할 전자문서를 전자소송시스템에 등재하고 전자우편 등의 방법으로 그 사실을 통지함으로써 송달을 실시하고, 이때 소송관계인이 전자문서를 확인한 때 또는 전자문서 등재사실을 통지한 날부터 1주가 지난 날에 송달된 것으로 보게 됩니다(<strong>단, 후자의 경우 송달간주일은 1주가 지난 날 0시가 되므로, 기간 계산에 유의</strong>하여야 합니다).<br />
          공동의 이해관계를 가진 여러 소송관계인 중 1인이 전자소송 동의를 하면 다른 공동동의자 전원의 확인서를 전자문서로 변환하여 제출하는 방법으로 전자문서를 단독으로 제출할 수 있습니다.<br />
          또한 본안과 관련된 신청사건은 본안에 관한 전자소송 동의를 마친 경우에 한하여 전자소송으로 진행할 수 있습니다.<br />
          다만 본안사건이 1회 기일 다음날 후에는 전자소송 동의를 하더라도 본안사건과 신청사건 모두 전자문서의 제출만 가능하고, 전자소송시스템을 통한 기록열람이나 송달은 재판장의 허가가 있어야 가능함을 유의하시기 바랍니다.
        </div>

        {/* 동의 체크박스 */}
        <div style={{ padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" id="ecfs-agree" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
          <label htmlFor="ecfs-agree" style={{ cursor: 'pointer' }}>이 사건에 관하여 전자소송시스템을 이용한 진행에 동의합니다.</label>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', marginBottom: 0 }}>
          <button onClick={() => setTab('cert')} style={{ flex: 1, padding: '11px 0', border: '1px solid #c8cdd6', borderBottom: tab === 'cert' ? 'none' : '1px solid #c8cdd6', background: tab === 'cert' ? '#1a3a6b' : '#f0f2f6', color: tab === 'cert' ? '#fff' : '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', borderRadius: '4px 0 0 0' }}>전자소송인증번호가 있는 경우</button>
          <button onClick={() => setTab('nocert')} style={{ flex: 1, padding: '11px 0', border: '1px solid #c8cdd6', borderLeft: 'none', borderBottom: tab === 'nocert' ? 'none' : '1px solid #c8cdd6', background: tab === 'nocert' ? '#1a3a6b' : '#f0f2f6', color: tab === 'nocert' ? '#fff' : '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', borderRadius: '0 4px 0 0' }}>전자소송인증번호가 없는 경우</button>
        </div>

        {/* 폼 영역 */}
        <div style={{ border: '1px solid #c8cdd6', borderTop: 'none', padding: '16px 24px', background: '#fff', marginBottom: 12 }}>
          <div style={fRow}>
            <span style={fLabel}>소송유형</span>
            <div><select value={sosongType} onChange={e => setSosongType(e.target.value)} style={sel}>
              {SOSONG_TYPES.map(t => <option key={t}>{t}</option>)}
            </select></div>
          </div>
          <div style={fRow}>
            <span style={fLabel}>법원</span>
            <div><select value={selCourt} onChange={e => setSelCourt(e.target.value)} style={sel}>
              {COURTS.map(c => <option key={c}>{c}</option>)}
            </select></div>
          </div>
          <div style={fRow}>
            <span style={fLabel}>사건번호</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <select value={caseYear} onChange={e => setCaseYear(e.target.value)} style={{ ...sel, width: 68 }}>
                {['2022','2023','2024','2025','2026','2027'].map(y => <option key={y}>{y}</option>)}
              </select>
              <select value={caseGubun} onChange={e => setCaseGubun(e.target.value)} style={{ ...sel, width: 72 }}>
                {GUBUN.map(g => <option key={g}>{g}</option>)}
              </select>
              <input value={caseNum} onChange={e => setCaseNum(e.target.value)} placeholder="번호" style={{ ...sel, width: 80, padding: '0 6px' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={multiCase} onChange={e => setMultiCase(e.target.checked)} /> 사건구분 가나다순 정렬
              </label>
              <button onClick={handleSearch} style={{ height: 30, padding: '0 14px', background: '#555', color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>조회</button>
            </div>
          </div>

          {/* 조회 결과 */}
          {searched && foundCase && (
            <div style={{ marginTop: 0, padding: '10px 16px', background: '#f0f8f0', border: '1px solid #b2d8b2', borderRadius: 4, fontSize: 12, display: 'flex', gap: 24 }}>
              <span>법원: <strong>{foundCase.court}</strong></span>
              <span>사건명: <strong>{foundCase.caseName}</strong></span>
              <span>원고: <strong>{foundCase.plaintiff}</strong></span>
              <span>피고: <strong>{foundCase.defendant}</strong></span>
            </div>
          )}

          <div style={fRow}>
            <span style={fLabel}>소송관계인유형</span>
            <div><select value={relationType} onChange={e => setRelationType(e.target.value)} style={sel}>
              {RELATION_TYPES.map(r => <option key={r}>{r}</option>)}
            </select></div>
          </div>

          {tab === 'cert' ? (
            <div style={fRow}>
              <span style={fLabel}>전자소송인증번호</span>
              <input value={certNo} onChange={e => setCertNo(e.target.value)} placeholder="인증번호 입력" style={{ ...sel, width: 160, padding: '0 8px' }} />
            </div>
          ) : (
            <div style={fRow}>
              <span style={fLabel}>당사자명</span>
              <input value={partyName} onChange={e => setPartyName(e.target.value)} placeholder="당사자명 입력" style={{ ...sel, width: 160, padding: '0 8px' }} />
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
            <button onClick={handleRegister} style={{ padding: '8px 40px', background: '#0098a3', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>등록</button>
          </div>
        </div>

        {/* 참고하세요 */}
        <div style={{ border: '1px solid #dde0e8', borderRadius: 6, padding: '14px 20px', background: '#fafbfd', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>📋</div>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.9 }}>
              <strong>참고하세요</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                <li>알림서비스는 자동으로 등록되며 '맞춤형알림서비스' 메뉴에서 변경이 가능합니다.</li>
                <li>유대전의 알림서비스는 알림톡으로 우선 발송되며, 알림톡이 불가능한 경우 문자메시지로 발송됩니다.</li>
                <li>문자메시지 발송은 1회 시도하며, 수신인의 대표 계정, 수신불가한 음영지역, 잘못된 전화번호 등 발송 실패 시 재시도하지 않습니다.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 전자소송 인증번호 안내 */}
        <div style={{ border: '1px solid #dde0e8', borderRadius: 6, padding: '14px 20px', background: '#fafbfd' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>📋</div>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.9 }}>
              <strong>{tab === 'cert' ? '전자소송 인증번호를 받았습니까?' : '전자소송 인증번호를 받지 못했습니까?'}</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                {tab === 'cert' ? (
                  <>
                    <li>송달받은 전자소송안내서에 표시된 전자소송 인증번호를 입력하여 실명확인을 받은 후, 전자소송절차 진행에 동의하여 해당 사건을 전자소송으로 진행할 수 있습니다.</li>
                    <li>전자소송인증번호는 본안에 한하여 사용이 가능한 고유한 식별번호입니다. 따라서 대리인의 경우에는 당사자의 전자소송 인증번호를 사용할 수 없습니다.</li>
                  </>
                ) : (
                  <>
                    <li>해당 사건정보에 주민(사업자)등록번호가 입력되어있는 경우 인증번호 없이도 소송관계인 유형 및 당사자명을 입력하여 전자사건등록이 가능합니다.</li>
                    <li>대리인은 본인의 주민(사업자)등록번호가 사건에 등록되지 않은 경우라도 대리인 정보를 입력하고 사건을 등록할 수 있습니다.</li>
                    <li>소송위임장(필요시 담변서/반리서 작성), 소송수행자지정서를 전자적으로 제출하여 재판부의 확인을 받은 후 온라인으로 기록열람을 할 수 있습니다.</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 완료된사건 ───────────────────────────────────────────────
  const CompletedCasesContent = () => {
    const [filterType, setFilterType] = useState('전체')
    const [filterCourt, setFilterCourt] = useState('전체')
    const [searchMode, setSearchMode] = useState<'date'|'caseNo'>('date')
    const [currentPage, setCurrentPage] = useState(1)
    const perPage = 10

    const LAWSUIT_TYPES = ['전체','민사','형사','가사','보호','행정','특허','회생파산','민사(지급명령)','민사집행']
    const COURTS = ['전체','서울중앙지방법원','서울동부지방법원','서울서부지방법원','서울남부지방법원','서울북부지방법원','수원지방법원','인천지방법원','의정부지방법원','춘천지방법원','대전지방법원','청주지방법원','대구지방법원','부산지방법원','울산지방법원','창원지방법원','광주지방법원','전주지방법원','제주지방법원']

    const MOCK: { court:string; caseNo:string; dept:string; stance:string; recvDate:string; confirmDate:string; plaintiff:string; defendant:string }[] = [
      { court:'수원지법',        caseNo:'2026가단11111', dept:'민사3단독',    stance:'피고대리인',   recvDate:'2025.07.03', confirmDate:'',          plaintiff:'주식회사 가나다물산',          defendant:'홍길동' },
      { court:'서울중앙지법',    caseNo:'2025타채55001', dept:'기타집행5게',  stance:'채권자대리인', recvDate:'2025.06.24', confirmDate:'',          plaintiff:'이민준',                      defendant:'주식회사 라마바기술' },
      { court:'인천지법',        caseNo:'2025가단88002', dept:'민사43단독',   stance:'채권자대리인', recvDate:'2025.05.02', confirmDate:'',          plaintiff:'김정호',                      defendant:'주식회사 사아자컨설팅' },
      { court:'서울행정법원',    caseNo:'2025구단33003', dept:'행정3단독',    stance:'원고대리인',   recvDate:'2025.03.18', confirmDate:'',          plaintiff:'박성민',                      defendant:'서울특별시 차구청장' },
      { court:'수원지법 안양지원',caseNo:'2024가단99004', dept:'32단독(가압류)',stance:'채권자대리인', recvDate:'2024.11.29', confirmDate:'',          plaintiff:'주식회사 카타파네트웍스',     defendant:'주식회사 하카도컴퍼니' },
      { court:'부산지법 서부지원',caseNo:'2024타배55005', dept:'채권배당1게',  stance:'채권자대리인', recvDate:'2024.11.28', confirmDate:'',          plaintiff:'이준혁 외 6명',               defendant:'최민주' },
      { court:'서울중앙지법',    caseNo:'2023가단66006', dept:'제201민사단독',stance:'피고대리인',   recvDate:'2023.05.02', confirmDate:'',          plaintiff:'주식회사 파하거설',           defendant:'정상우' },
      { court:'청주지법 충주지원',caseNo:'2023카합20007(본소)',dept:'제1민사부',stance:'피고대리인', recvDate:'2023.04.19', confirmDate:'',          plaintiff:'가나다손보 주식회사 외 2명',  defendant:'' },
      { court:'화성시법원',      caseNo:'2023가소303008', dept:'소액1단독',   stance:'원고대리인',   recvDate:'2023.02.07', confirmDate:'2024.05.25',plaintiff:'최지수',                      defendant:'김민수 외 1명' },
      { court:'부산지법 서부지원',caseNo:'2022카정200009', dept:'3(민사)단독', stance:'신청인대리인', recvDate:'2022.01.28', confirmDate:'',          plaintiff:'주식회사 나라',               defendant:'이민섭' },
      { court:'서울중앙지법',    caseNo:'2022가합11010',  dept:'민사합의22부', stance:'피고대리인',  recvDate:'2022.01.10', confirmDate:'2023.12.15',plaintiff:'홍길동 외 2명',               defendant:'주식회사 다나라건설' },
    ]

    const filtered = MOCK.filter(c => {
      if (filterType !== '전체' && filterType !== '민사' && filterType !== '행정') return false
      if (filterCourt !== '전체' && !c.court.includes(filterCourt.replace('지방법원','지법').replace('법원',''))) return false
      return true
    })
    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const paged = filtered.slice((currentPage-1)*perPage, currentPage*perPage)
    const tdS: React.CSSProperties = { padding:'7px 8px', fontSize:12, borderBottom:'1px solid #e8edf0', verticalAlign:'middle', textAlign:'center' }

    return (
      <div style={{ fontFamily:'inherit' }}>
        <PageHd title="완료된사건" actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />

        {/* 필터 */}
        <div style={{ background:'#fff', borderBottom:'1px solid #dde0e8', padding:'10px 14px', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:12, color:'#555', fontWeight:600, minWidth:40 }}>소송유형</span>
            <select value={filterType} onChange={e=>{setFilterType(e.target.value);setCurrentPage(1)}} style={{ height:30, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 6px', fontFamily:'inherit' }}>
              {LAWSUIT_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <select style={{ height:30, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 6px', fontFamily:'inherit' }}>
              {['전체','민사본안','민사신청','기타'].map(t=><option key={t}>{t}</option>)}
            </select>
            <span style={{ fontSize:12, color:'#555', fontWeight:600, minWidth:20, marginLeft:8 }}>법원</span>
            <select value={filterCourt} onChange={e=>{setFilterCourt(e.target.value);setCurrentPage(1)}} style={{ height:30, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 6px', fontFamily:'inherit' }}>
              {COURTS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <label style={{ fontSize:12, display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}>
              <input type="radio" name="compMode" checked={searchMode==='date'} onChange={()=>setSearchMode('date')} style={{ accentColor:'#003366' }} />접수일자
            </label>
            <label style={{ fontSize:12, display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}>
              <input type="radio" name="compMode" checked={searchMode==='caseNo'} onChange={()=>setSearchMode('caseNo')} style={{ accentColor:'#003366' }} />사건번호
            </label>
            {searchMode==='date' ? (
              <>
                <input type="date" style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 6px', fontSize:12, fontFamily:'inherit' }} />
                <span style={{ fontSize:12 }}>~</span>
                <input type="date" style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 6px', fontSize:12, fontFamily:'inherit' }} />
                {['오늘','3일','1주일','1개월','전체'].map(l=>(
                  <button key={l} style={{ height:26, padding:'0 9px', background:'#fff', border:'1px solid #c8cdd6', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>{l}</button>
                ))}
              </>
            ) : (
              <>
                <select style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 4px', fontFamily:'inherit' }}>
                  {['2026','2025','2024','2023','2022'].map(y=><option key={y}>{y}</option>)}
                </select>
                <select style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 4px', fontFamily:'inherit' }}>
                  {['가단','가합','나','가소','가불','타채','타배','카합','카정','구단'].map(t=><option key={t}>{t}</option>)}
                </select>
                <input type="text" style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 6px', fontSize:12, fontFamily:'inherit', width:100 }} placeholder="사건번호" />
              </>
            )}
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:12, color:'#555', fontWeight:600, minWidth:40 }}>정렬순서</span>
            {[['접수일↓','접수일↑'],['법원↑','법원↓'],['사건번호↓','사건번호↑']].map((opts,i)=>(
              <select key={i} defaultValue={opts[0]} style={{ height:26, border:'1px solid #c8cdd6', borderRadius:3, fontSize:11, padding:'0 4px', fontFamily:'inherit' }}>
                {opts.map(o=><option key={o}>{o}</option>)}
              </select>
            ))}
          </div>
          <div style={{ textAlign:'center' }}>
            <button style={{ height:34, padding:'0 48px', background:'#0098a3', color:'#fff', border:'none', borderRadius:3, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>조 회</button>
          </div>
        </div>

        {/* 상단 버튼 */}
        <div style={{ background:'#fff', borderBottom:'1px solid #dde0e8', padding:'6px 14px', display:'flex', justifyContent:'flex-end', gap:6 }}>
          <button style={{ height:28, padding:'0 10px', background:'#1a7a3a', color:'#fff', border:'none', borderRadius:3, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
            <span style={{ fontSize:13 }}>📗</span> 엑셀로 저장
          </button>
          <ActBtn label="완료사건 지정취소" />
        </div>

        {/* 테이블 */}
        <div style={{ background:'#fff', overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#f0f3f8', borderBottom:'2px solid #b8c8e0' }}>
                <th style={{ padding:'8px 8px', width:28 }}><input type="checkbox" /></th>
                {['법원','사건번호','재판부','사건지위','접수일자','확정일자','원고','피고','바로가기'].map(h=>(
                  <th key={h} style={{ padding:'8px 8px', fontWeight:600, fontSize:11, color:'#333', whiteSpace:'nowrap', textAlign:'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((c, i) => (
                <tr key={c.caseNo} style={{ background:i%2===0?'#fff':'#fafbfe', borderBottom:'1px solid #e8edf0' }}>
                  <td style={{...tdS}}><input type="checkbox" /></td>
                  <td style={{...tdS, whiteSpace:'nowrap'}}>{c.court}</td>
                  <td style={{...tdS}}>
                    <span style={{ color:'#0057a8', textDecoration:'underline', cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}
                      onClick={()=>alert('실습 모드 — 사건 상세 조회')}>{c.caseNo}</span>
                  </td>
                  <td style={{...tdS, whiteSpace:'nowrap', color:'#555'}}>{c.dept}</td>
                  <td style={{...tdS, whiteSpace:'nowrap', color:'#555'}}>{c.stance}</td>
                  <td style={{...tdS, whiteSpace:'nowrap', color:'#555'}}>{c.recvDate}</td>
                  <td style={{...tdS, whiteSpace:'nowrap', color:'#555'}}>{c.confirmDate || ''}</td>
                  <td style={{...tdS, maxWidth:90, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.plaintiff}</td>
                  <td style={{...tdS, maxWidth:90, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.defendant}</td>
                  <td style={{...tdS}}>
                    <button onClick={()=>alert('실습 모드 — 메뉴 선택')} style={{ height:24, padding:'0 8px', background:'#fff', border:'1px solid #8899bb', borderRadius:3, fontSize:11, cursor:'pointer', color:'#003366', fontFamily:'inherit' }}>메뉴선택</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
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
          <select defaultValue="10" style={{ height:26, border:'1px solid #ccc', borderRadius:3, fontSize:11, padding:'0 4px', fontFamily:'inherit' }}>
            {['10','20','30'].map(n=><option key={n}>{n}개씩 보기</option>)}
          </select>
        </div>
      </div>
    )
  }

  // ── 전자문서제출/송달내역 (목록) ─────────────────────────────
  const DocHistoryContent = () => {
    const [filterGubun, setFilterGubun] = useState('전체')
    const [searchText, setSearchText] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const perPage = 10
    const ci = viewDocCase || { caseNo:'2026가단11234', court:'서울중앙지방법원', dept:'민사3단독', plaintiff:'홍길동 외 1명', defendant:'이순신 외 1명', caseName:'손해배상 등' }

    const DOCS: DocItem[] = [
      { no:1,  docName:'변경기일통지서',                      gubun:'송달', submitDate:'', delivDate:'2026.01.19', confirmDate:'2026.01.27(자동확인)', docSubmitNo:'2097108001234' },
      { no:2,  docName:'준비서면',                            gubun:'제출', submitDate:'2026.01.11', delivDate:'', confirmDate:'', submitter:'홍길동(practice01)' },
      { no:3,  docName:'준비서면부본(26.01.05.자)',            gubun:'송달', submitDate:'', delivDate:'2026.01.12', confirmDate:'2026.01.19', docSubmitNo:'2097107998765' },
      { no:4,  docName:'기일변경명령등본',                     gubun:'송달', submitDate:'', delivDate:'2025.12.26', confirmDate:'2025.12.27', docSubmitNo:'2097107956789' },
      { no:5,  docName:'변경기일통지서',                      gubun:'송달', submitDate:'', delivDate:'2025.11.19', confirmDate:'2025.11.23', docSubmitNo:'2097107923456' },
      { no:6,  docName:'서증 직접 신청서부본(25.10.14.자)',   gubun:'송달', submitDate:'', delivDate:'2025.10.15', confirmDate:'2025.10.19', docSubmitNo:'2097107889012' },
      { no:7,  docName:'준비서면부본(25.10.14.자)',            gubun:'송달', submitDate:'', delivDate:'2025.10.15', confirmDate:'2025.10.19', docSubmitNo:'2097107889011' },
      { no:8,  docName:'변경기일통지서',                      gubun:'송달', submitDate:'', delivDate:'2025.10.15', confirmDate:'2025.10.19', docSubmitNo:'2097107889010' },
      { no:9,  docName:'서증부본(25.08.08.자)',                gubun:'송달', submitDate:'', delivDate:'2025.08.08', confirmDate:'2025.08.09', docSubmitNo:'2097107845678' },
      { no:10, docName:'증거설명서부본(25.08.08.자)',          gubun:'송달', submitDate:'', delivDate:'2025.08.08', confirmDate:'2025.08.09', docSubmitNo:'2097107845677' },
      { no:11, docName:'답변서부본',                          gubun:'송달', submitDate:'', delivDate:'2026.02.25', confirmDate:'2026.02.26', docSubmitNo:'2097108023456' },
      { no:12, docName:'소장',                                gubun:'제출', submitDate:'2026.02.15', delivDate:'', confirmDate:'', submitter:'홍길동(practice01)' },
      { no:13, docName:'소장부본',                            gubun:'송달', submitDate:'', delivDate:'2026.02.15', confirmDate:'2026.02.15', docSubmitNo:'2097108012345' },
      { no:14, docName:'기일통지서',                          gubun:'송달', submitDate:'', delivDate:'2026.03.10', confirmDate:'2026.03.11', docSubmitNo:'2097108034567' },
      { no:15, docName:'증거신청서',                          gubun:'제출', submitDate:'2026.03.20', delivDate:'', confirmDate:'', submitter:'홍길동(practice01)' },
    ]

    const filtered = DOCS.filter(d => {
      if (filterGubun !== '전체' && d.gubun !== filterGubun) return false
      if (searchText && !d.docName.includes(searchText)) return false
      return true
    })
    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const paged = filtered.slice((currentPage-1)*perPage, currentPage*perPage)
    const tdS: React.CSSProperties = { padding:'7px 10px', fontSize:12, borderBottom:'1px solid #eee', verticalAlign:'middle', textAlign:'center' }

    function goDetail(doc: DocItem) {
      setViewDocItem(doc)
      navTo(doc.gubun === '송달' ? 'delivery-detail' : 'submit-detail')
    }

    return (
      <div>
        <PageHd title="전자문서제출/송달내역" actions={<ActBtn label="🖨 출력" />} />
        <CaseInfoTable ci={ci} />

        {/* 필터 */}
        <div style={{ background:'#fff', borderBottom:'1px solid #eee', padding:'8px 14px', display:'flex', gap:8, alignItems:'center' }}>
          <select value={filterGubun} onChange={e=>{setFilterGubun(e.target.value);setCurrentPage(1)}} style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, fontSize:12, padding:'0 6px', fontFamily:'inherit' }}>
            {['전체','송달','제출'].map(t=><option key={t}>{t}</option>)}
          </select>
          <div style={{ flex:1 }} />
          <input type="text" value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="문서검색" style={{ height:28, border:'1px solid #c8cdd6', borderRadius:3, padding:'0 8px', fontSize:12, fontFamily:'inherit', width:180 }} />
          <button onClick={()=>setCurrentPage(1)} style={{ height:28, padding:'0 12px', background:'#003366', color:'#fff', border:'none', borderRadius:3, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>결과내검색</button>
        </div>

        {/* 테이블 */}
        <div style={{ background:'#fff', overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#f0f3f8', borderBottom:'2px solid #b8c8e0' }}>
                {['번호','문서명','구분','제출일자','송달일자','송달확인일자','상세내역'].map(h=>(
                  <th key={h} style={{ padding:'8px 10px', fontWeight:600, fontSize:11, color:'#333', textAlign:'center', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((doc, i) => (
                <tr key={doc.no} style={{ background:i%2===0?'#fff':'#fafbfe', borderBottom:'1px solid #eee' }}>
                  <td style={tdS}>{doc.no}</td>
                  <td style={{...tdS, textAlign:'left'}}>
                    {doc.gubun === '송달'
                      ? <span style={{ color:'#0057a8', textDecoration:'underline', cursor:'pointer', fontWeight:600 }} onClick={()=>goDetail(doc)}>{doc.docName}</span>
                      : doc.docName}
                  </td>
                  <td style={tdS}><span style={{ color:doc.gubun==='송달'?'#006699':'#555', fontWeight:doc.gubun==='송달'?600:400 }}>{doc.gubun}</span></td>
                  <td style={tdS}>{doc.submitDate || '-'}</td>
                  <td style={tdS}>{doc.delivDate || '-'}</td>
                  <td style={tdS}>{doc.confirmDate || '-'}</td>
                  <td style={tdS}>
                    <button onClick={()=>goDetail(doc)} style={{ height:24, padding:'0 10px', background:'#fff', border:'1px solid #8899bb', borderRadius:3, fontSize:11, cursor:'pointer', color:'#003366', fontFamily:'inherit' }}>조회</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
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
          <select defaultValue="10" style={{ height:26, border:'1px solid #ccc', borderRadius:3, fontSize:11, padding:'0 4px', fontFamily:'inherit' }}>
            {['10','20','30'].map(n=><option key={n}>{n}개씩 보기</option>)}
          </select>
        </div>
        <div style={{ padding:'12px 16px', background:'#fff', borderTop:'1px solid #eee' }}>
          <button onClick={()=>navTo('active-cases')} style={{ height:32, padding:'0 20px', background:'#fff', border:'1px solid #8899bb', borderRadius:3, fontSize:12, cursor:'pointer', color:'#333', fontFamily:'inherit' }}>이전으로 가기</button>
        </div>
        <div style={{ background:'#f8f9fc', border:'1px solid #dde0e8', borderTop:'none', padding:'14px 18px', display:'flex', gap:12, alignItems:'flex-start' }}>
          <div style={{ fontSize:22, marginTop:2 }}>🖥</div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#003366', marginBottom:6 }}>참고하세요</div>
            <ul style={{ margin:0, paddingLeft:16, fontSize:11, color:'#555', lineHeight:1.9 }}>
              <li>전자소송으로 처리된 문서들의 제출 및 송달 내역을 확인할 수 있습니다.</li>
              <li>송달문서 클릭 시 송달내역 상세 정보 및 조회이력을 확인할 수 있습니다.</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // ── 송달내역 상세 ─────────────────────────────────────────────
  const DeliveryDetailContent = () => {
    const doc = viewDocItem
    const ci = viewDocCase || { caseNo:'2026가단11234', court:'서울중앙지방법원', dept:'민사3단독', plaintiff:'홍길동 외 1명', defendant:'이순신 외 1명', caseName:'손해배상 등' }
    const hasHistory = doc?.confirmDate && !doc.confirmDate.includes('자동확인')
    const thS: React.CSSProperties = { padding:'9px 14px', background:'#f5f6fa', fontWeight:600, color:'#555', width:'14%', textAlign:'left', whiteSpace:'nowrap', borderBottom:'1px solid #eee', fontSize:12 }
    const tdS: React.CSSProperties = { padding:'9px 14px', borderBottom:'1px solid #eee', fontSize:12 }

    return (
      <div>
        <PageHd title="송달내역" actions={<ActBtn label="🖨 출력" />} />
        <CaseInfoTable ci={ci} />

        {/* 송달내역상세 */}
        <div style={{ background:'#fff', marginTop:8 }}>
          <div style={{ padding:'8px 14px', fontSize:13, fontWeight:700, color:'#003366', borderBottom:'1px solid #dde0e8', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:'#0098a3', fontSize:15 }}>○</span> 송달내역상세
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <tbody>
              <tr><th style={thS}>송달문서명</th><td style={tdS}>{doc?.docName || '–'}</td></tr>
              <tr><th style={thS}>송달자명</th><td style={tdS}>홍길동(practice01)</td></tr>
              <tr><th style={thS}>발송일자</th><td style={tdS}>{doc?.delivDate?.replace(/\(.*\)/,'') || '–'}</td></tr>
              <tr><th style={thS}>수신일자</th><td style={tdS}>{doc?.confirmDate?.replace(/\(.*\)/,'') || '–'}</td></tr>
              <tr><th style={thS}>문서제출번호</th><td style={tdS}>{doc?.docSubmitNo || '–'}</td></tr>
              <tr>
                <th style={{...thS, borderBottom:'none'}}>문서확인</th>
                <td style={{...tdS, borderBottom:'none'}}>
                  <span onClick={()=>alert('실습 모드 — 문서 열람')} style={{ color:'#0057a8', textDecoration:'underline', cursor:'pointer' }}>{doc?.docName || '–'}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 송달조회이력 */}
        <div style={{ background:'#fff', marginTop:8 }}>
          <div style={{ padding:'8px 14px', fontSize:13, fontWeight:700, color:'#003366', borderBottom:'1px solid #dde0e8', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:'#0098a3', fontSize:15 }}>○</span> 송달조회이력
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#f0f3f8', borderBottom:'2px solid #b8c8e0' }}>
                {['조회일자','조회시간','조회자명','조회자아이디'].map(h=>(
                  <th key={h} style={{ padding:'8px 14px', fontWeight:600, fontSize:11, color:'#333', textAlign:'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hasHistory ? (
                <tr>
                  <td style={{ padding:'8px 14px', textAlign:'center', borderBottom:'1px solid #eee' }}>{doc!.confirmDate!.replace(/\(.*\)/,'')}</td>
                  <td style={{ padding:'8px 14px', textAlign:'center', borderBottom:'1px solid #eee' }}>09:15:22</td>
                  <td style={{ padding:'8px 14px', textAlign:'center', borderBottom:'1px solid #eee' }}>홍길동</td>
                  <td style={{ padding:'8px 14px', textAlign:'center', borderBottom:'1px solid #eee' }}>practice01</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding:'32px', textAlign:'center', fontSize:12, color:'#999' }}>조회된 결과가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding:'12px 16px', background:'#fff', borderTop:'1px solid #eee', marginTop:8 }}>
          <button onClick={()=>navTo('doc-history')} style={{ height:32, padding:'0 20px', background:'#fff', border:'1px solid #8899bb', borderRadius:3, fontSize:12, cursor:'pointer', color:'#333', fontFamily:'inherit' }}>이전으로 가기</button>
        </div>
      </div>
    )
  }

  // ── 제출상세내역 ──────────────────────────────────────────────
  const SubmitDetailContent = () => {
    const doc = viewDocItem
    const ci = viewDocCase || { caseNo:'2026가단11234', court:'서울중앙지방법원', dept:'민사3단독', plaintiff:'홍길동 외 1명', defendant:'이순신 외 1명', caseName:'손해배상 등' }
    const thS: React.CSSProperties = { padding:'9px 14px', background:'#f5f6fa', fontWeight:600, color:'#555', width:'14%', textAlign:'left', whiteSpace:'nowrap', borderBottom:'1px solid #eee', fontSize:12 }
    const tdS: React.CSSProperties = { padding:'9px 14px', borderBottom:'1px solid #eee', fontSize:12 }

    return (
      <div>
        <PageHd title="제출상세내역" actions={<ActBtn label="🖨 출력" />} />
        <CaseInfoTable ci={ci} />

        {/* 접수내역 */}
        <div style={{ background:'#fff', marginTop:8 }}>
          <div style={{ padding:'8px 14px', fontSize:13, fontWeight:700, color:'#003366', borderBottom:'1px solid #dde0e8', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:'#0098a3', fontSize:15 }}>○</span> 접수내역
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <tbody>
              <tr>
                <th style={thS}>제출문서명</th>
                <td style={tdS}><span onClick={()=>alert('실습 모드 — 문서 열람')} style={{ color:'#0057a8', textDecoration:'underline', cursor:'pointer' }}>{doc?.docName || '–'}</span></td>
                <th style={thS}>접수일시</th>
                <td style={tdS}>{doc?.submitDate ? doc.submitDate + ' 19:57' : '–'}</td>
              </tr>
              <tr>
                <th style={{...thS, borderBottom:'none'}}>제출자명</th>
                <td style={{...tdS, borderBottom:'none'}} colSpan={3}>홍길동(practice01)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 서명내역 */}
        <div style={{ background:'#fff', marginTop:8 }}>
          <div style={{ padding:'8px 14px', fontSize:13, fontWeight:700, color:'#003366', borderBottom:'1px solid #dde0e8', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:'#0098a3', fontSize:15 }}>○</span> 서명내역
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#f0f3f8', borderBottom:'2px solid #b8c8e0' }}>
                {['문서명','서명일시','서명자구분','서명자명(전자소송ID)'].map(h=>(
                  <th key={h} style={{ padding:'8px 12px', fontWeight:600, fontSize:11, color:'#333', textAlign:'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding:'8px 12px', textAlign:'center', borderBottom:'1px solid #eee' }}>{doc?.docName || '–'}</td>
                <td style={{ padding:'8px 12px', textAlign:'center', borderBottom:'1px solid #eee' }}>{doc?.submitDate ? doc.submitDate + ' 19:57' : '–'}</td>
                <td style={{ padding:'8px 12px', textAlign:'center', borderBottom:'1px solid #eee' }}>피고대리인</td>
                <td style={{ padding:'8px 12px', textAlign:'center', borderBottom:'1px solid #eee' }}>홍길동(practice01)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ padding:'12px 16px', background:'#fff', borderTop:'1px solid #eee', marginTop:8 }}>
          <button onClick={()=>navTo('doc-history')} style={{ height:32, padding:'0 20px', background:'#fff', border:'1px solid #8899bb', borderRadius:3, fontSize:12, cursor:'pointer', color:'#333', fontFamily:'inherit' }}>이전으로 가기</button>
        </div>
      </div>
    )
  }

  function renderContent() {
    switch (activePage) {
      case 'status': return <StatusContent />
      case 'active-cases': return <ActiveCasesContent />
      case 'assigned-cases': return <AssignedCasesContent />
      case 'draft-docs': return <DraftDocsContent />
      case 'practice-records': return <PracticeRecordsContent />
      case 'submitted-docs': return <SubmittedDocsContent />
      case 'schedule': return <ScheduleContent />
      case 'pay': return <PayContent />
      case 'all-delivery': return <AllDeliveryContent />
      case 'unread-delivery': return <UnreadDeliveryContent />
      case 'alert-service': return <AlertServiceContent />
      case 'doc-history': return <DocHistoryContent />
      case 'delivery-detail': return <DeliveryDetailContent />
      case 'submit-detail': return <SubmitDetailContent />
      case 'completed-cases': return <CompletedCasesContent />
      case 'ecfs-reg': return <EcfsRegContent />
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
        <aside style={{ width: 200, flexShrink: 0, background: '#fff', border: '1px solid #d8dce8', borderRadius: 4, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ background: '#1e3a6e', color: '#fff', padding: '12px 16px', fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>
            나의전자소송
          </div>
          {/* 나의사건현황 */}
          <div onClick={() => navTo('status')} style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', background: activePage === 'status' ? '#eef4ff' : '#fff', color: activePage === 'status' ? '#0067c2' : '#222', fontWeight: 700, borderBottom: '1px solid #dde0ea', borderLeft: activePage === 'status' ? '3px solid #0067c2' : '3px solid transparent' }}>
            나의사건현황
          </div>

          <GrpHd label="나의사건관리" gKey="나의사건관리" />
          {openGroups['나의사건관리'] && (
            <>
              <SbItem label="진행중사건" page="active-cases" />
              <SbItem label="관심사건" page="generic" title="관심사건" />
              <SbItem label="확정된사건" page="generic" title="확정된사건" />
              <SbItem label="완료된사건" page="completed-cases" title="완료된사건" />
            </>
          )}

          <GrpHd label="사건진행" gKey="사건진행" />
          {openGroups['사건진행'] && (
            <>
              <SbItem label="재판일정" page="schedule" />
              <SbItem label="대조형 쟁점요약" page="generic" title="대조형 쟁점요약" />
              <SbItem label="사건별게시판" page="generic" title="사건별게시판" />
              <SbItem label="문서송부확인" page="generic" title="문서송부확인" />
              <SbItem label="서증인부(문서송부)" page="generic" title="서증인부(문서송부)" />
              <SbItem label="보정/미보정내역(독촉)" page="generic" title="보정/미보정내역(독촉)" />
              <SbItem label="증거의견입력" page="generic" title="증거의견입력" />
            </>
          )}

          <GrpHd label="국선전담사건" gKey="국선전담사건" />
          {openGroups['국선전담사건'] && (
            <>
              <SbItem label="처리내역관리" page="generic" title="처리내역관리" />
              <SbItem label="보고된사건조회" page="generic" title="보고된사건조회" />
            </>
          )}

          <GrpHd label="각종신청" gKey="각종신청" />
          {openGroups['각종신청'] && (
            <>
              <SbItem label="알림서비스신청" page="alert-service" />
              <SbItem label="판결문전자송달신청" page="generic" title="판결문전자송달신청" />
              <SbItem label="송달료 자동납부신청" page="generic" title="송달료 자동납부신청" />
              <SbItem label="제증명발급신청" page="generic" title="제증명발급신청" />
            </>
          )}

          <GrpHd label="나의문서함" gKey="나의문서함" />
          {openGroups['나의문서함'] && (
            <>
              <SbItem label="작성중서류" page="draft-docs" />
              <SbItem label="제출서류" page="submitted-docs" />
              <SbItem label="미확인송달문서" page="unread-delivery" />
              <SbItem label="전체송달문서" page="all-delivery" />
              <SbItem label="송달문서 정(등)본발급" page="generic" title="송달문서 정(등)본발급" />
            </>
          )}

          <GrpHd label="납부/환급관리" gKey="납부환급관리" />
          {openGroups['납부환급관리'] && (
            <>
              <SbItem label="소송비용납부" page="pay" />
              <SbItem label="상소비용예납" page="generic" title="상소비용예납" />
              <SbItem label="전자납부내역" page="generic" title="전자납부내역" />
              <SbItem label="가상계좌내역" page="generic" title="가상계좌내역" />
              <SbItem label="송달료 자동납부내역" page="generic" title="송달료 자동납부내역" />
              <SbItem label="대표청구인 신고" page="generic" title="대표청구인 신고" />
              <SbItem label="인지액환급청구" page="generic" title="인지액환급청구" />
              <SbItem label="과오납금반환청구" page="generic" title="과오납금반환청구" />
            </>
          )}

          <GrpHd label="기록 열람" gKey="기록열람" />
          {openGroups['기록열람'] && (
            <>
              <SbItem label="나의사건열람" page="generic" title="나의사건열람" />
              <SbItem label="형사전자사본화사건열람" page="generic" title="형사전자사본화사건열람" />
            </>
          )}

          <GrpHd label="전자소송사건등록" gKey="전자소송사건등록" />
          {openGroups['전자소송사건등록'] && (
            <>
              <SbItem label="전자소송사건등록" page="ecfs-reg" />
              <SbItem label="형사전자사본화사건등록" page="generic" title="형사전자사본화사건등록" />
            </>
          )}

          <GrpHd label="맞춤형문서함" gKey="맞춤형문서함" />
          {openGroups['맞춤형문서함'] && (
            <>
              <SbItem label="파산관재인 사건 관리" page="generic" title="파산관재인 사건 관리" />
              <SbItem label="제출문서 반려의견" page="generic" title="제출문서 반려의견" />
              <SbItem label="채권정보조회" page="generic" title="채권정보조회" />
              <SbItem label="사실조회기관회신" page="generic" title="사실조회기관회신" />
              <SbItem label="상담의견교환" page="generic" title="상담의견교환" />
              <SbItem label="제3채무자" page="generic" title="제3채무자" />
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
