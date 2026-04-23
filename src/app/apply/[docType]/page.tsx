'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import MockBar from '@/components/layout/MockBar'
import GnbNav from '@/components/layout/GnbNav'
import Footer from '@/components/layout/Footer'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { TEAL, NAVY } from '@/lib/constants'
import { DOCUMENT_CONFIGS, type SectionType } from '@/data/documents'
import { type DocumentFormData, EMPTY_DOC_FORM } from '@/types'

// Section components
import CaseInfoSection from '@/components/apply/sections/CaseInfoSection'
import PartiesSection from '@/components/apply/sections/PartiesSection'
import RepresentativeSection from '@/components/apply/sections/RepresentativeSection'
import RichTextSection from '@/components/apply/sections/RichTextSection'
import SignatorySection from '@/components/apply/sections/SignatorySection'
import EvidenceSection from '@/components/apply/sections/EvidenceSection'
import AttachmentsSection from '@/components/apply/sections/AttachmentsSection'
import DateInfoSection from '@/components/apply/sections/DateInfoSection'
import CorrectionOrderSection from '@/components/apply/sections/CorrectionOrderSection'
import CorrectionContentSection from '@/components/apply/sections/CorrectionContentSection'
import OriginalJudgmentSection from '@/components/apply/sections/OriginalJudgmentSection'
import AppealPurposeSection from '@/components/apply/sections/AppealPurposeSection'
import AppealReasonSection from '@/components/apply/sections/AppealReasonSection'
import ChangePurposeSection from '@/components/apply/sections/ChangePurposeSection'
import AddressCorrectionContentSection from '@/components/apply/sections/AddressCorrectionContentSection'

// ── Section → Component 매핑 ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_COMPONENTS: Record<SectionType, React.ComponentType<any>> = {
  caseInfo: CaseInfoSection,
  parties: PartiesSection,
  representative: RepresentativeSection,
  claimPurpose: (p) => <RichTextSection {...p} label="청구취지" fieldKey="claimPurpose" placeholder="피고는 원고에게..." maxLength={6000} showFileAttach />,
  claimReason: (p) => <RichTextSection {...p} label="청구원인" fieldKey="claimReason" placeholder="청구원인을 입력하세요..." maxLength={2000} showFileAttach />,
  answerPurpose: (p) => <RichTextSection {...p} label="청구취지에 대한 답변" fieldKey="answerPurpose" placeholder="1. 원고의 청구를 기각한다..." maxLength={6000} showFileAttach />,
  answerReason: (p) => <RichTextSection {...p} label="청구원인에 대한 답변" fieldKey="answerReason" placeholder="원고의 주장에 대한 반박..." maxLength={2000} showFileAttach />,
  signatory: SignatorySection,
  content: (p) => <RichTextSection {...p} label="내용" fieldKey="content" placeholder="준비서면 내용을 입력하세요..." maxLength={6000} showFileAttach />,
  evidence: EvidenceSection,
  dateInfo: DateInfoSection,
  changeReason: (p) => <RichTextSection {...p} label="변경사유" fieldKey="changeReason" placeholder="변경 사유를 입력하세요..." maxLength={2000} />,
  correctionOrder: CorrectionOrderSection,
  correctionContent: CorrectionContentSection,
  appealPurpose: AppealPurposeSection,
  appealReason: AppealReasonSection,
  originalJudgment: OriginalJudgmentSection,
  changePurpose: ChangePurposeSection,
  addressCorrectionContent: AddressCorrectionContentSection,
  attachments: AttachmentsSection,
}

// ── 한글 원 숫자 ──
const CIRCLED = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩']

function DocTypePage({ params }: { params: Promise<{ docType: string }> }) {
  const { docType } = use(params)
  const config = DOCUMENT_CONFIGS[docType]
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<DocumentFormData>({ ...EMPTY_DOC_FORM })
  const [activeNav, setActiveNav] = useState('s0')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [draftToast, setDraftToast] = useState(false)

  // 초기 섹션 열기
  useEffect(() => {
    if (config) {
      const o: Record<string, boolean> = {}
      config.sections.forEach((_, i) => { o[`s${i}`] = true })
      setOpenSections(o)
    }
  }, [config])

  // caseId로 배정된 사건 로드
  useEffect(() => {
    const caseId = searchParams.get('caseId')
    const orderId = searchParams.get('orderId')
    if (orderId) {
      setFormData(prev => ({ ...prev, orderId } as DocumentFormData))
    }
    if (!caseId) return
    ;(async () => {
      const { data } = await supabase.from('practice_cases').select('*').eq('id', caseId).single()
      if (data) {
        setFormData(prev => ({
          ...prev,
          caseNo: data.case_number || '',
          court: data.court || '',
          division: data.division || '',
          caseName: data.case_name || '',
          plaintiff: data.plaintiff || '',
          defendant: data.defendant || '',
        }))
      }
    })()
  }, [searchParams])

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.push('/')
  }, [user, authLoading, router])

  if (!config) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Malgun Gothic', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h1 style={{ fontSize: 20, color: '#333', marginBottom: 8 }}>지원하지 않는 서류 유형입니다</h1>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>docType: {docType}</p>
          <button onClick={() => router.push('/submit/civil')} style={{ padding: '10px 24px', background: NAVY, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}>서류제출로 이동</button>
        </div>
      </div>
    )
  }

  if (authLoading || !user) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#666', fontSize: 14 }}>로딩 중...</span></div>
  }

  const upd = (updates: Record<string, unknown>) => setFormData(prev => ({ ...prev, ...updates } as DocumentFormData))
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  const scrollTo = (key: string) => { setActiveNav(key); document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  // 임시저장
  const saveDraft = () => {
    try {
      localStorage.setItem(`ecfs_draft_${docType}_${user.id}`, JSON.stringify(formData))
      setDraftToast(true)
      setTimeout(() => setDraftToast(false), 2000)
    } catch { alert('임시저장에 실패했습니다.') }
  }

  // 제출
  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const record = {
        student_id: user.id,
        user_name: user.name,
        doc_type: docType,
        case_type: formData.caseName || formData.caseCategory || config.title,
        court: formData.court,
        plaintiff: formData.plaintiff,
        defendant: formData.defendant,
        has_agent: formData.hasAgent,
        evidence_count: formData.evidences?.length || 0,
        score: 0,
        feedback: '채점 중...',
        complaint_data: formData,
        case_id: searchParams.get('caseId') || null,
      }
      const { data: inserted, error } = await supabase.from('practice_records').insert(record).select('id').single()
      if (error) throw new Error(error.message)
      if (!inserted?.id) throw new Error('제출 기록 생성 실패')

      // AI 채점
      try {
        const gradeRes = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formData: { ...formData, doc_type: docType, caseCategory: formData.caseName },
            sampleCase: { id: '0', title: formData.caseName, case_type: formData.caseName, court: formData.court, plaintiff: formData.plaintiff, defendant: formData.defendant, created_at: new Date().toISOString() },
            doc_type: docType,
          }),
          signal: AbortSignal.timeout(30_000),
        })
        if (gradeRes.ok) {
          const r = await gradeRes.json()
          if (r.score != null && !r.isError) {
            await supabase.from('practice_records').update({ score: r.score, feedback: r.feedback ?? '', grade_breakdown: r.breakdown ?? null, graded_at: new Date().toISOString() }).eq('id', inserted.id)
          }
        }
      } catch { /* 채점 실패해도 제출은 완료 */ }

      setShowSubmitModal(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : '제출 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 사건 variant: 소장/항소장은 'complaint' 모드, 나머지는 'existing' 모드
  const caseInfoVariant = docType === 'complaint' || docType === 'appeal' ? 'complaint' : 'existing'

  // ── 사이드바 섹션 아이템 ──
  const sideItems = config.sections.map((sec, i) => ({
    key: `s${i}`,
    label: config.sectionLabels[i],
    section: sec,
  }))

  // ── STEP 2: 최종문서확인 미리보기 ──
  const renderPreview = () => {
    const now = new Date()
    const dateStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}.`
    return (
      <div style={{ display: 'flex', gap: 16 }}>
        {/* 좌측: 서류 목록 */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, padding: '8px 12px', background: '#f0f3f8', borderRadius: 4, marginBottom: 8 }}>
            • {config.subtitle}
          </div>
        </div>
        {/* 우측: 문서 미리보기 */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid #d0d8e4', borderRadius: 4, padding: '40px 48px', fontFamily: "'Noto Sans KR', sans-serif", lineHeight: 2 }}>
          <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, letterSpacing: 12, marginBottom: 32 }}>{config.title}</div>
          <div style={{ marginBottom: 20 }}>
            {formData.caseNo && <div>사  건    {formData.caseNo}  {formData.caseName}</div>}
            {formData.plaintiff && <div>원  고    {formData.plaintiff}</div>}
            {formData.defendant && <div>피  고    {formData.defendant}</div>}
          </div>
          {docType === 'answer' && <div style={{ marginBottom: 16 }}>위 사건에 관하여 다음과 같이 답변합니다.</div>}
          {docType === 'complaint' && <div style={{ marginBottom: 16 }}>위 사건에 관하여 다음과 같이 소를 제기합니다.</div>}
          {(formData.claimPurpose || formData.answerPurpose) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
                {docType === 'answer' ? '청구취지에 대한 답변' : '청 구 취 지'}
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{formData.answerPurpose || formData.claimPurpose}</div>
            </div>
          )}
          {(formData.claimReason || formData.answerReason || formData.content) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
                {docType === 'answer' ? '청구원인에 대한 답변' : docType === 'brief' ? '내 용' : '청 구 원 인'}
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{formData.answerReason || formData.claimReason || formData.content}</div>
            </div>
          )}
          {formData.evidences?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>입 증 방 법</div>
              {formData.evidences.map((e, i) => <div key={i}>{config.defaultPrefix} 제{i + 1}호증:  {e.name}</div>)}
            </div>
          )}
          <div style={{ textAlign: 'right', marginTop: 32 }}>{dateStr}</div>
          {formData.docOwners?.length > 0 && (
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              {formData.docOwners.map((o, i) => <div key={i}>{o.type}<br />변호사 {o.name}</div>)}
            </div>
          )}
          {!formData.docOwners?.length && user && (
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              원고 소송대리인<br />변호사 {user.name}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── STEP 3: 전자서명 ──
  const renderSign = () => {
    const docs = [
      { no: 1, type: '소송문서', name: config.subtitle, file: `${config.subtitle}(${formData.caseNo || '사건번호'}).pdf`, size: '56.6 KB' },
      ...formData.evidences.map((e, i) => ({ no: i + 2, type: '증거서류', name: `${e.name} (${config.defaultPrefix} 제${i + 1}호증)`, file: `${e.name}.pdf`, size: '41.1 KB' })),
    ]
    return (
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: TEAL, marginBottom: 16 }}>전자서명</h2>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>전자서명 대상서류</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12, marginBottom: 12 }}>
          <thead><tr style={{ background: '#f0f3f8' }}>
            {['번호', '구분', '서류명', '파일명', '크기', '서명일시'].map(h => <th key={h} style={{ padding: '8px 10px', fontWeight: 700, borderBottom: '2px solid #003366', textAlign: 'center' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.no} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '7px 10px', textAlign: 'center' }}>{d.no}</td>
                <td style={{ padding: '7px 10px', textAlign: 'center' }}>{d.type}</td>
                <td style={{ padding: '7px 10px' }}>{d.name}</td>
                <td style={{ padding: '7px 10px', fontSize: 11 }}>{d.file}</td>
                <td style={{ padding: '7px 10px', textAlign: 'center' }}>{d.size}</td>
                <td style={{ padding: '7px 10px', textAlign: 'center', color: '#888' }}>서명안함</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 12, marginBottom: 8 }}>총 <strong>{docs.length}</strong>건</div>
        <div style={{ background: '#f8f9fc', border: '1px solid #dde0e8', borderRadius: 4, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#003366', marginBottom: 6 }}>참고하세요</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#555', lineHeight: 1.9 }}>
            <li>접수증명신청서는 전자서명 요청 후에는 생성할 수 없으니, 전자서명 요청 전에 생성하시기 바랍니다.</li>
            <li>전자서명이 완료된 문서는 [나의전자소송 &gt; 나의문서함 &gt; 작성중서류] 메뉴의 &apos;제출대기목록&apos;에서 확인할 수 있습니다.</li>
          </ul>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => setStep(2)} style={{ height: 32, padding: '0 16px', background: '#fff', border: '1px solid #aaa', color: '#555', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>이전으로</button>
          <button onClick={() => setShowSignModal(true)} style={{ height: 34, padding: '0 24px', background: NAVY, color: '#fff', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>전자서명</button>
        </div>
      </div>
    )
  }

  // ── STEP 4: 전자제출 ──
  const renderSubmit = () => (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: TEAL, marginBottom: 16 }}>문서제출</h2>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>사건기본정보</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12, marginBottom: 16 }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid #eee' }}><th style={{ background: '#f5f7fb', padding: '8px 12px', width: '15%', textAlign: 'left', fontWeight: 600 }}>법원</th><td style={{ padding: '8px 12px' }}>{formData.court || '-'}</td><th style={{ background: '#f5f7fb', padding: '8px 12px', width: '15%', textAlign: 'left', fontWeight: 600 }}>사건번호</th><td style={{ padding: '8px 12px' }}>{formData.caseNo || '-'}</td></tr>
          <tr style={{ borderBottom: '1px solid #eee' }}><th style={{ background: '#f5f7fb', padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>원고</th><td style={{ padding: '8px 12px' }}>{formData.plaintiff || '-'}</td><th style={{ background: '#f5f7fb', padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>피고</th><td style={{ padding: '8px 12px' }}>{formData.defendant || '-'}</td></tr>
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button onClick={() => setStep(3)} style={{ height: 32, padding: '0 16px', background: '#fff', border: '1px solid #aaa', color: '#555', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>이전으로가기</button>
        <button onClick={handleSubmit} disabled={submitting} style={{ height: 34, padding: '0 24px', background: submitting ? '#7a8a9e' : NAVY, color: '#fff', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
          {submitting ? '⏳ 제출 중...' : '문서제출'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#eef0f3', fontSize: 13 }}>
      <MockBar />
      <GnbNav active="서류제출" />

      {/* Modals */}
      {showSignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: 340, borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.3)' }}>
            <div style={{ background: NAVY, color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>설명</div>
            <div style={{ padding: '30px 20px', textAlign: 'center', fontSize: 13 }}>전자서명이 완료되었습니다.</div>
            <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
              <button onClick={() => { setShowSignModal(false); setStep(4) }} style={{ height: 32, padding: '0 32px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>확인</button>
            </div>
          </div>
        </div>
      )}
      {showSubmitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: 340, borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.3)' }}>
            <div style={{ background: NAVY, color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>설명</div>
            <div style={{ padding: '30px 20px', textAlign: 'center', fontSize: 13 }}>제출이 완료되었습니다.</div>
            <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
              <button onClick={() => { setShowSubmitModal(false); router.push('/mypage') }} style={{ height: 32, padding: '0 32px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* Page body */}
      <div style={{ flex: 1, display: 'flex', maxWidth: 1160, margin: '0 auto', width: '100%', padding: '14px 10px 60px', boxSizing: 'border-box', gap: 12, alignItems: 'flex-start' }}>

        {/* ── Left Sidebar ── */}
        <div style={{ width: 172, flexShrink: 0 }}>
          <div style={{ background: TEAL, color: '#fff', padding: '9px 14px', fontWeight: 700, fontSize: 13, borderRadius: '3px 3px 0 0' }}>서류작성</div>
          <div style={{ border: '1px solid #c8d4dc', borderTop: 'none', background: '#fff', borderRadius: '0 0 3px 3px', overflow: 'hidden' }}>
            {/* Step 1 */}
            <div style={{ background: step === 1 ? '#e6f7f8' : '#fff', borderBottom: '1px solid #c8dde0', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: step >= 1 ? TEAL : '#c8d4dc', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>1</div>
              <span style={{ fontSize: 12, fontWeight: step === 1 ? 700 : 400, color: step === 1 ? TEAL : '#555' }}>문서작성</span>
            </div>
            {step === 1 && sideItems.map(item => (
              <div key={item.key} onClick={() => scrollTo(item.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px 5px 26px', cursor: 'pointer', background: activeNav === item.key ? '#f0fafa' : '#fff', color: activeNav === item.key ? TEAL : '#555', fontSize: 11, borderBottom: '1px solid #edf0f3' }}
                onMouseEnter={e => { if (activeNav !== item.key) e.currentTarget.style.background = '#f8fafb' }}
                onMouseLeave={e => { if (activeNav !== item.key) e.currentTarget.style.background = '#fff' }}>
                <span style={{ color: activeNav === item.key ? TEAL : '#bbb', fontSize: 9 }}>▸</span>
                {item.label}
              </div>
            ))}
            {/* Steps 2-4 */}
            {[{ num: '2', label: '최종문서확인', s: 2 }, { num: '3', label: '전자서명', s: 3 }, { num: '4', label: '전자제출', s: 4 }].map(({ num, label, s }) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderBottom: '1px solid #e8ecf0', background: step === s ? '#e6f7f8' : '#fff' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: step >= s ? TEAL : '#c8d4dc', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{num}</div>
                <span style={{ fontSize: 12, color: step === s ? TEAL : '#999', fontWeight: step === s ? 700 : 400 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main Content ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: TEAL, fontSize: 15 }}>●</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>민사서류 - {config.subtitle}</span>
            </div>
            {step === 1 && (
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={() => { const o: Record<string, boolean> = {}; config.sections.forEach((_, i) => { o[`s${i}`] = true }); setOpenSections(o) }} style={{ height: 26, padding: '0 10px', border: '1px solid #b8c4cc', borderRadius: 2, background: '#fff', color: '#555', fontSize: 11, cursor: 'pointer' }}>전체열기 ▼</button>
                <button onClick={() => { const o: Record<string, boolean> = {}; config.sections.forEach((_, i) => { o[`s${i}`] = false }); setOpenSections(o) }} style={{ height: 26, padding: '0 10px', border: '1px solid #b8c4cc', borderRadius: 2, background: '#fff', color: '#555', fontSize: 11, cursor: 'pointer' }}>전체닫기 ▲</button>
              </div>
            )}
          </div>

          {step === 1 && (
            <>
              <div style={{ textAlign: 'right', fontSize: 11, color: '#e53e3e', marginBottom: 6 }}>* 필수입력사항</div>

              {/* Config-driven sections */}
              {config.sections.map((sectionType, idx) => {
                const SectionComp = SECTION_COMPONENTS[sectionType]
                if (!SectionComp) return null
                const sKey = `s${idx}`
                const label = `${CIRCLED[idx] || `(${idx + 1})`} ${config.sectionLabels[idx]}`

                return (
                  <div key={sKey} id={`sec-${sKey}`} style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
                    <div onClick={() => toggleSection(sKey)} style={{ background: '#f2f5f8', borderBottom: openSections[sKey] ? '1px solid #d0d8e4' : 'none', padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ color: TEAL, fontSize: 13 }}>○</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{label}</span>
                      </div>
                      <div style={{ width: 18, height: 18, border: '1px solid #b0b8c8', borderRadius: 2, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#666' }}>
                        {openSections[sKey] ? '▲' : '▼'}
                      </div>
                    </div>
                    {openSections[sKey] && (
                      <div style={{ padding: '12px 14px 14px' }}>
                        <SectionComp
                          data={formData as unknown as Record<string, unknown>}
                          onChange={upd}
                          variant={sectionType === 'caseInfo' ? caseInfoVariant : undefined}
                          prefix={config.defaultPrefix}
                          user={{ id: user.id, name: user.name }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Bottom buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ height: 32, padding: '0 16px', background: '#fff', border: '1px solid #999', color: '#555', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>파일첨부방식작성</button>
                  <button onClick={saveDraft} style={{ height: 32, padding: '0 16px', background: '#fff', border: `1px solid ${TEAL}`, color: TEAL, borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>임시저장</button>
                </div>
                <button onClick={() => setStep(2)} style={{ height: 34, padding: '0 24px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>작성완료 →</button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {renderPreview()}
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ accentColor: TEAL }} />
                  모든 문서의 내용에 이상이 없음을 확인합니다.
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                <button onClick={() => setStep(1)} style={{ height: 32, padding: '0 16px', background: '#fff', border: '1px solid #aaa', color: '#555', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>이전으로가기</button>
                <button onClick={() => setStep(3)} disabled={!confirmed} style={{ height: 34, padding: '0 24px', background: confirmed ? NAVY : '#ccc', color: '#fff', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 700, cursor: confirmed ? 'pointer' : 'not-allowed' }}>확인완료</button>
              </div>
            </>
          )}

          {step === 3 && renderSign()}
          {step === 4 && renderSubmit()}
        </div>
      </div>

      {draftToast && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, background: '#1a3a6b', color: '#fff', padding: '10px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: '0 2px 12px rgba(0,0,0,.3)' }}>
          ✓ 임시저장되었습니다
        </div>
      )}
      <Footer />
    </div>
  )
}

export default function DocTypePageWrapper({ params }: { params: Promise<{ docType: string }> }) {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>로딩 중...</div>}>
      <DocTypePage params={params} />
    </Suspense>
  )
}
