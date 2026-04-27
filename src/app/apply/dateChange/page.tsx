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
const TH: React.CSSProperties = { ..._TH, width: 100, padding: '9px 12px', fontWeight: 600, color: '#333', verticalAlign: 'middle', borderRight: '1px solid #e8edf4' };
const TD: React.CSSProperties = { ..._TD, padding: '7px 12px' };

void _SEL; void _INP; void _TH; void _TD; // base styles used via overrides

// ── Helper components ─────────────────────────────────────────
function SecHd({ label, open, toggle }: { label: string; open: boolean; toggle: () => void }) {
  return (
    <div onClick={toggle} style={{ background: '#f2f5f8', borderBottom: open ? '1px solid #d0d8e4' : 'none', padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ color: TEAL, fontSize: 13 }}>○</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{label}</span>
      </div>
      <div style={{ width: 18, height: 18, border: '1px solid #b0b8c8', borderRadius: 2, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#666' }}>
        {open ? '\u25B2' : '\u25BC'}
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

function getBytes(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    bytes += str.charCodeAt(i) > 127 ? 2 : 1;
  }
  return bytes;
}

// ── Main Page ──────────────────────────────────────────────────
export default function DateChangePageWrapper() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>로딩 중...</div>}>
      <DateChangePage />
    </Suspense>
  );
}

function DateChangePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Step management
  const [step, setStep] = useState(1);

  // Section accordion (step 1) — 4 sections (no evidence)
  const [open, setOpen] = useState({ s1: true, s2: true, s3: true, s4: true });
  const toggle = useCallback((k: keyof typeof open) => setOpen(p => ({ ...p, [k]: !p[k] })), []);

  // Sidebar nav
  const [activeNav, setActiveNav] = useState('s1');

  // Case info (loaded from caseId)
  const [caseNo, setCaseNo] = useState('');
  const [court, setCourt] = useState('');
  const [division, setDivision] = useState('');
  const [caseName, setCaseName] = useState('');
  const [plaintiff, setPlaintiff] = useState('');
  const [defendant, setDefendant] = useState('');
  const [caseLoaded, setCaseLoaded] = useState(false);

  // Input mode toggle
  const [inputMode, setInputMode] = useState<'direct' | 'file'>('direct');

  // Direct mode fields
  const [hearingType, setHearingType] = useState('변론기일');
  const [claimPurpose, setClaimPurpose] = useState('');
  const [claimReason, setClaimReason] = useState('');
  const [preferredDate1, setPreferredDate1] = useState('');
  const [preferredDate2, setPreferredDate2] = useState('');
  const [preferredDate3, setPreferredDate3] = useState('');

  // 파일첨부방식 (file mode)
  const [briefFileName, setBriefFileName] = useState<string | null>(null);
  const [briefFileSize, setBriefFileSize] = useState(0);
  const briefFileRef = useRef<HTMLInputElement>(null);

  // 서류명의인
  const [docOwners, setDocOwners] = useState<DocOwner[]>([]);

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

  // Auto-fill claimPurpose when hearingType changes
  useEffect(() => {
    if (inputMode === 'direct') {
      setClaimPurpose(`이 사건에 관하여 ${hearingType}이 20○○. ○○. ○○. ○○:○○로 지정되었는데, 원고(또는 피고)는 다음과 같은 사유로 출석할 수 없으므로, 위 ${hearingType}을 변경하여 주시기 바랍니다.`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hearingType]);

  // caseId로 배정된 사건 정보 자동 로드
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
      setDocOwners([{ id: crypto.randomUUID(), type: '신청인', name: `변호사 ${user.name}`, userId: user.id }]);
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
        doc_type: 'dateChange',
        case_type: caseName || '기일변경신청서',
        court,
        plaintiff,
        defendant,
        has_agent: false,
        evidence_count: 0,
        score: 0,
        feedback: '채점 중...',
        complaint_data: {
          doc_type: 'dateChange',
          inputMode,
          hearingType,
          claimPurpose,
          claimReason,
          preferredDate1,
          preferredDate2,
          preferredDate3,
          fileName: briefFileName,
          caseNo,
          court,
          division,
          caseName,
          plaintiff,
          defendant,
          docOwners,
          attachments: attachRows.map(r => ({ name: r.서류명, file: r.파일명 })),
        },
        case_id: searchParams.get('caseId') || null,
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
              doc_type: 'dateChange',
              caseCategory: caseName,
              caseName,
              court,
              hearingType,
              claimPurpose,
              claimReason,
              preferredDate1,
              preferredDate2,
              preferredDate3,
              parties: [
                { id: '1', role: '원고', name: plaintiff, addr: '' },
                { id: '2', role: '피고', name: defendant, addr: '' },
              ],
              hasAgent: false,
            },
            sampleCase: { id: '0', title: caseName, case_type: caseName, court, plaintiff, defendant, created_at: new Date().toISOString() },
            doc_type: 'dateChange',
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

  // ── Loading / Auth ──
  if (loading || !user) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 14, color: '#666' }}>로딩 중...</span></div>;
  }

  // Ensure docOwners populated
  if (docOwners.length === 0) {
    setDocOwners([{ id: crypto.randomUUID(), type: '신청인', name: `변호사 ${user.name}`, userId: user.id }]);
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}.`;

  const sideItemsDirect = [
    { key: 's1', label: '사건기본정보' },
    { key: 's2', label: '기일변경신청서 입력' },
    { key: 's3', label: '서류명의인' },
    { key: 's4', label: '첨부서류' },
  ];

  const sideItemsFile = [
    { key: 's1', label: '사건기본정보' },
    { key: 's2', label: '기일변경신청서 입력' },
    { key: 's3', label: '서류명의인' },
    { key: 's4', label: '첨부서류' },
  ];

  const sideItems = inputMode === 'direct' ? sideItemsDirect : sideItemsFile;

  const allSignRows = [
    { 구분: '소송문서', 서류명: '기일변경신청서', 파일명: `기일변경신청서(${caseNo || '-'}).pdf`, 크기: '56.6 KB' },
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
                <span style={{ color: activeNav === item.key ? TEAL : '#bbb', fontSize: 9 }}>{'\u25B8'}</span>
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
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>민사서류 - 기일변경신청서</span>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => setOpen({ s1: true, s2: true, s3: true, s4: true })} style={{ height: 26, padding: '0 10px', border: '1px solid #b8c4cc', borderRadius: 2, background: '#fff', color: '#555', fontSize: 11, cursor: 'pointer' }}>전체열기 ▼</button>
                  <button onClick={() => setOpen({ s1: false, s2: false, s3: false, s4: false })} style={{ height: 26, padding: '0 10px', border: '1px solid #b8c4cc', borderRadius: 2, background: '#fff', color: '#555', fontSize: 11, cursor: 'pointer' }}>전체닫기 ▲</button>
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

              {/* ② 기일변경신청서 입력 */}
              <div id="sec-s2" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
                <SecHd label="② 기일변경신청서 입력" open={open.s2} toggle={() => toggle('s2')} />
                {open.s2 && (
                  <div style={{ padding: '12px 14px 14px' }}>
                    {inputMode === 'direct' ? (
                      /* ── 직접입력 모드 ── */
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                        <tbody>
                          {/* 신청취지 */}
                          <tr style={{ borderBottom: '1px solid #d0d8e4' }}>
                            <th style={{ ...TH, verticalAlign: 'top', paddingTop: 11, width: 100 }}>신청취지 <span style={{ color: '#e53e3e' }}>*</span></th>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 12, color: '#555' }}>기일종류:</span>
                                  <select value={hearingType} onChange={e => setHearingType(e.target.value)} style={{ ...SEL, width: 140 }}>
                                    {['변론기일', '조정기일', '심문기일', '화해기일', '선고기일'].map(v => <option key={v} value={v}>{v}</option>)}
                                  </select>
                                </div>
                                <span style={{ fontSize: 11, color: '#888' }}>({getBytes(claimPurpose)} / 2000 Bytes)</span>
                              </div>
                              <textarea
                                value={claimPurpose}
                                onChange={e => { if (getBytes(e.target.value) <= 2000) setClaimPurpose(e.target.value); }}
                                style={{ ...INP, width: '100%', minHeight: 100, padding: '8px', resize: 'vertical', lineHeight: 1.8, fontSize: 12, boxSizing: 'border-box' }}
                              />
                            </td>
                          </tr>
                          {/* 신청사유 */}
                          <tr style={{ borderBottom: '1px solid #d0d8e4' }}>
                            <th style={{ ...TH, verticalAlign: 'top', paddingTop: 11, width: 100 }}>신청사유 <span style={{ color: '#e53e3e' }}>*</span></th>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                                <span style={{ fontSize: 11, color: '#888' }}>({getBytes(claimReason)} / 2000 Bytes)</span>
                              </div>
                              <textarea
                                value={claimReason}
                                onChange={e => { if (getBytes(e.target.value) <= 2000) setClaimReason(e.target.value); }}
                                placeholder="20○○. ○○. ○○. 예비군 훈련"
                                style={{ ...INP, width: '100%', minHeight: 80, padding: '8px', resize: 'vertical', lineHeight: 1.8, fontSize: 12, boxSizing: 'border-box' }}
                              />
                            </td>
                          </tr>
                          {/* 희망기일 */}
                          <tr>
                            <th style={{ ...TH, verticalAlign: 'top', paddingTop: 11, width: 100 }}>희망기일 <span style={{ fontSize: 10, color: '#888' }}>&#9432;</span></th>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#555', minWidth: 16 }}>1.</span>
                                  <input type="date" value={preferredDate1} onChange={e => setPreferredDate1(e.target.value)} style={{ ...INP, width: 180 }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#555', minWidth: 16 }}>2.</span>
                                  <input type="date" value={preferredDate2} onChange={e => setPreferredDate2(e.target.value)} style={{ ...INP, width: 180 }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#555', minWidth: 16 }}>3.</span>
                                  <input type="date" value={preferredDate3} onChange={e => setPreferredDate3(e.target.value)} style={{ ...INP, width: 180 }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      /* ── 파일첨부 모드 ── */
                      <>
                        {/* Yellow info box */}
                        <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 4, padding: '12px 16px', marginBottom: 12, color: '#92400e', fontSize: 12, lineHeight: 1.8 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>&#8505; 실무 안내</div>
                          <div>기일변경신청서는 상대방의 동의를 먼저 받아야 합니다.</div>
                          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                            <li>상대방(또는 대리인)에게 팩스/전화로 동의 요청</li>
                            <li>동의 확인 후 상대방 날인이 된 기일변경신청서 작성</li>
                            <li>날인된 서류를 스캔/촬영하여 PDF로 변환 후 첨부</li>
                          </ul>
                          <div style={{ marginTop: 4 }}>동의서 없이 제출 시 법원이 기각할 수 있습니다.</div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #d0d8e4' }}>
                              <th style={{ ...TH, width: 100 }}>서류명</th>
                              <td style={TD}>
                                <span style={{ fontSize: 13, color: '#888' }}>기일변경신청서</span>
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #d0d8e4' }}>
                              <th style={{ ...TH, width: 100 }}>첨부파일</th>
                              <td style={{ padding: '8px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                  {briefFileName ? (
                                    <span style={{ fontSize: 12, color: TEAL, fontWeight: 600 }}>
                                      ✓ {briefFileName} <span style={{ color: '#888', fontWeight: 400 }}>({briefFileSize < 1024 ? `${briefFileSize} Bytes` : `${(briefFileSize / 1024).toFixed(0)} KB`})</span>
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 12, color: '#aaa' }}>첨부된 파일이 없습니다.</span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: 5 }}>
                                  <button onClick={() => briefFileRef.current?.click()} style={{ height: 26, padding: '0 12px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    📎파일첨부하기
                                  </button>
                                  <button onClick={() => { setBriefFileName(null); setBriefFileSize(0); }} style={{ height: 26, padding: '0 12px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    🗑파일삭제하기
                                  </button>
                                  <input ref={briefFileRef} type="file" style={{ display: 'none' }} accept=".pdf,.hwp,.hwpx,.doc,.docx" onChange={e => { const f = e.target.files?.[0]; if (f) { setBriefFileName(f.name); setBriefFileSize(f.size); } }} />
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <th style={{ ...TH, width: 100, verticalAlign: 'top', paddingTop: 10 }}>파일첨부</th>
                              <td style={{ padding: '8px 12px' }}>
                                <div
                                  onDragOver={e => e.preventDefault()}
                                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) { setBriefFileName(f.name); setBriefFileSize(f.size); } }}
                                  style={{ border: '2px dashed #c8d8e8', borderRadius: 6, padding: '28px 20px', textAlign: 'center', background: '#fafbfe', cursor: 'pointer' }}
                                  onClick={() => briefFileRef.current?.click()}
                                >
                                  <div style={{ fontSize: 32, marginBottom: 8, opacity: .5 }}>📄</div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: '#6a80a0', letterSpacing: 2 }}>DRAG &amp; DROP</div>
                                  <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>또는 이 영역을 클릭하여 파일을 첨부하세요</div>
                                </div>
                                <div style={{ marginTop: 8, fontSize: 11, color: TEAL, lineHeight: 1.7 }}>
                                  ※ 첨부가능한 파일 형식 : PDF, HWP, HWPX, DOC, DOCX (PDF파일로 자동변환, 20MB까지 첨부가능)
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <button onClick={() => setShowRegModal(true)} style={{ height: 32, padding: '0 20px', border: 'none', borderRadius: 2, background: NAVY, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        ✎ 등록
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ③ 신청인 */}
              <div id="sec-s3" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
                <SecHd label="③ 신청인" open={open.s3} toggle={() => toggle('s3')} />
                {open.s3 && (
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
                              <button onClick={() => setDocOwners(p => p.filter(x => x.id !== o.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#888' }}>{'\u2715'}</button>
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

              {/* ④ 첨부서류 */}
              <div id="sec-s4" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
                <SecHd label="④ 첨부서류" open={open.s4} toggle={() => toggle('s4')} />
                {open.s4 && (
                  <div style={{ padding: '12px 14px 16px' }}>
                    {/* 안내문 */}
                    <div style={{ fontSize: 11, color: '#333', lineHeight: 2, marginBottom: 10 }}>
                      <div>• 첨부서류로 제출한 문서는 증거로 사용될 수 없으며, 판결(결정) 등에 효력이 없습니다.</div>
                      <div>• 소송대리허가신청서 및 기타 신청서는 기일변경신청서와 별도의 서류로 제출하여야 하므로 첨부서류에 포함되지 않도록 유의하여 주시기 바랍니다.</div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                      <tbody>
                        {/* 서류명 row */}
                        <tr style={{ borderBottom: '1px solid #d0d8e4' }}>
                          <th style={{ ...TH, width: 100 }}>서류명 <span style={{ color: '#e53e3e' }}>*</span> <span style={{ fontSize: 10, color: '#888' }}>&#9432;</span></th>
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
                          <th style={{ ...TH, width: 100, verticalAlign: 'top', paddingTop: 10 }}>파일첨부 <span style={{ color: '#e53e3e' }}>*</span> <span style={{ fontSize: 10, color: '#888' }}>&#9432;</span></th>
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
                                      <button onClick={() => setAttachUploadedFiles(p => { const a = [...p]; if (i > 0) [a[i], a[i - 1]] = [a[i - 1], a[i]]; return a; })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10, marginRight: 2 }}>{'\u25B2'}</button>
                                      <button onClick={() => setAttachUploadedFiles(p => { const a = [...p]; if (i < a.length - 1) [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a; })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10 }}>{'\u25BC'}</button>
                                    </td>
                                    <td style={{ padding: '5px', textAlign: 'center' }}>
                                      <button onClick={() => setAttachUploadedFiles(p => p.filter(x => x.id !== f.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#888' }}>{'\u2715'}</button>
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
                              <button onClick={() => setAttachRows(p => { const a = [...p]; if (i > 0) [a[i], a[i - 1]] = [a[i - 1], a[i]]; return a.map((r, j) => ({ ...r, 번호: j + 1 })); })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10, marginRight: 2 }}>{'\u25B2'}</button>
                              <button onClick={() => setAttachRows(p => { const a = [...p]; if (i < a.length - 1) [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a.map((r, j) => ({ ...r, 번호: j + 1 })); })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10 }}>{'\u25BC'}</button>
                            </td>
                            <td style={{ padding: '5px', textAlign: 'center' }}>
                              <button onClick={() => setAttachRows(p => p.filter(r => r.id !== row.id).map((r, j) => ({ ...r, 번호: j + 1 })))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#888' }}>{'\u2715'}</button>
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
                  {['당사자 정보는 주민등록상 정보와 일치해야 하며, 허위 정보 입력 시 법적 책임이 발생할 수 있습니다.', '기일변경신청서는 기일 전까지 제출하시기 바랍니다.'].map((t, i) => (
                    <li key={i} style={{ fontSize: 11, color: '#666', lineHeight: 1.8, paddingLeft: 10, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>•</span>{t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setInputMode(m => m === 'direct' ? 'file' : 'direct')} style={{ height: 32, padding: '0 16px', background: '#fff', border: '1px solid #aaa', color: '#555', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {inputMode === 'direct' ? '파일첨부방식작성' : '직접입력방식작성'}
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
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>민사서류 - 기일변경신청서</span>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                {/* Left: Document list */}
                <div style={{ width: 220, flexShrink: 0, background: '#fff', border: '1px solid #d0d8e4', borderRadius: 2, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, marginBottom: 8, cursor: 'pointer' }}>• 기일변경신청서 📄</div>
                  {attachRows.map(r => (
                    <div key={r.id} style={{ fontSize: 11, color: '#555', padding: '3px 0 3px 12px' }}>• {r.서류명}</div>
                  ))}
                </div>

                {/* Right: Document preview */}
                <div style={{ flex: 1, background: '#fff', border: '1px solid #d0d8e4', borderRadius: 2, padding: '40px 50px', minHeight: 600 }}>
                  {inputMode === 'file' && briefFileName ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                      <div style={{ fontSize: 40, marginBottom: 16 }}>📄</div>
                      <div style={{ fontSize: 14, color: '#333' }}>{briefFileName}</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>파일첨부방식으로 작성된 기일변경신청서입니다.</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 30 }}>기 일 변 경 신 청 서</div>
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

                      <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>신 청 취 지</div>
                      <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 24, whiteSpace: 'pre-wrap' }}>{claimPurpose || '(내용 없음)'}</div>

                      <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>신 청 사 유</div>
                      <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 24, whiteSpace: 'pre-wrap' }}>{claimReason || '(내용 없음)'}</div>

                      <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>희 망 기 일</div>
                      <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 24 }}>
                        {preferredDate1 && <div>1순위: {preferredDate1}</div>}
                        {preferredDate2 && <div>2순위: {preferredDate2}</div>}
                        {preferredDate3 && <div>3순위: {preferredDate3}</div>}
                        {!preferredDate1 && !preferredDate2 && !preferredDate3 && <div style={{ color: '#aaa' }}>(희망기일 없음)</div>}
                      </div>

                      <div style={{ textAlign: 'right', fontSize: 13, marginBottom: 20 }}>{dateStr}</div>
                      <div style={{ textAlign: 'right', fontSize: 13 }}>신청인  {docOwners[0]?.name || user.name}</div>
                      <div style={{ marginBottom: 20 }} />
                      <div style={{ textAlign: 'center', fontSize: 13 }}>{court} 귀중</div>
                    </>
                  )}
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
