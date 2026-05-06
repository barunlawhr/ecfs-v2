'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MockBar from '@/components/layout/MockBar';
import GnbNav from '@/components/layout/GnbNav';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

import { TEAL, TEAL_DARK, NAVY, INP as _INP, SEL as _SEL, TH as _TH, TD as _TD, COURTS } from '@/lib/constants';

// ── Styles (constants 기반 오버라이드) ────────────────────────
const INP: React.CSSProperties = { ..._INP, padding: '0 7px', boxSizing: 'border-box' };
const SEL: React.CSSProperties = { ...INP, cursor: 'pointer' };
const TH: React.CSSProperties = { ..._TH, width: 120, padding: '9px 12px', fontWeight: 600, color: '#333', verticalAlign: 'middle', borderRight: '1px solid #e8edf4' };
const TD: React.CSSProperties = { ..._TD, padding: '7px 12px' };

void TEAL_DARK; // suppress unused warning
void _INP; void _SEL; void _TH; void _TD; // base styles used via overrides

// COURTS → @/lib/constants에서 import
// COURTS → @/lib/constants에서 import됨

// ── Helper components ─────────────────────────────────────────
function SecHd({ label, open, toggle }: { label: string; open: boolean; toggle: () => void }) {
  return (
    <div onClick={toggle} style={{ background: '#f2f5f8', borderBottom: open ? '1px solid #d0d8e4' : 'none', padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ color: TEAL, fontSize: 13 }}>○</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{label}</span>
      </div>
      <div style={{ width: 18, height: 18, border: '1px solid #b0b8c8', borderRadius: 2, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#666' }}>
        {open ? '▲' : '▼'}
      </div>
    </div>
  );
}

function RegModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: 340, borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.3)' }}>
        <div style={{ background: NAVY, color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>설명</div>
        <div style={{ padding: '30px 20px', textAlign: 'center', fontSize: 13, color: '#333' }}>등록되었습니다.</div>
        <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
          <button onClick={onClose} style={{ height: 32, padding: '0 32px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>확인</button>
        </div>
      </div>
    </div>
  );
}

// ── Interfaces ─────────────────────────────────────────────────
interface DocOwner {
  id: string;
  type: string;
  name: string;
  userId: string;
}

interface EvidenceRow {
  id: string;
  checked: boolean;
  서증부호: string;
  가지부호: string;
  서증번호: number;
  가지번호: string;
  서류명: string;
  파일명: string;
  페이지번호1: string;
  페이지번호2: string;
}

interface AttachRow {
  id: string;
  번호: number;
  서류명: string;
  파일명: string;
  파일크기: number;
  등록일: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  checked: boolean;
}

// ── Main Page ──────────────────────────────────────────────────
export default function AnswerPageWrapper() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>로딩 중...</div>}>
      <AnswerPage />
    </Suspense>
  );
}

function AnswerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Step management
  const [step, setStep] = useState(1);

  // Section accordion (step 1)
  const [open, setOpen] = useState({ s1: true, s2: true, s3: true, s4: true, s5: true, s6: true });
  const toggle = useCallback((k: keyof typeof open) => setOpen(p => ({ ...p, [k]: !p[k] })), []);

  // Sidebar nav
  const [activeNav, setActiveNav] = useState('s1');

  // Form data
  const [caseNo, setCaseNo] = useState('');
  const [court, setCourt] = useState('');
  const [division, setDivision] = useState('');
  const [caseName, setCaseName] = useState('');
  const [plaintiff, setPlaintiff] = useState('');
  const [defendant, setDefendant] = useState('');
  const [answerPurpose, setAnswerPurpose] = useState('');
  const [answerCause, setAnswerCause] = useState('');
  const [causeTab, setCauseTab] = useState<'direct' | 'file'>('direct');

  // 서류명의인
  const [docOwners, setDocOwners] = useState<DocOwner[]>([]);

  // 입증서류
  const evFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [evidenceRows, setEvidenceRows] = useState<EvidenceRow[]>([]);
  const [evAllChecked, setEvAllChecked] = useState(false);
  const [uploadAllChecked, setUploadAllChecked] = useState(false);
  const [evForm, setEvForm] = useState({ name: '', purpose: '', role: '피고' as '원고' | '피고' });
  const [가지번호분리, set가지번호분리] = useState(true);
  const [분리방법, set분리방법] = useState('서류개수');
  const [분리개수, set분리개수] = useState('');

  // 첨부서류
  const attachFileInputRef = useRef<HTMLInputElement>(null);
  const [attachDocType, setAttachDocType] = useState('직접입력');
  const [attachDocName, setAttachDocName] = useState('');
  const [attachSameAsFile, setAttachSameAsFile] = useState(false);
  const [attachUploadedFiles, setAttachUploadedFiles] = useState<UploadedFile[]>([]);
  const [attachRows, setAttachRows] = useState<AttachRow[]>([]);
  const [attachAllChecked, setAttachAllChecked] = useState(false);

  // Modals
  const [showRegModal, setShowRegModal] = useState(false);

  // Step 2
  const [confirmed, setConfirmed] = useState(false);

  // Step 3
  const [showSignModal, setShowSignModal] = useState(false);

  // Step 4
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Cause file
  const [causeFileName, setCauseFileName] = useState<string | null>(null);
  const causeFileRef = useRef<HTMLInputElement>(null);
  const causeEditorRef = useRef<HTMLDivElement>(null);

  // Purpose file
  const [purposeFileName, setPurposeFileName] = useState<string | null>(null);
  const purposeFileRef = useRef<HTMLInputElement>(null);

  // caseId로 배정된 사건 정보 자동 로드
  const [caseLoaded, setCaseLoaded] = useState(false);
  useEffect(() => {
    const caseId = searchParams.get('caseId');
    if (!caseId || caseLoaded) return;
    (async () => {
      const { data } = await supabase.from('practice_cases').select('*').eq('id', caseId).single();
      if (data) {
        setCaseNo(data.case_number || '');
        setCourt(data.court || '');
        setDivision(data.division || '');
        setCaseName(data.case_name || '');
        setPlaintiff(data.plaintiff || '');
        setDefendant(data.defendant || '');
        setCaseLoaded(true);
      }
    })();
  }, [searchParams, caseLoaded]);

  // Initialize doc owners with user
  useState(() => {
    if (user) {
      setDocOwners([{ id: crypto.randomUUID(), type: '원고 소송대리인', name: `변호사 ${user.name}`, userId: user.id }]);
    }
  });

  // ── 문서제출 (Supabase 저장) ──
  async function handleFinalSubmit() {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      const record = {
        student_id: user.id,
        user_name: user.name,
        doc_type: 'answer',
        case_type: caseName || '답변서(청구취지/원인)',
        court: court,
        plaintiff: plaintiff,
        defendant: defendant,
        has_agent: false,
        evidence_count: evidenceRows.length,
        score: 0,
        feedback: '채점 중...',
        complaint_data: {
          doc_type: 'answer',
          caseNo,
          court,
          division,
          caseName,
          plaintiff,
          defendant,
          claimPurpose: answerPurpose,
          claimCause: answerCause,
          evidences: evidenceRows.map(r => ({ number: `${r.서증부호} 제${r.서증번호}호증`, name: r.서류명 })),
          attachments: attachRows.map(r => ({ name: r.서류명, file: r.파일명 })),
          docOwners,
        },
        case_id: null,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('practice_records')
        .insert(record)
        .select('id')
        .single();

      if (insertError) throw new Error(insertError.message);
      if (!inserted?.id) throw new Error('제출 기록 생성에 실패했습니다.');

      // 채점 시도
      try {
        const gradeRes = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formData: {
              doc_type: 'answer',
              caseCategory: caseName,
              caseName,
              court,
              claimPurpose: answerPurpose,
              claimCause: answerCause,
              parties: [
                { id: '1', role: '원고', name: plaintiff, addr: '' },
                { id: '2', role: '피고', name: defendant, addr: '' },
              ],
              evidences: evidenceRows.map(r => ({ id: r.id, number: `을 제${r.서증번호}호증`, name: r.서류명, purpose: '' })),
              hasAgent: false,
              claimType: '',
              sogaType: '',
              soga: '',
              caseNumber: '',
            },
            sampleCase: { id: '0', title: caseName, case_type: caseName, court, plaintiff, defendant, created_at: new Date().toISOString() },
            doc_type: 'answer',
          }),
          signal: AbortSignal.timeout(30_000),
        });
        if (gradeRes.ok) {
          const gradeResult = await gradeRes.json();
          if (gradeResult.score != null && !gradeResult.isError) {
            await supabase
              .from('practice_records')
              .update({ score: gradeResult.score, feedback: gradeResult.feedback ?? '', grade_breakdown: gradeResult.breakdown ?? null, graded_at: new Date().toISOString() })
              .eq('id', inserted.id);
          }
        }
      } catch { /* 채점 실패해도 제출은 완료 */ }

      setShowSubmitModal(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Helpers ──
  function scrollTo(key: string) {
    setActiveNav(key);
    document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleEvFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).map(f => ({ id: crypto.randomUUID(), name: f.name, size: f.size, checked: false }));
    setUploadedFiles(p => [...p, ...arr]);
  }

  function addToEvidenceList() {
    if (uploadedFiles.length === 0) { alert('첨부된 파일이 없습니다.'); return; }
    const base = evidenceRows.length;
    const newRows = uploadedFiles.map((f, i) => ({
      id: crypto.randomUUID(), checked: false,
      서증부호: '을', 가지부호: '없-',
      서증번호: base + i + 1, 가지번호: '',
      서류명: f.name.replace(/\.[^.]+$/, ''), 파일명: f.name,
      페이지번호1: '', 페이지번호2: '',
    }));
    setEvidenceRows(p => [...p, ...newRows]);
    setUploadedFiles([]);
  }

  function addEvidence() {
    if (!evForm.name.trim()) { alert('서류명을 입력해주세요.'); return; }
    const prefix = evForm.role === '피고' ? '을' : '갑';
    const num = evidenceRows.filter(e => e.서증부호 === prefix).length + 1;
    setEvidenceRows(p => [...p, {
      id: crypto.randomUUID(), checked: false,
      서증부호: prefix, 가지부호: '없-',
      서증번호: num, 가지번호: '',
      서류명: evForm.name.trim(), 파일명: '',
      페이지번호1: '', 페이지번호2: '',
    }]);
    setEvForm({ name: '', purpose: '', role: '피고' });
  }

  function doEvSplit() {
    if (!가지번호분리) return;
    setEvidenceRows(rows => {
      const updated = [...rows];
      if (분리방법 === '서류개수') {
        const checkedIdx = updated.map((r, i) => r.checked ? i : -1).filter(i => i >= 0);
        if (checkedIdx.length === 0) {
          const baseNum = updated[0]?.서증번호 ?? 1;
          return updated.map((r, i) => ({ ...r, 서증번호: baseNum, 가지번호: String(i + 1) }));
        }
        const firstNum = updated[checkedIdx[0]].서증번호;
        checkedIdx.forEach((idx, i) => { updated[idx] = { ...updated[idx], 서증번호: firstNum, 가지번호: String(i + 1) }; });
      }
      return updated;
    });
  }

  // ── Loading / Auth ──
  if (loading || !user) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 14, color: '#666' }}>로딩 중...</span></div>;
  }

  // Ensure docOwners populated
  if (docOwners.length === 0) {
    setDocOwners([{ id: crypto.randomUUID(), type: '원고 소송대리인', name: `변호사 ${user.name}`, userId: user.id }]);
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}.`;

  const sideItems = [
    { key: 's1', label: '사건기본정보' },
    { key: 's2', label: '청구취지에 대한 답변' },
    { key: 's3', label: '청구원인에 대한 답변' },
    { key: 's4', label: '서류명의인' },
    { key: 's5', label: '입증방법' },
    { key: 's6', label: '첨부서류' },
  ];

  const allSignRows = [
    { 구분: '소송문서', 서류명: '답변서(청구취지/원인)', 파일명: `답변서(청구취지/원인)(${caseNo || '-'}).pdf`, 크기: '56.6 KB' },
    ...evidenceRows.map((r, i) => ({ 구분: '증거서류', 서류명: `${r.서류명} (을 제${i + 1}호증)`, 파일명: r.파일명 || `${r.서류명}.pdf`, 크기: '41.1 KB' })),
    ...attachRows.map(r => ({ 구분: '첨부서류', 서류명: r.서류명, 파일명: r.파일명 || `${r.서류명}.pdf`, 크기: '41.1 KB' })),
  ];

  // ── Render ──
  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#eef0f3', fontSize: 13 }}>
      <MockBar />
      <GnbNav active="서류제출" />

      {/* Modals */}
      {showRegModal && <RegModal onClose={() => setShowRegModal(false)} />}
      {showSignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: 340, borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.3)' }}>
            <div style={{ background: NAVY, color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>설명</div>
            <div style={{ padding: '30px 20px', textAlign: 'center', fontSize: 13, color: '#333' }}>전자서명이 완료되었습니다.</div>
            <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
              <button onClick={() => { setShowSignModal(false); setStep(4); }} style={{ height: 32, padding: '0 32px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>확인</button>
            </div>
          </div>
        </div>
      )}
      {showSubmitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: 340, borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.3)' }}>
            <div style={{ background: NAVY, color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>설명</div>
            <div style={{ padding: '30px 20px', textAlign: 'center', fontSize: 13, color: '#333' }}>제출이 완료되었습니다.</div>
            <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
              <button onClick={() => { setShowSubmitModal(false); router.push('/mypage'); }} style={{ height: 32, padding: '0 32px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>확인</button>
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
            {/* 1.문서작성 */}
            <div style={{ background: step === 1 ? '#e6f7f8' : '#fff', borderBottom: '1px solid #c8dde0', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }} onClick={() => setStep(1)}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: step === 1 ? TEAL : '#c8d4dc', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>1</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: step === 1 ? TEAL : '#999' }}>문서작성</span>
            </div>
            {/* Sub-items (only when step=1) */}
            {step === 1 && sideItems.map(item => (
              <div key={item.key} onClick={() => scrollTo(item.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px 5px 26px', cursor: 'pointer', background: activeNav === item.key ? '#f0fafa' : '#fff', color: activeNav === item.key ? TEAL : '#555', fontSize: 11, borderBottom: '1px solid #edf0f3' }}
                onMouseEnter={e => { if (activeNav !== item.key) e.currentTarget.style.background = '#f8fafb'; }}
                onMouseLeave={e => { if (activeNav !== item.key) e.currentTarget.style.background = '#fff'; }}>
                <span style={{ color: activeNav === item.key ? TEAL : '#bbb', fontSize: 9 }}>▸</span>
                {item.label}
              </div>
            ))}
            {/* 2~4 단계 */}
            {[{ num: '2', label: '최종문서확인', s: 2 }, { num: '3', label: '전자서명', s: 3 }, { num: '4', label: '전자제출', s: 4 }].map(({ num, label, s }) => (
              <div key={num} onClick={() => setStep(s)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderBottom: '1px solid #e8ecf0', background: step === s ? '#e6f7f8' : '#fff', cursor: 'pointer' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: step === s ? TEAL : '#c8d4dc', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{num}</div>
                <span style={{ fontSize: 12, color: step === s ? TEAL : '#999', fontWeight: step === s ? 700 : 400 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main Content ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* STEP 1: 서류작성 */}
          {/* ════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <>
              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: TEAL, fontSize: 15 }}>●</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>민사서류 - 답변서(청구취지/원인)</span>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => setOpen({ s1: true, s2: true, s3: true, s4: true, s5: true, s6: true })} style={{ height: 26, padding: '0 10px', border: '1px solid #b8c4cc', borderRadius: 2, background: '#fff', color: '#555', fontSize: 11, cursor: 'pointer' }}>전체열기 ▼</button>
                  <button onClick={() => setOpen({ s1: false, s2: false, s3: false, s4: false, s5: false, s6: false })} style={{ height: 26, padding: '0 10px', border: '1px solid #b8c4cc', borderRadius: 2, background: '#fff', color: '#555', fontSize: 11, cursor: 'pointer' }}>전체닫기 ▲</button>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: '#e53e3e', marginBottom: 6 }}>* 필수입력사항</div>

              {/* ① 사건기본정보 */}
              <div id="sec-s1" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
                <SecHd label="① 사건기본정보" open={open.s1} toggle={() => toggle('s1')} />
                {open.s1 && (
                  <div style={{ padding: '12px 14px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                          <td style={{ ...TH, width: 100 }}>법원</td>
                          <td style={TD}>
                            {caseLoaded
                              ? <span style={{ fontSize: 13 }}>{court}</span>
                              : <select value={court} onChange={e => setCourt(e.target.value)} style={{ ...SEL, width: 220 }}><option value="">선택</option>{COURTS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                            }
                          </td>
                          <td style={{ ...TH, width: 100 }}>사건번호</td>
                          <td style={TD}>
                            {caseLoaded
                              ? <span style={{ fontSize: 13 }}>{caseNo}</span>
                              : <input value={caseNo} onChange={e => setCaseNo(e.target.value)} style={{ ...INP, width: 200 }} placeholder="예: 2026가소226035" />
                            }
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                          <td style={{ ...TH, width: 100 }}>재판부</td>
                          <td style={TD}>
                            {caseLoaded
                              ? <span style={{ fontSize: 13 }}>{division || '-'}</span>
                              : <input value={division} onChange={e => setDivision(e.target.value)} style={{ ...INP, width: 200 }} placeholder="예: 민사10단독(소액)" />
                            }
                          </td>
                          <td style={{ ...TH, width: 100 }}>사건명</td>
                          <td style={TD}>
                            {caseLoaded
                              ? <span style={{ fontSize: 13 }}>{caseName}</span>
                              : <input value={caseName} onChange={e => setCaseName(e.target.value)} style={{ ...INP, width: 200 }} placeholder="예: 손해배상(기)" />
                            }
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                          <td style={{ ...TH, width: 100 }}>원고</td>
                          <td style={TD}>
                            {caseLoaded
                              ? <span style={{ fontSize: 13 }}>{plaintiff}</span>
                              : <input value={plaintiff} onChange={e => setPlaintiff(e.target.value)} style={{ ...INP, width: 200 }} />
                            }
                          </td>
                          <td style={{ ...TH, width: 100 }}>피고</td>
                          <td style={TD}>
                            {caseLoaded
                              ? <span style={{ fontSize: 13 }}>{defendant}</span>
                              : <input value={defendant} onChange={e => setDefendant(e.target.value)} style={{ ...INP, width: 200 }} />
                            }
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {!caseLoaded && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <button onClick={() => setShowRegModal(true)} style={{ height: 32, padding: '0 20px', border: 'none', borderRadius: 2, background: NAVY, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          ✎ 등록
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ② 청구취지에 대한 답변 */}
              <div id="sec-s2" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
                <SecHd label="② 청구취지에 대한 답변" open={open.s2} toggle={() => toggle('s2')} />
                {open.s2 && (
                  <div style={{ padding: '12px 14px 14px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                      <tbody>
                        <tr>
                          <th style={{ ...TH, verticalAlign: 'top', paddingTop: 11, width: 120 }}>청구취지에 대한 답변 <span style={{ color: '#e53e3e' }}>*</span> <span style={{ fontSize: 10, color: '#888' }}>ⓘ</span></th>
                          <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                            {/* 직접입력 radio */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', marginBottom: 8 }}>
                              <input type="radio" name="purposeType" defaultChecked style={{ accentColor: TEAL }} /> 직접입력
                            </label>
                            {/* Top controls */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <button style={{ height: 26, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333' }}>작성예시참고</button>
                              <span style={{ fontSize: 11, color: '#888' }}>( {new TextEncoder().encode(answerPurpose).length} / 6000 Bytes )</span>
                            </div>
                            <textarea
                              value={answerPurpose}
                              onChange={e => setAnswerPurpose(e.target.value)}
                              rows={6}
                              style={{ width: '100%', padding: '8px', border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 12, lineHeight: 1.8, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                              placeholder="청구취지에 대한 답변을 입력하세요."
                            />
                            {/* 답변취지별지 첨부 */}
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button onClick={() => purposeFileRef.current?.click()} style={{ height: 26, padding: '0 12px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>
                                📎 답변취지별지 첨부하기
                              </button>
                              {purposeFileName && <span style={{ fontSize: 11, color: TEAL }}>{purposeFileName}</span>}
                              <input ref={purposeFileRef} type="file" style={{ display: 'none' }} accept=".hwp,.hwpx,.doc,.docx,.pdf,.txt" onChange={e => setPurposeFileName(e.target.files?.[0]?.name ?? null)} />
                            </div>
                            <div style={{ marginTop: 5, fontSize: 11, color: TEAL, lineHeight: 1.7 }}>
                              ※ 첨부가능한 파일 형식 : HWP, HWPX, DOC, DOCX, PDF, TXT (PDF파일로 자동변환, 20MB까지 첨부가능)
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <button onClick={() => setShowRegModal(true)} style={{ height: 32, padding: '0 20px', border: 'none', borderRadius: 2, background: NAVY, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        ✎ 등록
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ③ 청구원인에 대한 답변 */}
              <div id="sec-s3" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
                <SecHd label="③ 청구원인에 대한 답변" open={open.s3} toggle={() => toggle('s3')} />
                {open.s3 && (
                  <div style={{ padding: '12px 14px 14px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                      <tbody>
                        <tr>
                          <th style={{ ...TH, verticalAlign: 'top', paddingTop: 11, width: 120 }}>청구원인에 대한 답변 <span style={{ color: '#e53e3e' }}>*</span> <span style={{ fontSize: 10, color: '#888' }}>ⓘ</span></th>
                          <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                            {/* 탭 */}
                            <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
                              {(['direct', 'file'] as const).map(tab => (
                                <button key={tab} onClick={() => setCauseTab(tab)} style={{ height: 28, padding: '0 14px', border: `1px solid ${causeTab === tab ? TEAL : '#c8cdd6'}`, borderRadius: '2px 2px 0 0', background: causeTab === tab ? TEAL : '#f5f7fb', color: causeTab === tab ? '#fff' : '#555', fontWeight: causeTab === tab ? 700 : 400, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {tab === 'direct' ? '직접입력' : '내용파일첨부'}
                                </button>
                              ))}
                            </div>
                            {/* 에디터 박스 */}
                            <div style={{ border: '1px solid #c8cdd6', borderRadius: '0 2px 2px 2px' }}>
                              {/* 툴바 행 1 */}
                              <div style={{ background: '#f0f3f8', borderBottom: '1px solid #dde0e6', padding: '3px 6px', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                {['\u{1F5CB}', '\u{1F4BE}', '\u2715', '\u29C9', '\u{1F4CB}', '\u{1F5D1}'].map((ic, i) => (
                                  <button key={i} style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>{ic}</button>
                                ))}
                                <span style={{ width: 1, height: 14, background: '#c8cdd6', margin: '0 2px' }} />
                                <button onMouseDown={e => { e.preventDefault(); document.execCommand('undo'); }} style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>↩</button>
                                <button onMouseDown={e => { e.preventDefault(); document.execCommand('redo'); }} style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>↪</button>
                                <span style={{ width: 1, height: 14, background: '#c8cdd6', margin: '0 2px' }} />
                                <button style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>¶</button>
                                <button onMouseDown={e => { e.preventDefault(); document.execCommand('bold'); }} style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'serif' }}>B</button>
                                <button onMouseDown={e => { e.preventDefault(); document.execCommand('italic'); }} style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'serif', fontStyle: 'italic' }}>I</button>
                                <button onMouseDown={e => { e.preventDefault(); document.execCommand('underline'); }} style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>U</button>
                                <span style={{ width: 1, height: 14, background: '#c8cdd6', margin: '0 2px' }} />
                                <button style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>―</button>
                                <button style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>❝</button>
                                <span style={{ width: 1, height: 14, background: '#c8cdd6', margin: '0 2px' }} />
                                <button onMouseDown={e => { e.preventDefault(); document.execCommand('justifyLeft'); }} style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>≡</button>
                                <button onMouseDown={e => { e.preventDefault(); document.execCommand('justifyCenter'); }} style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>☰</button>
                                <button onMouseDown={e => { e.preventDefault(); document.execCommand('justifyRight'); }} style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>≣</button>
                                <span style={{ width: 1, height: 14, background: '#c8cdd6', margin: '0 2px' }} />
                                <button style={{ height: 22, padding: '0 4px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer', color: '#e53e3e' }}>A</button>
                                <button style={{ height: 22, padding: '0 4px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>A-</button>
                              </div>
                              {/* 툴바 행 2 */}
                              <div style={{ background: '#f5f7fb', borderBottom: '1px solid #dde0e6', padding: '2px 6px', display: 'flex', gap: 4, alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: '#555' }}>글꼴</span>
                                <select style={{ ...SEL, width: 80, height: 22, fontSize: 11 }}><option>글꼴</option><option>맑은 고딕</option><option>굴림</option><option>돋움</option></select>
                                <span style={{ fontSize: 11, color: '#555' }}>-</span>
                                <span style={{ fontSize: 11, color: '#555' }}>크기</span>
                                <select style={{ ...SEL, width: 60, height: 22, fontSize: 11 }}><option>크기</option><option>10</option><option>11</option><option>12</option><option>14</option><option>16</option></select>
                                <span style={{ fontSize: 11, color: '#555' }}>-</span>
                              </div>
                              {/* 안내 */}
                              <div style={{ background: '#e8f4fd', borderBottom: '1px solid #c8dff0', padding: '4px 10px', fontSize: 11, color: '#1a6fa8', display: 'flex', alignItems: 'center', gap: 5 }}>
                                ℹ 편집기에 대한 도움말은 ALT + 숫자 이(면 자판 위 숫자키)를 누르세요
                              </div>
                              {causeTab === 'direct' ? (
                                <>
                                  <div
                                    ref={causeEditorRef}
                                    contentEditable
                                    suppressContentEditableWarning
                                    onInput={() => { if (causeEditorRef.current) setAnswerCause(causeEditorRef.current.innerText); }}
                                    style={{ minHeight: 160, padding: '9px 12px', fontSize: 12, fontFamily: "'맑은 고딕',sans-serif", lineHeight: 1.8, outline: 'none', background: '#fff', color: '#222' }}
                                    data-placeholder="청구원인에 대한 답변을 입력하세요. (한글 2000자 이내, 표나 그림은 내용파일첨부를 이용)"
                                  />
                                  <div style={{ background: '#f7f8fb', borderTop: '1px solid #e5e8ee', padding: '3px 10px', textAlign: 'right', fontSize: 11, color: '#888' }}>글자: {answerCause.length}/2000</div>
                                </>
                              ) : (
                                <div style={{ padding: '20px 16px' }}>
                                  <div style={{ fontSize: 12, color: '#333', marginBottom: 12, lineHeight: 1.7 }}>
                                    청구원인에 대한 답변을 파일로 첨부합니다. HWP, HWPX, DOC, DOCX, PDF, TXT 등의 파일을 첨부할 수 있습니다.
                                  </div>
                                  <div style={{ border: '2px dashed #c8d8e8', borderRadius: 6, padding: '28px 20px', textAlign: 'center', background: '#fafbfe', marginBottom: 12 }}>
                                    <div style={{ fontSize: 32, marginBottom: 8, opacity: .5 }}>📄</div>
                                    <button onClick={() => causeFileRef.current?.click()} style={{ height: 34, padding: '0 24px', background: TEAL, color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                      📎 내용파일 첨부하기
                                    </button>
                                    <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>또는 이 영역에 파일을 드래그하세요</div>
                                    {causeFileName && (
                                      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 12, color: TEAL, fontWeight: 600 }}>✓ {causeFileName}</span>
                                        <button onClick={() => setCauseFileName(null)} style={{ background: 'none', border: 'none', color: '#c00', fontSize: 14, cursor: 'pointer' }}>✕</button>
                                      </div>
                                    )}
                                    <input ref={causeFileRef} type="file" style={{ display: 'none' }} accept=".hwp,.hwpx,.doc,.docx,.pdf,.txt,.bmp,.jpg,.jpeg,.gif,.tif,.tiff,.png" onChange={e => { setCauseFileName(e.target.files?.[0]?.name ?? null); if (e.target.files?.[0]) setAnswerCause(`[내용파일첨부] ${e.target.files[0].name}`); }} />
                                  </div>
                                  <div style={{ fontSize: 11, color: TEAL, lineHeight: 1.7 }}>
                                    ※ 첨부가능한 파일 형식 : HWP, HWPX, DOC, DOCX, PDF, TXT, BMP, JPG, JPEG, GIF, TIF, TIFF, PNG<br />
                                    ※ PDF파일로 자동변환되며, 20MB까지 첨부 가능합니다.
                                  </div>
                                </div>
                              )}
                            </div>
                            <style>{`[data-placeholder]:empty::before{content:attr(data-placeholder);color:#bbb;pointer-events:none}`}</style>
                            {/* 내용파일 첨부 */}
                            <div style={{ marginTop: 8 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', marginBottom: 5 }}>
                                <input type="radio" name="causeAttach" style={{ accentColor: TEAL }} /> 내용파일 첨부
                              </label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button onClick={() => causeFileRef.current?.click()} style={{ height: 26, padding: '0 12px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  📎 내용파일첨부하기
                                </button>
                                {causeFileName && <span style={{ fontSize: 11, color: TEAL }}>{causeFileName}</span>}
                                <input ref={causeFileRef} type="file" style={{ display: 'none' }} accept=".hwp,.hwpx,.doc,.docx,.pdf,.txt,.bmp,.jpg,.jpeg,.gif,.tif,.tiff,.png" onChange={e => setCauseFileName(e.target.files?.[0]?.name ?? null)} />
                              </div>
                            </div>
                            <div style={{ marginTop: 5, fontSize: 11, color: TEAL, lineHeight: 1.7 }}>
                              ※ 첨부가능한 파일 형식 : HWP, HWPX, DOC, DOCX, PDF, TXT, BMP, JPG, JPEG, GIF, TIF, TIFF, PNG (PDF파일로 자동변환, 20MB까지 첨부가능)
                            </div>
                            <div style={{ marginTop: 3, fontSize: 11, color: '#555', lineHeight: 1.7 }}>
                              ※ 청구원인에 대한 답변은 청구취지를 별첨하는 주장사실만 기재하여 작성하시고, 청구원인 이외의 다른 기재내용은 첨부되지 않도록 하여 주시기 바랍니다.
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <button onClick={() => setShowRegModal(true)} style={{ height: 32, padding: '0 20px', border: 'none', borderRadius: 2, background: NAVY, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        ✎ 등록
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ④ 서류명의인 */}
              <div id="sec-s4" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
                <SecHd label="④ 서류명의인" open={open.s4} toggle={() => toggle('s4')} />
                {open.s4 && (
                  <div style={{ padding: '12px 14px 14px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                      <thead>
                        <tr style={{ background: '#f5f7fb' }}>
                          {['구분', '이름(사용자아이디)', '삭제'].map(h => (
                            <th key={h} style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {docOwners.map(o => (
                          <tr key={o.id} style={{ borderBottom: '1px solid #eaecf4' }}>
                            <td style={{ padding: '6px 10px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #eaecf4' }}>{o.type}</td>
                            <td style={{ padding: '6px 10px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #eaecf4' }}>{o.name} ({o.userId})</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              <button onClick={() => setDocOwners(p => p.filter(x => x.id !== o.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#888' }}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ fontSize: 12, marginTop: 6 }}>총 <strong>{docOwners.length}</strong>명</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <button onClick={() => setShowRegModal(true)} style={{ height: 32, padding: '0 20px', border: 'none', borderRadius: 2, background: NAVY, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        ✎ 등록
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ⑤ 입증방법 */}
              <div id="sec-s5" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
                <SecHd label="⑤ 입증방법" open={open.s5} toggle={() => toggle('s5')} />
                {open.s5 && (
                  <div style={{ padding: '12px 14px 16px' }}>
                    {/* 안내문 */}
                    <div style={{ fontSize: 11, color: '#333', lineHeight: 2, marginBottom: 10 }}>
                      <div>• 입증서류(증거)는 단순한 첨부서류와 구분하여 제출하여야 하며, 첨부서류는 별도의 파일로 다음 단계에서 제출하시기 바랍니다.</div>
                      <div>• 1개의 파일에 여러 개의 입증서류가 있는 경우에는 아래 입증서류목록 &gt; [입증서류분리] 버튼을 클릭한 후 서증명별로 서증부호를 부여하여 입증서류를 제출하시기 바랍니다.</div>
                    </div>

                    {/* 파일첨부 영역 */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', marginBottom: 0 }}>
                      <tbody>
                        <tr>
                          <th style={{ ...TH, width: 100, verticalAlign: 'top', paddingTop: 10 }}>
                            파일첨부 <span style={{ color: '#e53e3e' }}>*</span> <span style={{ fontSize: 10, color: '#888' }}>ⓘ</span>
                          </th>
                          <td style={{ padding: '8px 10px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5, marginBottom: 5 }}>
                              <button onClick={() => evFileInputRef.current?.click()} style={{ height: 26, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>📋 파일찾기</button>
                              <button onClick={() => setUploadedFiles(p => p.filter(f => !f.checked))} style={{ height: 26, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>🗑 삭제</button>
                              <input ref={evFileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleEvFiles(e.target.files)} />
                            </div>
                            {/* 파일 목록 테이블 */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', marginBottom: 0 }}>
                              <thead>
                                <tr style={{ background: '#f5f7fb' }}>
                                  <th style={{ width: 28, padding: '5px', borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center' }}>
                                    <input type="checkbox" checked={uploadAllChecked} onChange={e => { setUploadAllChecked(e.target.checked); setUploadedFiles(p => p.map(f => ({ ...f, checked: e.target.checked }))); }} style={{ accentColor: TEAL }} />
                                  </th>
                                  <th style={{ padding: '5px 8px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center' }}>파일명</th>
                                  <th style={{ width: 80, padding: '5px 8px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center' }}>파일크기</th>
                                  <th style={{ width: 70, padding: '5px 8px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center' }}>순서변경</th>
                                  <th style={{ width: 40, padding: '5px 8px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', textAlign: 'center' }}>삭제</th>
                                </tr>
                              </thead>
                              <tbody>
                                {uploadedFiles.length === 0 ? (
                                  <tr><td colSpan={5} style={{ padding: '14px', textAlign: 'center', fontSize: 12, color: '#aaa' }}>조회된 결과가 없습니다.</td></tr>
                                ) : uploadedFiles.map((f, i) => (
                                  <tr key={f.id} style={{ borderBottom: '1px solid #eaecf4' }}>
                                    <td style={{ textAlign: 'center', padding: '5px', borderRight: '1px solid #eaecf4' }}>
                                      <input type="checkbox" checked={f.checked} onChange={e => setUploadedFiles(p => p.map(x => x.id === f.id ? { ...x, checked: e.target.checked } : x))} style={{ accentColor: TEAL }} />
                                    </td>
                                    <td style={{ padding: '5px 8px', fontSize: 12, borderRight: '1px solid #eaecf4' }}>{f.name}</td>
                                    <td style={{ padding: '5px 8px', fontSize: 12, borderRight: '1px solid #eaecf4', textAlign: 'right', color: '#555' }}>{f.size < 1024 ? `${f.size} Bytes` : `${(f.size / 1024).toFixed(0)} KB`}</td>
                                    <td style={{ padding: '5px', borderRight: '1px solid #eaecf4', textAlign: 'center' }}>
                                      <button onClick={() => setUploadedFiles(p => { const a = [...p]; if (i > 0) [a[i], a[i - 1]] = [a[i - 1], a[i]]; return a; })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10, marginRight: 2 }}>▲</button>
                                      <button onClick={() => setUploadedFiles(p => { const a = [...p]; if (i < a.length - 1) [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a; })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10 }}>▼</button>
                                    </td>
                                    <td style={{ padding: '5px', textAlign: 'center' }}>
                                      <button onClick={() => setUploadedFiles(p => p.filter(x => x.id !== f.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#888' }}>✕</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {/* DRAG & DROP */}
                            <div
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => { e.preventDefault(); handleEvFiles(e.dataTransfer.files); }}
                              style={{ border: '1px solid #d0d8e4', borderTop: 'none', padding: '20px', textAlign: 'center', background: '#fafbfd', cursor: 'pointer' }}
                              onClick={() => evFileInputRef.current?.click()}
                            >
                              <div style={{ fontSize: 28, color: '#8fa0b8', marginBottom: 4, letterSpacing: 6 }}>🎵 🖼 📄 ▶ ⚙</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#6a80a0', letterSpacing: 2 }}>DRAG &amp; DROP</div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 6, marginBottom: 4 }}>※ 파일첨부가 완료되면 [목록에 추가]버튼을 눌러 첨부파일을 입증서류목록에 추가할 수 있습니다.</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                      <button onClick={addToEvidenceList} style={{ height: 30, padding: '0 14px', border: '1px solid #1a3a6b', borderRadius: 2, background: NAVY, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>목록에 추가</button>
                    </div>

                    {/* 서증 직접 입력 폼 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '8px 10px', border: '1px solid #d0d8e4', background: '#f8f9fb', borderRadius: 2 }}>
                      <select value={evForm.role} onChange={e => setEvForm(p => ({ ...p, role: e.target.value as '원고' | '피고' }))} style={{ ...SEL, width: 120 }}>
                        <option value="피고">을호증(피고)</option>
                        <option value="원고">갑호증(원고)</option>
                      </select>
                      <input value={evForm.name} onChange={e => setEvForm(p => ({ ...p, name: e.target.value }))} style={{ ...INP, flex: 1 }} placeholder="서류명" />
                      <input value={evForm.purpose} onChange={e => setEvForm(p => ({ ...p, purpose: e.target.value }))} style={{ ...INP, flex: 1 }} placeholder="입증취지" />
                      <button onClick={addEvidence} style={{ height: 28, padding: '0 12px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>서증 추가</button>
                    </div>

                    {/* 입증서류목록 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>• 입증서류목록 <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>ⓘ</span></span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {['전자발급 서류 첨부하기', '서증등록목록삭제', '서증등록목록조회', '서증입력파일 등록'].map((lbl, i) => (
                          <button key={i} style={{ height: 26, padding: '0 8px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 3 }}>
                            {['📋', '🗑', '🔍', '📄'][i]} {lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 표시기준 박스 */}
                    <div style={{ border: '1px solid #d0d8e4', borderRadius: 3, background: '#fff', padding: '10px 14px', marginBottom: 8, display: 'flex', gap: 12 }}>
                      <div style={{ fontSize: 22, color: '#8fa0b8', flexShrink: 0 }}>📋</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>표시기준</div>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'disc', paddingLeft: 16 }}>
                          {[
                            "제출자가 사건의 원고일 경우 '갑호증', 피고일 경우 '을호증'으로 제출하시기 바랍니다.",
                            "본소가 소취하되어 병합 분리된 반소사건의 경우 반소원고는 '을호증', 반소피고는 '갑호증'으로 제출하시기 바랍니다.",
                            "독립당사자 참가인은 '병호증'으로 제출하시기 바랍니다.",
                          ].map((t, i) => (
                            <li key={i} style={{ fontSize: 12, color: TEAL, lineHeight: 1.8 }}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* 서증 목록 테이블 */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', marginBottom: 0 }}>
                      <thead>
                        <tr style={{ background: '#f5f7fb' }}>
                          <th style={{ width: 28, padding: '5px', borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center' }}>
                            <input type="checkbox" checked={evAllChecked} onChange={e => { setEvAllChecked(e.target.checked); setEvidenceRows(p => p.map(r => ({ ...r, checked: e.target.checked }))); }} style={{ accentColor: TEAL }} />
                          </th>
                          {['서증부호*', '가지부호', '서증번호*', '가지번호', '서류명*', '파일명', '페이지번호', '입증취지 등', '삭제'].map(h => (
                            <th key={h} style={{ padding: '5px 6px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {evidenceRows.length === 0 ? (
                          <tr><td colSpan={10} style={{ padding: '14px', textAlign: 'center', fontSize: 12, color: '#aaa' }}>조회된 결과가 없습니다.</td></tr>
                        ) : evidenceRows.map((row) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid #eaecf4' }}>
                            <td style={{ textAlign: 'center', padding: '4px', borderRight: '1px solid #eaecf4' }}>
                              <input type="checkbox" checked={row.checked} onChange={e => setEvidenceRows(p => p.map(r => r.id === row.id ? { ...r, checked: e.target.checked } : r))} style={{ accentColor: TEAL }} />
                            </td>
                            <td style={{ padding: '4px 5px', borderRight: '1px solid #eaecf4', textAlign: 'center' }}>
                              <input value={row.서증부호} onChange={e => setEvidenceRows(p => p.map(r => r.id === row.id ? { ...r, 서증부호: e.target.value } : r))} style={{ ...INP, width: 34, textAlign: 'center', padding: '0 3px' }} />
                            </td>
                            <td style={{ padding: '4px 5px', borderRight: '1px solid #eaecf4', textAlign: 'center' }}>
                              <input value={row.가지부호} onChange={e => setEvidenceRows(p => p.map(r => r.id === row.id ? { ...r, 가지부호: e.target.value } : r))} style={{ ...INP, width: 36, textAlign: 'center', padding: '0 3px' }} />
                            </td>
                            <td style={{ padding: '4px 5px', borderRight: '1px solid #eaecf4', textAlign: 'center' }}>
                              <input value={String(row.서증번호)} onChange={e => setEvidenceRows(p => p.map(r => r.id === row.id ? { ...r, 서증번호: Number(e.target.value) || 0 } : r))} style={{ ...INP, width: 36, textAlign: 'center', padding: '0 3px' }} />
                            </td>
                            <td style={{ padding: '4px 5px', borderRight: '1px solid #eaecf4', textAlign: 'center' }}>
                              <input value={row.가지번호} onChange={e => setEvidenceRows(p => p.map(r => r.id === row.id ? { ...r, 가지번호: e.target.value } : r))} style={{ ...INP, width: 36, textAlign: 'center', padding: '0 3px' }} />
                            </td>
                            <td style={{ padding: '4px 5px', borderRight: '1px solid #eaecf4' }}>
                              <input value={row.서류명} onChange={e => setEvidenceRows(p => p.map(r => r.id === row.id ? { ...r, 서류명: e.target.value } : r))} style={{ ...INP, width: 110 }} />
                            </td>
                            <td style={{ padding: '4px 5px', borderRight: '1px solid #eaecf4', textAlign: 'center' }}>
                              <span style={{ fontSize: 11, color: TEAL, cursor: 'pointer', textDecoration: 'underline' }}>{row.파일명}</span>
                            </td>
                            <td style={{ padding: '4px 5px', borderRight: '1px solid #eaecf4', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <input value={row.페이지번호1} onChange={e => setEvidenceRows(p => p.map(r => r.id === row.id ? { ...r, 페이지번호1: e.target.value } : r))} style={{ ...INP, width: 36, padding: '0 3px', textAlign: 'center' }} />
                                <span style={{ fontSize: 11 }}>-</span>
                                <input value={row.페이지번호2} onChange={e => setEvidenceRows(p => p.map(r => r.id === row.id ? { ...r, 페이지번호2: e.target.value } : r))} style={{ ...INP, width: 36, padding: '0 3px', textAlign: 'center' }} />
                              </div>
                            </td>
                            <td style={{ padding: '4px 5px', borderRight: '1px solid #eaecf4', textAlign: 'center' }}>
                              <button style={{ height: 22, padding: '0 6px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer' }}>입력</button>
                            </td>
                            <td style={{ padding: '4px 5px', textAlign: 'center' }}>
                              <button onClick={() => setEvidenceRows(p => p.filter(r => r.id !== row.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#888' }}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* 하단: 총건수 + 분리 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, padding: '6px 8px', border: '1px solid #d0d8e4', borderTop: 'none', background: '#f8f9fb' }}>
                      <span style={{ fontSize: 12, marginRight: 8 }}>총 <strong>{evidenceRows.length}</strong>건</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={가지번호분리} onChange={e => set가지번호분리(e.target.checked)} style={{ accentColor: TEAL }} /> 가지번호 분리
                      </label>
                      <span style={{ fontSize: 12 }}>분리방법</span>
                      <select value={분리방법} onChange={e => set분리방법(e.target.value)} style={{ ...SEL, width: 80, height: 26, fontSize: 12 }}>
                        <option>서류개수</option><option>페이지수</option>
                      </select>
                      <input value={분리개수} onChange={e => set분리개수(e.target.value)} style={{ ...INP, width: 50, height: 26 }} />
                      <button onClick={doEvSplit} style={{ height: 28, padding: '0 12px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>입증서류분리</button>
                    </div>

                    <div style={{ fontSize: 11, color: '#555', marginTop: 6, lineHeight: 1.8 }}>
                      ※ 입증서류목록에 서증파일들을 추가한 후 서증분리, 서류명 수정등 수정할 사항이 많은 경우 입력편의를 위하여 [<span style={{ color: TEAL }}>서증입력파일 등록</span>]기능을 활용하여 서증목록을 수정할 수 있습니다.
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <button onClick={() => setShowRegModal(true)} style={{ height: 32, padding: '0 20px', border: 'none', borderRadius: 2, background: NAVY, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        ✎ 등록
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ⑥ 첨부서류 */}
              <div id="sec-s6" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
                <SecHd label="⑥ 첨부서류" open={open.s6} toggle={() => toggle('s6')} />
                {open.s6 && (
                  <div style={{ padding: '12px 14px 16px' }}>
                    {/* 안내문 */}
                    <div style={{ fontSize: 11, color: '#333', lineHeight: 2, marginBottom: 10 }}>
                      <div>• 첨부서류로 제출한 문서는 증거로 사용될 수 없으며, 판결(결정) 등에 효력이 없습니다.</div>
                      <div>• 소송대리허가신청서 및 기타 신청서는 답변서와 별도의 서류로 제출하여야 하므로 첨부서류에 포함되지 않도록 유의하여 주시기 바랍니다.</div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                      <tbody>
                        {/* 서류명 row */}
                        <tr style={{ borderBottom: '1px solid #d0d8e4' }}>
                          <th style={{ ...TH, width: 100 }}>서류명 <span style={{ color: '#e53e3e' }}>*</span> <span style={{ fontSize: 10, color: '#888' }}>ⓘ</span></th>
                          <td style={TD}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <select
                                value={attachDocType}
                                onChange={e => {
                                  const v = e.target.value;
                                  setAttachDocType(v);
                                  if (v !== '직접입력') setAttachDocName(v);
                                  else setAttachDocName('');
                                }}
                                style={{ ...SEL, width: 200 }}
                              >
                                {['직접입력', '소송위임장', '법인등기사항증명서', '주민등록등본', '기타'].map(v => (
                                  <option key={v}>{v}</option>
                                ))}
                              </select>
                              <input
                                value={attachDocName}
                                onChange={e => setAttachDocName(e.target.value)}
                                placeholder={attachDocType === '직접입력' ? '서류명 직접 입력' : ''}
                                style={{ ...INP, width: 220 }}
                              />
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                <input type="checkbox" checked={attachSameAsFile} onChange={e => {
                                  setAttachSameAsFile(e.target.checked);
                                  if (e.target.checked && attachUploadedFiles.length > 0) {
                                    setAttachDocName(attachUploadedFiles[0].name.replace(/\.[^.]+$/, ''));
                                  }
                                }} style={{ accentColor: TEAL }} />
                                파일명과 동일
                              </label>
                            </div>
                          </td>
                        </tr>
                        {/* 파일첨부 row */}
                        <tr>
                          <th style={{ ...TH, width: 100, verticalAlign: 'top', paddingTop: 10 }}>파일첨부 <span style={{ color: '#e53e3e' }}>*</span> <span style={{ fontSize: 10, color: '#888' }}>ⓘ</span></th>
                          <td style={{ padding: '8px 10px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5, marginBottom: 5 }}>
                              <button onClick={() => attachFileInputRef.current?.click()} style={{ height: 26, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>📋 파일찾기</button>
                              <button onClick={() => setAttachUploadedFiles(p => p.filter(f => !f.checked))} style={{ height: 26, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>🗑 삭제</button>
                              <input ref={attachFileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => {
                                if (!e.target.files) return;
                                const arr = Array.from(e.target.files).map(f => ({ id: crypto.randomUUID(), name: f.name, size: f.size, checked: false }));
                                setAttachUploadedFiles(p => {
                                  const next = [...p, ...arr];
                                  if (attachSameAsFile && next.length > 0) setAttachDocName(next[0].name.replace(/\.[^.]+$/, ''));
                                  return next;
                                });
                              }} />
                            </div>
                            {/* 파일 목록 */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', marginBottom: 0 }}>
                              <thead>
                                <tr style={{ background: '#f5f7fb' }}>
                                  <th style={{ width: 28, padding: '5px', borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center' }}>
                                    <input type="checkbox" checked={attachAllChecked} onChange={e => { setAttachAllChecked(e.target.checked); setAttachUploadedFiles(p => p.map(f => ({ ...f, checked: e.target.checked }))); }} style={{ accentColor: TEAL }} />
                                  </th>
                                  <th style={{ padding: '5px 8px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center' }}>파일명</th>
                                  <th style={{ width: 80, padding: '5px 8px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center' }}>파일크기</th>
                                  <th style={{ width: 70, padding: '5px 8px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center' }}>순서변경</th>
                                  <th style={{ width: 40, padding: '5px 8px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', textAlign: 'center' }}>삭제</th>
                                </tr>
                              </thead>
                              <tbody>
                                {attachUploadedFiles.length === 0 ? (
                                  <tr><td colSpan={5} style={{ padding: '14px', textAlign: 'center', fontSize: 12, color: '#aaa' }}>조회된 결과가 없습니다.</td></tr>
                                ) : attachUploadedFiles.map((f, i) => (
                                  <tr key={f.id} style={{ borderBottom: '1px solid #eaecf4' }}>
                                    <td style={{ textAlign: 'center', padding: '5px', borderRight: '1px solid #eaecf4' }}>
                                      <input type="checkbox" checked={f.checked} onChange={e => setAttachUploadedFiles(p => p.map(x => x.id === f.id ? { ...x, checked: e.target.checked } : x))} style={{ accentColor: TEAL }} />
                                    </td>
                                    <td style={{ padding: '5px 8px', fontSize: 12, borderRight: '1px solid #eaecf4' }}>{f.name}</td>
                                    <td style={{ padding: '5px 8px', fontSize: 12, borderRight: '1px solid #eaecf4', textAlign: 'right', color: '#555' }}>{f.size < 1024 ? `${f.size} Bytes` : `${(f.size / 1024).toFixed(0)} KB`}</td>
                                    <td style={{ padding: '5px', borderRight: '1px solid #eaecf4', textAlign: 'center' }}>
                                      <button onClick={() => setAttachUploadedFiles(p => { const a = [...p]; if (i > 0) [a[i], a[i - 1]] = [a[i - 1], a[i]]; return a; })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10, marginRight: 2 }}>▲</button>
                                      <button onClick={() => setAttachUploadedFiles(p => { const a = [...p]; if (i < a.length - 1) [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a; })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10 }}>▼</button>
                                    </td>
                                    <td style={{ padding: '5px', textAlign: 'center' }}>
                                      <button onClick={() => setAttachUploadedFiles(p => p.filter(x => x.id !== f.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#888' }}>✕</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {/* DRAG & DROP */}
                            <div
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => {
                                e.preventDefault();
                                if (!e.dataTransfer.files) return;
                                const arr = Array.from(e.dataTransfer.files).map(f => ({ id: crypto.randomUUID(), name: f.name, size: f.size, checked: false }));
                                setAttachUploadedFiles(p => [...p, ...arr]);
                              }}
                              style={{ border: '1px solid #d0d8e4', borderTop: 'none', padding: '20px', textAlign: 'center', background: '#fafbfd', cursor: 'pointer' }}
                              onClick={() => attachFileInputRef.current?.click()}
                            >
                              <div style={{ fontSize: 28, color: '#8fa0b8', marginBottom: 4, letterSpacing: 6 }}>🎵 🖼 📄 ▶ ⚙</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#6a80a0', letterSpacing: 2 }}>DRAG &amp; DROP</div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ fontSize: 11, color: '#555', marginTop: 6, marginBottom: 4 }}>※ 첨부할 파일을 등록 후 반드시 [목록에 추가]버튼을 눌러 첨부서류 목록에 추가하시기 바랍니다.</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                      <button onClick={() => {
                        if (attachUploadedFiles.length === 0) { alert('첨부된 파일이 없습니다.'); return; }
                        if (!attachDocName.trim()) { alert('서류명을 입력해주세요.'); return; }
                        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
                        const newRows = attachUploadedFiles.map((f, i) => ({
                          id: crypto.randomUUID(),
                          번호: attachRows.length + i + 1,
                          서류명: attachDocName.trim(),
                          파일명: f.name,
                          파일크기: f.size,
                          등록일: today,
                        }));
                        setAttachRows(p => [...p, ...newRows]);
                        setAttachUploadedFiles([]);
                      }} style={{ height: 30, padding: '0 14px', border: '1px solid #1a3a6b', borderRadius: 2, background: NAVY, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>목록에 추가</button>
                    </div>

                    {/* 첨부서류목록 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>• 첨부서류목록</span>
                      <button style={{ height: 26, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>📋 전자발급 서류 첨부하기</button>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                      <thead>
                        <tr style={{ background: '#f5f7fb' }}>
                          {['번호', '서류명*', '파일명', '등록일', '순서변경', '삭제'].map(h => (
                            <th key={h} style={{ padding: '6px 8px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {attachRows.length === 0 ? (
                          <tr><td colSpan={6} style={{ padding: '14px', textAlign: 'center', fontSize: 12, color: '#e53e3e' }}>조회된 결과가 없습니다.</td></tr>
                        ) : attachRows.map((row, i) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid #eaecf4' }}>
                            <td style={{ padding: '5px 8px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #eaecf4', width: 40 }}>{row.번호}</td>
                            <td style={{ padding: '5px 8px', borderRight: '1px solid #eaecf4' }}>
                              <input value={row.서류명} onChange={e => setAttachRows(p => p.map(r => r.id === row.id ? { ...r, 서류명: e.target.value } : r))} style={{ ...INP, width: '100%' }} />
                            </td>
                            <td style={{ padding: '5px 8px', fontSize: 12, borderRight: '1px solid #eaecf4', textAlign: 'center' }}>
                              <span style={{ color: TEAL, textDecoration: 'underline', cursor: 'pointer' }}>{row.파일명}</span>
                              <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>({row.파일크기 < 1024 ? `${row.파일크기} Bytes` : `${(row.파일크기 / 1024).toFixed(0)} KB`})</span>
                            </td>
                            <td style={{ padding: '5px 8px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #eaecf4', whiteSpace: 'nowrap' }}>{row.등록일}</td>
                            <td style={{ padding: '5px', borderRight: '1px solid #eaecf4', textAlign: 'center' }}>
                              <button onClick={() => setAttachRows(p => { const a = [...p]; if (i > 0) [a[i], a[i - 1]] = [a[i - 1], a[i]]; return a.map((r, j) => ({ ...r, 번호: j + 1 })); })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10, marginRight: 2 }}>▲</button>
                              <button onClick={() => setAttachRows(p => { const a = [...p]; if (i < a.length - 1) [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a.map((r, j) => ({ ...r, 번호: j + 1 })); })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10 }}>▼</button>
                            </td>
                            <td style={{ padding: '5px', textAlign: 'center' }}>
                              <button onClick={() => setAttachRows(p => p.filter(r => r.id !== row.id).map((r, j) => ({ ...r, 번호: j + 1 })))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#888' }}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ fontSize: 12, marginTop: 6, marginBottom: 10 }}>총 <strong>{attachRows.length}</strong> 건</div>
                  </div>
                )}
              </div>

              {/* Notice */}
              <div style={{ border: '1px solid #d8dce8', background: '#f8f9fb', borderRadius: 2, padding: '8px 12px', marginBottom: 10 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {['당사자 정보는 주민등록상 정보와 일치해야 하며, 허위 정보 입력 시 법적 책임이 발생할 수 있습니다.', '답변서는 소장 부본을 송달받은 날부터 30일 이내에 제출하시기 바랍니다.'].map((t, i) => (
                    <li key={i} style={{ fontSize: 11, color: '#666', lineHeight: 1.8, paddingLeft: 10, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>•</span>{t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ height: 32, padding: '0 16px', background: '#fff', border: '1px solid #aaa', color: '#555', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    파일첨부방식작성
                  </button>
                  <button style={{ height: 32, padding: '0 16px', background: '#fff', border: `1px solid ${TEAL}`, color: TEAL, borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    임시저장
                  </button>
                </div>
                <button onClick={() => setStep(2)} style={{ height: 34, padding: '0 24px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  작성완료 →
                </button>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* STEP 2: 최종문서확인 */}
          {/* ════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ color: TEAL, fontSize: 15 }}>●</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>민사서류 - 답변서(청구취지/원인)</span>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                {/* Left: Document list */}
                <div style={{ width: 200, flexShrink: 0, background: '#fff', border: '1px solid #d0d8e4', borderRadius: 2, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0366d6', marginBottom: 8, cursor: 'pointer' }}>• 답변서(청구취지/원인)</div>
                  {evidenceRows.map((r, i) => (
                    <div key={r.id} style={{ fontSize: 11, color: '#555', padding: '3px 0 3px 12px' }}>을 제{i + 1}호증: {r.서류명}</div>
                  ))}
                  {attachRows.map(r => (
                    <div key={r.id} style={{ fontSize: 11, color: '#555', padding: '3px 0 3px 12px' }}>{r.서류명}</div>
                  ))}
                </div>

                {/* Right: Document preview */}
                <div style={{ flex: 1, background: '#fff', border: '1px solid #d0d8e4', borderRadius: 2, padding: '40px 50px', minHeight: 600 }}>
                  <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 30 }}>답 변 서</div>
                  <div style={{ fontSize: 13, lineHeight: 2.2, marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <span style={{ letterSpacing: 12 }}>사  건</span>
                      <span>{caseNo}  {caseName}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <span style={{ letterSpacing: 12 }}>원  고</span>
                      <span>{plaintiff}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <span style={{ letterSpacing: 12 }}>피  고</span>
                      <span>{defendant}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 24 }}>위 사건에 관하여 다음과 같이 답변합니다.</div>

                  <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>청구취지에 대한 답변</div>
                  <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 24, whiteSpace: 'pre-wrap' }}>{answerPurpose || '(내용 없음)'}</div>

                  <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>청구원인에 대한 답변</div>
                  <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 24, whiteSpace: 'pre-wrap' }}>{answerCause || '(내용 없음)'}</div>

                  {evidenceRows.length > 0 && (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>입증방법</div>
                      {evidenceRows.map((r, i) => (
                        <div key={r.id} style={{ fontSize: 13, lineHeight: 1.8 }}>을 제{i + 1}호증:  {r.서류명}</div>
                      ))}
                      <div style={{ marginBottom: 24 }} />
                    </>
                  )}

                  {attachRows.length > 0 && (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>첨부서류</div>
                      {attachRows.map((r, i) => (
                        <div key={r.id} style={{ fontSize: 13, lineHeight: 1.8 }}>{i + 1}. {r.서류명}</div>
                      ))}
                      <div style={{ marginBottom: 24 }} />
                    </>
                  )}

                  <div style={{ textAlign: 'right', fontSize: 13, marginBottom: 20 }}>{dateStr}</div>
                  <div style={{ textAlign: 'right', fontSize: 13 }}>원고 소송대리인</div>
                  <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700 }}>변호사 {user.name}</div>
                </div>
              </div>

              {/* Bottom notices */}
              <div style={{ border: '1px solid #d8dce8', background: '#f8f9fb', borderRadius: 2, padding: '8px 12px', marginTop: 12, marginBottom: 8 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ fontSize: 11, color: '#666', lineHeight: 1.8, paddingLeft: 10, position: 'relative' }}><span style={{ position: 'absolute', left: 0 }}>•</span>최종문서는 PDF 형식으로 변환되어 제출됩니다. 내용을 확인하시기 바랍니다.</li>
                  <li style={{ fontSize: 11, color: '#666', lineHeight: 1.8, paddingLeft: 10, position: 'relative' }}><span style={{ position: 'absolute', left: 0 }}>•</span>문서 내용에 이상이 있으면 이전으로 돌아가 수정하시기 바랍니다.</li>
                </ul>
              </div>

              {/* Confirmation checkbox */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ accentColor: TEAL }} />
                  모든 문서의 내용에 이상이 없음을 확인합니다.
                </label>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setStep(1)} style={{ height: 32, padding: '0 16px', background: '#fff', border: '1px solid #aaa', color: '#555', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  이전으로가기
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ height: 32, padding: '0 16px', background: '#fff', border: '1px solid #e53e3e', color: '#e53e3e', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    작성문서 및 파일 삭제
                  </button>
                  <button onClick={() => { if (confirmed) setStep(3); }} disabled={!confirmed} style={{ height: 34, padding: '0 24px', background: confirmed ? NAVY : '#c8d4dc', color: '#fff', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 700, cursor: confirmed ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                    확인완료
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* STEP 3: 전자서명 */}
          {/* ════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: TEAL, marginBottom: 16 }}>전자서명</h2>

              {/* 전자서명 대상서류 */}
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>전자서명 대상서류</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', marginBottom: 0 }}>
                <thead>
                  <tr style={{ background: '#f5f7fb' }}>
                    {['번호', '구분', '서류명', '파일명', '크기', '서명일시'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allSignRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eaecf4' }}>
                      <td style={{ padding: '6px 10px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #eaecf4', width: 40 }}>{i + 1}</td>
                      <td style={{ padding: '6px 10px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #eaecf4' }}>{row.구분}</td>
                      <td style={{ padding: '6px 10px', fontSize: 12, borderRight: '1px solid #eaecf4' }}>{row.서류명}</td>
                      <td style={{ padding: '6px 10px', fontSize: 12, borderRight: '1px solid #eaecf4', color: TEAL }}>{row.파일명}</td>
                      <td style={{ padding: '6px 10px', fontSize: 12, textAlign: 'right', borderRight: '1px solid #eaecf4' }}>{row.크기}</td>
                      <td style={{ padding: '6px 10px', fontSize: 12, textAlign: 'center', color: '#888' }}>서명안함</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', border: '1px solid #d0d8e4', borderTop: 'none', background: '#f8f9fb', marginBottom: 12 }}>
                <span style={{ fontSize: 12 }}>총 <strong>{allSignRows.length}</strong>건</span>
                <button style={{ height: 26, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333' }}>접수증명신청서 생성</button>
              </div>

              {/* Notice */}
              <div style={{ fontSize: 12, color: TEAL, lineHeight: 1.8, marginBottom: 12 }}>
                ※ 접수증명신청서를 생성하려면 전자서명 요청 전에 생성하시기 바랍니다. 전자서명이 완료된 후에는 접수증명신청서를 생성할 수 없습니다.
              </div>

              {/* Info box */}
              <div style={{ border: `1px solid ${TEAL}40`, background: '#f0f7f8', borderRadius: 4, padding: '12px 16px', fontSize: 12, color: '#333', lineHeight: 1.8, marginBottom: 12 }}>
                전자소송포털에 등록된 인증서로만 전자서명이 가능합니다.
              </div>

              {/* 참고하세요 box */}
              <div style={{ border: '1px solid #d8dce8', background: '#f8f9fb', borderRadius: 2, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>참고하세요</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'disc', paddingLeft: 18 }}>
                  <li style={{ fontSize: 11, color: '#555', lineHeight: 2 }}>접수증명신청서는 접수증명이 필요한 경우에만 생성하시면 됩니다.</li>
                  <li style={{ fontSize: 11, color: '#555', lineHeight: 2 }}>전자서명 요청 시 모든 문서에 대해 일괄 전자서명이 수행됩니다.</li>
                  <li style={{ fontSize: 11, color: '#555', lineHeight: 2 }}>전자서명 완료 후 문서 내용을 수정할 수 없으므로 신중하게 확인하시기 바랍니다.</li>
                  <li style={{ fontSize: 11, color: '#555', lineHeight: 2 }}>공동명의 전자문서를 제출하려면 공동명의인 전원의 전자서명이 필요합니다.</li>
                </ul>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setStep(2)} style={{ height: 32, padding: '0 16px', background: '#fff', border: '1px solid #aaa', color: '#555', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  이전으로
                </button>
                <button onClick={() => setShowSignModal(true)} style={{ height: 34, padding: '0 24px', background: NAVY, color: '#fff', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  전자서명
                </button>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* STEP 4: 전자제출 */}
          {/* ════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: TEAL, marginBottom: 16 }}>문서제출</h2>

              {/* 사건기본정보 */}
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>사건기본정보</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', marginBottom: 16 }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                    <th style={TH}>사건번호</th>
                    <td style={TD}>{caseNo || '-'}</td>
                    <th style={TH}>법원</th>
                    <td style={TD}>{court || '-'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                    <th style={TH}>재판부</th>
                    <td style={TD}>{division || '-'}</td>
                    <th style={TH}>사건명</th>
                    <td style={TD}>{caseName || '-'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                    <th style={TH}>원고</th>
                    <td style={TD}>{plaintiff || '-'}</td>
                    <th style={TH}>피고</th>
                    <td style={TD}>{defendant || '-'}</td>
                  </tr>
                </tbody>
              </table>

              {/* TEAL notices */}
              <div style={{ fontSize: 12, color: TEAL_DARK, lineHeight: 1.8, marginBottom: 8 }}>
                ※ 관할 법원이 올바른지 확인하시기 바랍니다. 관할이 다른 경우 이송될 수 있습니다.
              </div>
              <div style={{ fontSize: 12, color: TEAL_DARK, lineHeight: 1.8, marginBottom: 16 }}>
                ※ 지급명령 사건의 경우 채무자의 주소지를 관할하는 법원에 제출하여야 합니다.
              </div>

              {/* 제출서류 */}
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>제출서류</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', marginBottom: 0 }}>
                <thead>
                  <tr style={{ background: '#f5f7fb' }}>
                    {['번호', '구분', '서류명', '파일명', '크기', '서명일시'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allSignRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eaecf4' }}>
                      <td style={{ padding: '6px 10px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #eaecf4', width: 40 }}>{i + 1}</td>
                      <td style={{ padding: '6px 10px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #eaecf4' }}>{row.구분}</td>
                      <td style={{ padding: '6px 10px', fontSize: 12, borderRight: '1px solid #eaecf4' }}>{row.서류명}</td>
                      <td style={{ padding: '6px 10px', fontSize: 12, borderRight: '1px solid #eaecf4', color: TEAL }}>{row.파일명}</td>
                      <td style={{ padding: '6px 10px', fontSize: 12, textAlign: 'right', borderRight: '1px solid #eaecf4' }}>{row.크기}</td>
                      <td style={{ padding: '6px 10px', fontSize: 12, textAlign: 'center', color: '#059669' }}>서명완료</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', border: '1px solid #d0d8e4', borderTop: 'none', background: '#f8f9fb', marginBottom: 12 }}>
                <span style={{ fontSize: 12 }}>총 <strong>{allSignRows.length}</strong>건</span>
                <button style={{ height: 26, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333' }}>접수증명신청서 생성</button>
              </div>

              <div style={{ fontSize: 12, color: TEAL, lineHeight: 1.8, marginBottom: 16 }}>
                ※ 접수증명신청서는 문서제출 전에 생성할 수 있습니다.
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setStep(3)} style={{ height: 32, padding: '0 16px', background: '#fff', border: '1px solid #aaa', color: '#555', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  이전으로가기
                </button>
                <button onClick={handleFinalSubmit} disabled={submitting} style={{ height: 34, padding: '0 24px', background: submitting ? '#7a8a9e' : NAVY, color: '#fff', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {submitting ? '⏳ 제출 중...' : '문서제출'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>

      <Footer />
    </div>
  );
}
