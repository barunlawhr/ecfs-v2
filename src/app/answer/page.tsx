'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MockBar from '@/components/layout/MockBar';
import GnbNav from '@/components/layout/GnbNav';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { ComplaintFormData, Evidence, SampleCase, Assignment } from '@/types';

const EMPTY_FORM: ComplaintFormData = {
  doc_type: 'answer',
  caseCategory: '', caseName: '', court: '', claimType: '', sogaType: '', soga: '', caseNumber: '',
  parties: [], claimPurpose: '', claimCause: '',
  hasAgent: false, agentType: undefined, agentName: undefined, evidences: [],
};

const COURTS = [
  '서울중앙지방법원','서울동부지방법원','서울남부지방법원','서울북부지방법원','서울서부지방법원',
  '의정부지방법원','인천지방법원','수원지방법원','춘천지방법원','청주지방법원',
  '대전지방법원','전주지방법원','광주지방법원','부산지방법원','울산지방법원',
  '창원지방법원','대구지방법원','제주지방법원',
];

const CASE_TYPES = ['가단','가합','나','다','라','마','머','카단','카합','타'];

const NAV_SIDEBAR_ITEMS = [
  '소장','답변서','준비서면','소취하서','이의신청서','주소보정서','항소장','개명허가신청서','재산목록보고서','후견사무보고서',
];

// ── Styles ──
const TEAL = '#0098a3';
const INP: React.CSSProperties = { height: 28, padding: '0 7px', border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 12, fontFamily: 'inherit', color: '#222', background: '#fff', outline: 'none', boxSizing: 'border-box' };
const SEL: React.CSSProperties = { ...INP, cursor: 'pointer' };
const TH: React.CSSProperties = { background: '#f5f7fb', width: 120, padding: '9px 12px', fontSize: 12, fontWeight: 600, color: '#333', textAlign: 'left', verticalAlign: 'middle', borderRight: '1px solid #e8edf4', whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: '7px 12px', verticalAlign: 'middle' };

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

interface DocOwner {
  id: string;
  type: string;
  name: string;
  userId: string;
}

export default function AnswerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 사건확인 phase
  const [caseConfirmed, setCaseConfirmed] = useState(false);
  const [caseSearch, setCaseSearch] = useState({
    caseType: '민사',
    court: '',
    year: '2026',
    caseCode: '다',
    caseNum: '',
    sortByName: false,
    partyName: '',
  });

  // 답변서 작성
  const [formData, setFormData] = useState<ComplaintFormData>(EMPTY_FORM);
  const [assignedCase, setAssignedCase] = useState<SampleCase | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRecordId, setSubmittedRecordId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // 섹션 열기/닫기
  const [open, setOpen] = useState({ s1: true, s2: true, s3: true, s4: true, s5: true, s6: true });
  const [activeNav, setActiveNav] = useState('s1');
  const toggle = (key: keyof typeof open) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  // 서류명의인
  const [docOwners, setDocOwners] = useState<DocOwner[]>([]);

  // 입증서류 입력 폼
  const [evForm, setEvForm] = useState({ name: '', purpose: '' });

  // 첨부서류
  const [attachFiles, setAttachFiles] = useState<{ id: string; name: string; file?: File }[]>([]);
  // 입증방법 파일
  const [evFiles, setEvFiles] = useState<{ id: string; name: string; size: number; file?: File }[]>([]);

  // 제출
  const [submitting, setSubmitting] = useState(false);
  const [grading, setGrading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [draftToast, setDraftToast] = useState(false);

  // refs
  const causeRef = useRef<HTMLDivElement>(null);
  const evFileRef = useRef<HTMLInputElement>(null);
  const attachFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  // 배정사건 로드
  useEffect(() => {
    if (!user) return;
    async function loadAssignments() {
      try {
        const res = await fetch(`/api/admin/records?type=assignments&student_id=${user!.id}`);
        if (res.ok) {
          const data = await res.json();
          setAssignments(data.assignments || []);
        }
      } catch { /* ignore */ }
    }
    loadAssignments();
  }, [user]);

  // sessionStorage에서 배정사건 자동 로드
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('assigned_case');
      if (raw) {
        const parsed: SampleCase = JSON.parse(raw);
        sessionStorage.removeItem('assigned_case');
        applyAndConfirm(parsed);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 서류명의인: 로그인 사용자 자동 추가
  useEffect(() => {
    if (user && docOwners.length === 0) {
      setDocOwners([{
        id: crypto.randomUUID(),
        type: '제출인',
        name: user.name,
        userId: user.id,
      }]);
    }
  }, [user, docOwners.length]);

  // Sync contentEditable
  useEffect(() => {
    if (causeRef.current && causeRef.current.innerText !== formData.claimCause) {
      causeRef.current.innerText = formData.claimCause || '';
    }
  }, [formData.claimCause]);

  function upd(partial: Partial<ComplaintFormData>) {
    setFormData(prev => ({ ...prev, ...partial }));
  }

  function applyAndConfirm(sc: SampleCase) {
    setAssignedCase(sc);
    setFormData(prev => ({
      ...prev,
      court: sc.court || '',
      caseCategory: sc.case_type || '',
      caseName: sc.case_type || '',
    }));
    const newParties: { id: string; role: '원고' | '피고'; name: string; addr: string }[] = [];
    if (sc.plaintiff) newParties.push({ id: crypto.randomUUID(), role: '원고', name: sc.plaintiff, addr: '' });
    if (sc.defendant) newParties.push({ id: crypto.randomUUID(), role: '피고', name: sc.defendant, addr: '' });
    if (newParties.length) setFormData(prev => ({ ...prev, parties: newParties }));
    setCaseConfirmed(true);
  }

  function handleCaseConfirm() {
    const match = assignments.find(a => {
      const sc = a.sample_cases;
      if (!sc) return false;
      if (caseSearch.court && sc.court !== caseSearch.court) return false;
      if (caseSearch.partyName) {
        const name = caseSearch.partyName.trim();
        if (name && !sc.plaintiff?.includes(name) && !sc.defendant?.includes(name)) return false;
      }
      return true;
    });

    if (match?.sample_cases) {
      applyAndConfirm(match.sample_cases);
    } else if (caseSearch.court) {
      const caseNum = `${caseSearch.year}${caseSearch.caseCode}${caseSearch.caseNum}`;
      setFormData(prev => ({ ...prev, court: caseSearch.court, caseNumber: caseNum }));
      setCaseConfirmed(true);
    } else {
      alert('법원을 선택해주세요.');
    }
  }

  // ── 입증서류 ──
  const evidencePrefix = '을';
  const nextEvNumber = `${evidencePrefix} 제${formData.evidences.length + 1}호증`;

  function handleAddEvidence() {
    if (!evForm.name.trim()) { alert('서류명을 입력해주세요.'); return; }
    const newEv: Evidence = {
      id: crypto.randomUUID(),
      number: nextEvNumber,
      name: evForm.name.trim(),
      purpose: evForm.purpose.trim(),
    };
    upd({ evidences: [...formData.evidences, newEv] });
    setEvForm({ name: '', purpose: '' });
  }

  function handleDeleteEvidence(id: string) {
    const filtered = formData.evidences.filter(e => e.id !== id);
    const renumbered = filtered.map((e, i) => ({ ...e, number: `${evidencePrefix} 제${i + 1}호증` }));
    upd({ evidences: renumbered });
  }

  // ── 서류명의인 ──
  function handleDeleteDocOwner(id: string) {
    setDocOwners(prev => prev.filter(o => o.id !== id));
  }

  // ── 임시저장 ──
  function saveDraft() {
    try {
      const key = `ecfs_answer_draft_${user?.id}`;
      localStorage.setItem(key, JSON.stringify({ formData, docOwners, assignedCase }));
      setDraftToast(true);
      setTimeout(() => setDraftToast(false), 2000);
    } catch { alert('임시저장에 실패했습니다.'); }
  }

  // ── 작성완료 (제출) ──
  async function handleSubmit() {
    if (!user) return;
    if (!formData.court) { alert('법원을 선택해주세요.'); return; }
    if (!formData.claimPurpose.trim()) { alert('청구취지에 대한 답변을 입력해주세요.'); return; }

    setSubmitting(true);
    setSubmitError('');

    try {
      // 디버그: 필드 매핑 확인
      console.log('[답변서 제출] 필드 매핑 확인:', {
        caseNumber: formData.caseNumber,
        sogaType: formData.sogaType,
        court: formData.court,
        claimPurpose: formData.claimPurpose?.slice(0, 30) + '...',
        claimCause: formData.claimCause?.slice(0, 30) + '...',
      });

      const record = {
        student_id: user.id,
        user_name: user.name,
        doc_type: 'answer',
        case_type: formData.caseCategory || formData.caseName,
        court: formData.court,
        plaintiff: formData.parties.find(p => p.role === '원고')?.name || '',
        defendant: formData.parties.find(p => p.role === '피고')?.name || '',
        has_agent: formData.hasAgent,
        evidence_count: formData.evidences.length,
        score: 0,
        feedback: '채점 중...',
        complaint_data: formData,
        case_id: assignedCase?.id || null,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('practice_records')
        .insert(record)
        .select('id')
        .single();

      if (insertError) throw new Error(insertError.message);
      if (!inserted?.id) throw new Error('제출 기록 생성에 실패했습니다.');
      const recordId: string = inserted.id;

      // 채점
      setGrading(true);
      const mockCase: SampleCase = {
        id: assignedCase?.id || 'mock',
        title: formData.caseName,
        case_type: formData.caseCategory,
        court: formData.court,
        plaintiff: formData.parties.find(p => p.role === '원고')?.name || '원고',
        defendant: formData.parties.find(p => p.role === '피고')?.name || '피고',
        created_at: new Date().toISOString(),
        ...(assignedCase || {}),
      };

      try {
        const gradeRes = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formData, sampleCase: mockCase, doc_type: 'answer' }),
          signal: AbortSignal.timeout(30_000),
        });
        if (gradeRes.ok) {
          const gradeResult = await gradeRes.json();
          if (gradeResult.score != null && !gradeResult.isError) {
            await supabase
              .from('practice_records')
              .update({
                score: gradeResult.score,
                feedback: gradeResult.feedback ?? '',
                grade_breakdown: gradeResult.breakdown ?? null,
                graded_at: new Date().toISOString(),
              })
              .eq('id', recordId);
          }
        }
      } catch { /* 채점 실패해도 제출은 완료 */ }

      setSubmittedRecordId(recordId);
      setSubmitted(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : '제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
      setGrading(false);
    }
  }

  const handleReset = () => {
    setFormData(EMPTY_FORM);
    setAssignedCase(null);
    setSubmitted(false);
    setSubmittedRecordId(null);
    setCaseConfirmed(false);
    setDocOwners([]);
    setAttachFiles([]);
    setSubmitError('');
  };

  function scrollTo(key: string) {
    setActiveNav(key);
    document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading || !user) {
    return (
      <div style={{ fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#666', fontSize: 14 }}>로딩 중...</span>
      </div>
    );
  }

  const SEARCH_SEL: React.CSSProperties = { height: 34, padding: '0 10px', border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 13, fontFamily: 'inherit', color: '#222', background: '#fff', cursor: 'pointer' };
  const SEARCH_INP: React.CSSProperties = { height: 34, padding: '0 10px', border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 13, fontFamily: 'inherit', color: '#222', background: '#fff' };

  // ── 사건확인 Phase ──
  if (!caseConfirmed) {
    return (
      <div style={{ margin: 0, padding: 0, fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f2f5' }}>
        <MockBar />
        <GnbNav active="서류제출" />

        <div style={{ background: '#f7f9fc', borderBottom: '1px solid #e2e6ea' }}>
          <div style={{ maxWidth: 1160, margin: '0 auto', padding: '8px 20px', fontSize: 12, color: '#888', display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
            <span>홈</span><span>›</span><span>나홀로소송</span><span>›</span><span>소송서류작성</span><span>›</span>
            <span style={{ color: '#003087', fontWeight: 700 }}>답변서</span>
          </div>
        </div>

        <div style={{ flex: 1, maxWidth: 1160, margin: '0 auto', width: '100%', padding: '0 20px', display: 'flex', gap: 0, alignItems: 'flex-start' }}>
          {/* 좌측 사이드바 */}
          <div style={{ width: 180, flexShrink: 0, marginTop: 20 }}>
            <div style={{ background: '#1a4ea0', color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 0', textAlign: 'center', borderRadius: '6px 6px 0 0' }}>
              나홀로소송
            </div>
            <div style={{ border: '1px solid #dde3ed', borderTop: 'none', background: '#fff', borderRadius: '0 0 6px 6px' }}>
              <div style={{ padding: '10px 16px', fontSize: 13, color: '#555', borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                <span>나홀로소송 도움말</span><span style={{ fontSize: 11 }}>∨</span>
              </div>
              <div style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#1a4ea0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                <span>소송서류작성</span><span style={{ fontSize: 11 }}>∧</span>
              </div>
              {NAV_SIDEBAR_ITEMS.map(item => (
                <div
                  key={item}
                  style={{
                    padding: '7px 16px 7px 26px', fontSize: 12, cursor: 'pointer',
                    color: item === '답변서' ? '#0067c2' : '#444',
                    fontWeight: item === '답변서' ? 700 : 400,
                    background: item === '답변서' ? '#e8f0fb' : 'transparent',
                    borderLeft: item === '답변서' ? '3px solid #0067c2' : '3px solid transparent',
                  }}
                >
                  · {item}
                </div>
              ))}
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div style={{ flex: 1, padding: '20px 32px', minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 14, borderBottom: '1px solid #dde3ed' }}>
              <span style={{ color: '#0067c2', fontSize: 16 }}>●</span> 나홀로소송 (답변서)
            </h1>

            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0067c2', margin: '0 0 8px' }}>사건확인</h2>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>
              대상 사건을 검색하시고 기본정보를 확인하신 후 작성하시기 바랍니다.
            </p>

            {assignments.length > 0 && (
              <div style={{ background: '#f0f7ff', border: '1px solid #c5d8f6', borderRadius: 6, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#1e40af' }}>
                <strong>배정된 사건 바로 선택:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {assignments.map(a => (
                    <button
                      key={a.id}
                      onClick={() => a.sample_cases && applyAndConfirm(a.sample_cases)}
                      style={{ padding: '6px 14px', background: '#fff', border: '1px solid #b0c8e8', borderRadius: 4, fontSize: 12, cursor: 'pointer', color: '#1a3a6b', fontFamily: 'inherit' }}
                    >
                      {a.sample_cases?.title || a.sample_cases?.case_type} ({a.sample_cases?.court})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: '#fff', border: '1px solid #dde3ed', borderRadius: 6, padding: '24px 32px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px 0', width: 100, fontSize: 13, color: '#333', fontWeight: 600 }}>소송유형</td>
                    <td style={{ padding: '10px 0' }}>
                      <select value={caseSearch.caseType} onChange={e => setCaseSearch(p => ({ ...p, caseType: e.target.value }))} style={{ ...SEARCH_SEL, width: 220 }}>
                        <option value="민사">민사</option>
                        <option value="가사">가사</option>
                        <option value="행정">행정</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 0', fontSize: 13, color: '#333', fontWeight: 600 }}>법원</td>
                    <td style={{ padding: '10px 0' }}>
                      <select value={caseSearch.court} onChange={e => setCaseSearch(p => ({ ...p, court: e.target.value }))} style={{ ...SEARCH_SEL, width: 220 }}>
                        <option value="">-- 법원 선택 --</option>
                        {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 0', fontSize: 13, color: '#333', fontWeight: 600 }}>사건번호</td>
                    <td style={{ padding: '10px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select value={caseSearch.year} onChange={e => setCaseSearch(p => ({ ...p, year: e.target.value }))} style={{ ...SEARCH_SEL, width: 80 }}>
                        {[2026,2025,2024,2023,2022].map(y => <option key={y} value={String(y)}>{y}</option>)}
                      </select>
                      <select value={caseSearch.caseCode} onChange={e => setCaseSearch(p => ({ ...p, caseCode: e.target.value }))} style={{ ...SEARCH_SEL, width: 70 }}>
                        {CASE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input
                        value={caseSearch.caseNum}
                        onChange={e => setCaseSearch(p => ({ ...p, caseNum: e.target.value.replace(/[^0-9]/g, '') }))}
                        placeholder=""
                        style={{ ...SEARCH_INP, width: 120 }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td />
                    <td style={{ padding: '4px 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#555', cursor: 'pointer' }}>
                        <input type="checkbox" checked={caseSearch.sortByName} onChange={e => setCaseSearch(p => ({ ...p, sortByName: e.target.checked }))} />
                        사건구분 가나다순 정렬
                      </label>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 0', fontSize: 13, color: '#333', fontWeight: 600 }}>당사자명</td>
                    <td style={{ padding: '10px 0' }}>
                      <input
                        value={caseSearch.partyName}
                        onChange={e => setCaseSearch(p => ({ ...p, partyName: e.target.value }))}
                        style={{ ...SEARCH_INP, width: 220 }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', borderRadius: 6, padding: '20px 24px', marginTop: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', margin: '0 0 10px' }}>유의사항</h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#555', lineHeight: 2 }}>
                <li>이 화면은 단순히 서류작성 편의를 제공하는 화면에 불과하므로, 작성한 서류는 프린터로 출력하여 법원에 방문하여 직접 제출하거나 우편제출 또는 전자소송포털의 [서류제출]기능을 통하여 전자제출을 하는 등 <strong style={{ color: '#c00' }}>반드시 별도의 법원 접수 절차가 필요</strong>합니다.</li>
                <li>본 작성화면에서 제공하는 서비스는 나홀로 소송인이 소송서류를 보다 쉽게 작성할 수 있도록 지원하는 서비스에 불과하므로 이를 통해 작성된 서류의 소송 결과에 대해서 법원은 법적책임을 지지 않습니다.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={handleCaseConfirm} style={{ padding: '10px 40px', background: '#1a4ea0', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                확인
              </button>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // ── 제출 완료 ──
  if (submitted) {
    return (
      <div style={{ margin: 0, padding: 0, fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#eef0f3', fontSize: 13 }}>
        <MockBar />
        <GnbNav active="서류제출" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', border: '1px solid #dde1e7', borderRadius: 8, padding: '48px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 560 }}>
            <div style={{ fontSize: 64 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#1a3a6b', margin: 0 }}>답변서 제출이 완료되었습니다!</h2>
            <div style={{ background: '#f0f7ff', border: '1px solid #c5d8f6', borderRadius: 6, padding: '14px 20px', maxWidth: 440, fontSize: 13, color: '#2952a3', lineHeight: 1.6 }}>
              채점 결과는 <strong>나의전자소송 &gt; 나의 실습기록</strong>에서 확인하세요.
              {submittedRecordId && <span style={{ display: 'block', marginTop: 6, color: '#888', fontSize: 12 }}>기록 ID: {submittedRecordId}</span>}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button onClick={() => router.push('/mypage')} style={{ background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 22px', fontSize: 14, cursor: 'pointer', fontWeight: 'bold' }}>나의 실습기록 확인하기</button>
              <button onClick={handleReset} style={{ background: '#fff', color: '#1a3a6b', border: '1px solid #1a3a6b', borderRadius: 4, padding: '10px 22px', fontSize: 14, cursor: 'pointer' }}>새 답변서 작성하기</button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── 답변서 작성 Phase (사이드바 + 섹션) ──
  const sideItems = [
    { key: 's1', label: '사건기본정보' },
    { key: 's2', label: '청구취지에 대한 답변' },
    { key: 's3', label: '청구원인에 대한 답변' },
    { key: 's4', label: '서류명의인' },
    { key: 's5', label: '입증방법' },
    { key: 's6', label: '첨부서류' },
  ];

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#eef0f3', fontSize: 13 }}>
      <MockBar />
      <GnbNav active="서류제출" />

      {/* 사건확인 완료 바 */}
      <div style={{ background: '#e8f4fb', borderBottom: '1px solid #b0d0eb' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '8px 20px', fontSize: 12, color: '#1a4a6b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            ✔ 사건확인 완료 — {formData.court} {formData.caseNumber || ''} {assignedCase ? `(${assignedCase.title || assignedCase.case_type})` : ''}
          </span>
          <button onClick={() => setCaseConfirmed(false)} style={{ background: 'none', border: '1px solid #8ab8d8', borderRadius: 3, padding: '2px 10px', fontSize: 11, color: '#1a4a6b', cursor: 'pointer', fontFamily: 'inherit' }}>
            사건 재검색
          </button>
        </div>
      </div>

      {/* Page body */}
      <div style={{ flex: 1, display: 'flex', maxWidth: 1160, margin: '0 auto', width: '100%', padding: '14px 10px 60px', boxSizing: 'border-box', gap: 12, alignItems: 'flex-start' }}>

        {/* ── Left Sidebar ── */}
        <div style={{ width: 172, flexShrink: 0 }}>
          <div style={{ background: TEAL, color: '#fff', padding: '9px 14px', fontWeight: 700, fontSize: 13, borderRadius: '3px 3px 0 0' }}>서류작성</div>
          <div style={{ border: '1px solid #c8d4dc', borderTop: 'none', background: '#fff', borderRadius: '0 0 3px 3px', overflow: 'hidden' }}>
            <div style={{ background: '#e6f7f8', borderBottom: '1px solid #c8dde0', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: TEAL, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>1</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>문서작성</span>
            </div>
            {sideItems.map(item => (
              <div key={item.key} onClick={() => scrollTo(item.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px 5px 26px', cursor: 'pointer', background: activeNav === item.key ? '#f0fafa' : '#fff', color: activeNav === item.key ? TEAL : '#555', fontSize: 11, borderBottom: '1px solid #edf0f3' }}
                onMouseEnter={e => { if (activeNav !== item.key) e.currentTarget.style.background = '#f8fafb'; }}
                onMouseLeave={e => { if (activeNav !== item.key) e.currentTarget.style.background = '#fff'; }}>
                <span style={{ color: activeNav === item.key ? TEAL : '#bbb', fontSize: 9 }}>▸</span>
                {item.label}
              </div>
            ))}
            {[['2','최종문서확인'],['3','전자서명'],['4','소송비용납부'],['5','전자제출']].map(([num, label]) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderBottom: '1px solid #e8ecf0', background: '#fff' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#c8d4dc', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{num}</div>
                <span style={{ fontSize: 12, color: '#999' }}>{label}</span>
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
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>민사서류 - 답변서</span>
              {assignedCase && <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>배정: {assignedCase.title}</span>}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={() => setOpen({ s1:true,s2:true,s3:true,s4:true,s5:true,s6:true })} style={{ height: 26, padding: '0 10px', border: '1px solid #b8c4cc', borderRadius: 2, background: '#fff', color: '#555', fontSize: 11, cursor: 'pointer' }}>전체열기 ▼</button>
              <button onClick={() => setOpen({ s1:false,s2:false,s3:false,s4:false,s5:false,s6:false })} style={{ height: 26, padding: '0 10px', border: '1px solid #b8c4cc', borderRadius: 2, background: '#fff', color: '#555', fontSize: 11, cursor: 'pointer' }}>전체닫기 ▲</button>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#e53e3e', marginBottom: 6 }}>* 필수입력사항</div>

          {/* ① 사건기본정보 */}
          <div id="sec-s1" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="① 사건기본정보" open={open.s1} toggle={() => toggle('s1')} />
            {open.s1 && (
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                      <th style={TH}>사건명<span style={{ color: '#e53e3e' }}>*</span></th>
                      <td style={TD}>
                        <input type="text" value={formData.caseCategory || formData.caseName} onChange={e => upd({ caseCategory: e.target.value, caseName: e.target.value })} placeholder="예: 대여금, 손해배상(기)" style={{ ...INP, width: 360 }} />
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                      <th style={TH}>법원<span style={{ color: '#e53e3e' }}>*</span></th>
                      <td style={TD}>
                        <select value={formData.court} onChange={e => upd({ court: e.target.value })} style={{ ...SEL, width: 260 }}>
                          <option value="">-- 법원 선택 --</option>
                          {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                      <th style={TH}>사건번호</th>
                      <td style={TD}>
                        <input type="text" value={formData.caseNumber} onChange={e => upd({ caseNumber: e.target.value })} placeholder="예: 2024가단12345" style={{ ...INP, width: 300 }} />
                      </td>
                    </tr>
                  </tbody>
                </table>
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
                      <th style={{ ...TH, verticalAlign: 'top', paddingTop: 14, width: 130, lineHeight: 1.6 }}>청구취지에 대한<br/>답변 <span style={{ color: '#e53e3e' }}>*</span><br/><span style={{ fontSize: 10, color: '#888' }}>ⓘ</span></th>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: '#888' }}>( {new TextEncoder().encode(formData.claimPurpose || '').length} / 6000 Bytes )</span>
                        </div>
                        <textarea
                          value={formData.claimPurpose}
                          onChange={e => upd({ claimPurpose: e.target.value })}
                          placeholder={`1. 원고의 청구를 기각한다.\n2. 소송비용은 원고가 부담한다.\n라는 판결을 구합니다.`}
                          style={{ width: '100%', minHeight: 120, padding: '8px 10px', border: '2px solid #222', fontSize: 13, lineHeight: 1.7, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button style={{ height: 36, padding: '0 24px', border: 'none', borderRadius: 3, background: '#1a3a6b', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>✎ 등록</button>
                </div>
              </div>
            )}
          </div>

          {/* ③ 청구원인에 대한 답변 */}
          <div id="sec-s3" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="③ 청구원인에 대한 답변" open={open.s3} toggle={() => toggle('s3')} />
            {open.s3 && (
              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ borderBottom: '3px solid #1a3a6b', marginBottom: 12 }} />
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                  <tbody>
                    <tr>
                      <th style={{ ...TH, verticalAlign: 'top', paddingTop: 14, width: 130, lineHeight: 1.6 }}>청구원인에 대한<br/>답변 <span style={{ color: '#e53e3e' }}>*</span><br/><span style={{ fontSize: 10, color: '#888' }}>ⓘ</span></th>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer' }}>
                            <input type="radio" name="causeInput2" defaultChecked style={{ accentColor: '#1a3a6b' }} /> ◉ 직접입력
                          </label>
                        </div>
                        <div style={{ border: '1px solid #c8cdd6' }}>
                          <div style={{ background: '#f0f3f8', borderBottom: '1px solid #dde0e6', padding: '3px 6px', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            {['📄','🔍','✂','📋','📑','🗑'].map((ic, i) => <button key={i} style={{ height: 24, minWidth: 24, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 12, cursor: 'pointer' }}>{ic}</button>)}
                            <span style={{ width: 1, height: 16, background: '#c8cdd6', margin: '0 3px' }} />
                            <button style={{ height: 24, minWidth: 24, border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 12, cursor: 'pointer' }}>↩</button>
                            <button style={{ height: 24, minWidth: 24, border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 12, cursor: 'pointer' }}>↪</button>
                            <span style={{ width: 1, height: 16, background: '#c8cdd6', margin: '0 3px' }} />
                            <button style={{ height: 24, minWidth: 24, border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'serif' }}>B</button>
                            <button style={{ height: 24, minWidth: 24, border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 13, cursor: 'pointer', fontStyle: 'italic', fontFamily: 'serif' }}>I</button>
                            <button style={{ height: 24, minWidth: 24, border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>U</button>
                            <span style={{ width: 1, height: 16, background: '#c8cdd6', margin: '0 3px' }} />
                            <button style={{ height: 24, padding: '0 4px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 12, cursor: 'pointer' }}>≡</button>
                            <button style={{ height: 24, padding: '0 4px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 12, cursor: 'pointer' }}>☰</button>
                            <button style={{ height: 24, padding: '0 4px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 12, cursor: 'pointer' }}>≣</button>
                            <span style={{ width: 1, height: 16, background: '#c8cdd6', margin: '0 3px' }} />
                            <button style={{ height: 24, padding: '0 4px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#e53e3e' }}>A·</button>
                            <button style={{ height: 24, padding: '0 4px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 12, cursor: 'pointer' }}>A·</button>
                          </div>
                          <div style={{ background: '#f5f7fb', borderBottom: '1px solid #dde0e6', padding: '3px 6px', display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: '#555' }}>
                            <span>글꼴</span><select style={{ height: 22, fontSize: 11, border: '1px solid #c8cdd6', borderRadius: 2, padding: '0 4px' }}><option>글꼴</option></select><span>·</span><span>크기</span><select style={{ height: 22, fontSize: 11, border: '1px solid #c8cdd6', borderRadius: 2, padding: '0 4px' }}><option>크기</option></select><span>·</span>
                          </div>
                          <div style={{ background: '#e8f4fd', borderBottom: '1px solid #c8dff0', padding: '5px 10px', fontSize: 11, color: '#1a6fa8' }}>ℹ 편집기에 대한 도움말은 ALT + 숫자 0(언어 자판 위 숫자키)를 누르세요</div>
                          <div ref={causeRef} contentEditable suppressContentEditableWarning onInput={e => upd({ claimCause: (e.target as HTMLDivElement).innerText })} data-placeholder="청구원인에 대한 답변 내용을 입력하세요. 2000자 이내, 표나 그림은 내용파일첨부를 이용)" style={{ minHeight: 180, padding: '10px 12px', fontSize: 13, fontFamily: "'맑은 고딕', sans-serif", lineHeight: 1.8, outline: 'none', background: '#fff', color: '#222' }} />
                          <style>{`[data-placeholder]:empty:before{content:attr(data-placeholder);color:#bbb;pointer-events:none}`}</style>
                          <div style={{ background: '#f7f8fb', borderTop: '1px solid #e5e8ee', padding: '4px 10px', textAlign: 'right', fontSize: 11, color: '#888' }}>글자: {(formData.claimCause || '').length}/2000</div>
                        </div>
                        <div style={{ marginTop: 10 }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer' }}>
                            <input type="radio" name="causeInput2" style={{ accentColor: '#1a3a6b' }} /> ○ 내용파일 첨부
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <button style={{ height: 28, padding: '0 14px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 12, cursor: 'pointer', color: '#333' }}>📎 내용파일첨부하기</button>
                          </div>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 11, color: '#00a99d', lineHeight: 1.7 }}>※ 첨부가능한 파일 형식 : HWP, HWPX, DOC, DOCX, PDF, TXT, BMP, JPG, JPEG, GIF, TIF, TIFF, PNG (PDF파일로 자동변환, 20MB까지 첨부가능)</div>
                        {assignedCase?.key_facts && (
                          <div style={{ marginTop: 12, border: '1px solid #d1d5db', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ padding: '8px 12px', backgroundColor: '#f3f4f6', fontSize: 12 }}><span style={{ fontWeight: 600, color: '#374151' }}>참고 사실관계 (원고 주장)</span></div>
                            <div style={{ padding: '10px 12px', fontSize: 12, lineHeight: 1.8, color: '#374151', backgroundColor: '#fafafa', whiteSpace: 'pre-wrap' }}>{assignedCase.key_facts}</div>
                          </div>
                        )}
                        <div style={{ marginTop: 6, fontSize: 11, color: '#555', lineHeight: 1.7 }}>※ 청구원인에 대한 답변은 원고 주장의 사실관계에 대하여 인정 여부 및 반박 사유를 구체적으로 작성하시기 바랍니다.</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button style={{ height: 36, padding: '0 24px', border: 'none', borderRadius: 3, background: '#1a3a6b', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>✎ 등록</button>
                </div>
              </div>
            )}
          </div>

          {/* ④ 서류명의인 */}
          <div id="sec-s4" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="④ 서류명의인" open={open.s4} toggle={() => toggle('s4')} />
            {open.s4 && (
              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>• 서류명의인</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f5f7fb' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 700, borderBottom: '2px solid #1a3a6b', textAlign: 'center', width: '40%' }}>구분</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, borderBottom: '2px solid #1a3a6b', textAlign: 'center' }}>이름 (사용자아이디)</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, borderBottom: '2px solid #1a3a6b', textAlign: 'center', width: 60 }}>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docOwners.length === 0 ? (
                      <tr><td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: '#999' }}>서류명의인이 없습니다.</td></tr>
                    ) : (
                      docOwners.map(owner => (
                        <tr key={owner.id} style={{ borderBottom: '1px solid #eaecf4' }}>
                          <td style={{ padding: '9px 12px', borderRight: '1px solid #eaecf4' }}>
                            <input type="text" defaultValue={owner.type} style={{ width: '100%', border: '1px solid #d0d8e4', borderRadius: 2, padding: '4px 8px', fontSize: 12, boxSizing: 'border-box' }} />
                          </td>
                          <td style={{ padding: '9px 12px', borderRight: '1px solid #eaecf4' }}>{owner.name} ({owner.userId})</td>
                          <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                            <button onClick={() => handleDeleteDocOwner(owner.id)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#999' }}>⊗</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div style={{ fontSize: 12, color: '#555', marginTop: 8 }}>총 {docOwners.length} 명</div>
                <div style={{ borderTop: '2px dashed #d0d8e4', marginTop: 12 }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button style={{ height: 36, padding: '0 24px', border: 'none', borderRadius: 3, background: '#1a3a6b', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>✎ 등록</button>
                </div>
              </div>
            )}
          </div>

          {/* ⑤ 입증방법 */}
          <div id="sec-s5" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="⑤ 입증방법" open={open.s5} toggle={() => toggle('s5')} />
            {open.s5 && (
              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 10, lineHeight: 1.7 }}>
                  <div>• 입증서류(증거)는 단순한 첨부서류와 구분하여 제출하여야 하며, 첨부서류는 별도의 파일로 다음 단계에서 제출하시기 바랍니다.</div>
                  <div style={{ color: '#e53e3e' }}>• 1개의 파일에 여러 개의 입증서류가 있는 경우에는 아래 입증서류목록 {'>'} [입증서류분리] 버튼을 클릭한 후 서증명별로 서증부호를 부여하여 입증서류를 제출하시기 바랍니다.</div>
                </div>
                {/* 파일첨부 영역 */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }}>
                  <tbody>
                    <tr>
                      <th style={{ ...TH, verticalAlign: 'top', paddingTop: 14, width: 120, lineHeight: 1.6 }}>파일첨부 <span style={{ color: '#e53e3e' }}>*</span> <span style={{ fontSize: 10, color: '#888' }}>ⓘ</span></th>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 6 }}>
                          <button onClick={() => evFileRef.current?.click()} style={{ height: 28, padding: '0 12px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>📎 파일찾기</button>
                          <button style={{ height: 28, padding: '0 12px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>🗑 삭제</button>
                          <input ref={evFileRef} type="file" style={{ display: 'none' }} accept=".hwp,.hwpx,.doc,.docx,.pdf,.txt,.bmp,.jpg,.jpeg,.gif,.tif,.tiff,.png" onChange={e => { const f = e.target.files?.[0]; if (f) setEvFiles(prev => [...prev, { id: crypto.randomUUID(), name: f.name, size: f.size, file: f }]); e.target.value = ''; }} />
                        </div>
                        {/* 파일 목록 테이블 */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 11, marginBottom: 8 }}>
                          <thead><tr style={{ background: '#f5f7fb' }}>
                            <th style={{ padding: '6px 8px', borderBottom: '1px solid #d0d8e4', width: 30 }}>☐</th>
                            <th style={{ padding: '6px 8px', borderBottom: '1px solid #d0d8e4', textAlign: 'center' }}>파일명</th>
                            <th style={{ padding: '6px 8px', borderBottom: '1px solid #d0d8e4', textAlign: 'center', width: 80 }}>파일크기</th>
                            <th style={{ padding: '6px 8px', borderBottom: '1px solid #d0d8e4', textAlign: 'center', width: 60 }}>순서변경</th>
                            <th style={{ padding: '6px 8px', borderBottom: '1px solid #d0d8e4', textAlign: 'center', width: 40 }}>삭제</th>
                          </tr></thead>
                          <tbody>
                            {(evFiles || []).length === 0 ? (
                              <tr><td colSpan={5} style={{ padding: 12, textAlign: 'center', color: '#999' }}></td></tr>
                            ) : (evFiles || []).map((f: {id:string;name:string;size:number}) => (
                              <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>☐</td>
                                <td style={{ padding: '6px 8px' }}>{f.name}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{(f.size / 1024).toFixed(2)} KB</td>
                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>▲ ▼</td>
                                <td style={{ padding: '6px 8px', textAlign: 'center' }}><button onClick={() => setEvFiles(prev => prev.filter(x => x.id !== f.id))} style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: '#999' }}>⊗</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {/* 드래그앤드롭 영역 */}
                        <div style={{ border: '2px dashed #d0d8e4', borderRadius: 4, padding: '24px 20px', textAlign: 'center', background: '#fafbfe' }}>
                          <div style={{ fontSize: 28, opacity: 0.4, marginBottom: 4 }}>🎵 🖼 📄 ▶ ⚙</div>
                          <div style={{ fontSize: 14, color: '#00a99d', fontWeight: 700, letterSpacing: 2 }}>DRAG & DROP</div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ fontSize: 11, color: '#e53e3e', marginTop: 6, lineHeight: 1.7 }}>※ 파일첨부가 완료되면 [목록에 추가]버튼을 눌러 첨부파일을 입증서류목록에 추가할 수 있습니다.</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button style={{ height: 30, padding: '0 16px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>목록에 추가</button>
                </div>

                {/* 입증서류목록 */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>• 입증서류목록</span>
                      <span style={{ fontSize: 10, color: '#888' }}>ⓘ</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button style={{ height: 26, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer' }}>📎 전자발급 서류 첨부하기</button>
                      <button style={{ height: 26, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer' }}>서증등목록삭제</button>
                      <button style={{ height: 26, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer' }}>서증등목록조회</button>
                      <button style={{ height: 26, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer' }}>📎 서증입력파일 등록</button>
                    </div>
                  </div>
                  {/* 표시기준 안내 */}
                  <div style={{ background: '#fef9ef', border: '1px solid #f5e6c8', borderRadius: 4, padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 10, fontSize: 11, lineHeight: 1.7 }}>
                    <span style={{ fontSize: 28, opacity: 0.5 }}>📋</span>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>표시기준</div>
                      <div>• 제출자가 사건의 원고일 경우 &apos;갑호증&apos;, 피고일 경우 &apos;을호증&apos;으로 제출하시기 바랍니다.</div>
                      <div>• 본소가 소취하되어 병합 분리된 반소사건의 경우 반소원고는 &apos;을호증&apos;, 반소피고는 &apos;갑호증&apos;으로 제출하시기 바랍니다.</div>
                      <div>• 독립당사자 참가인은 &apos;병호증&apos;으로 제출하시기 바랍니다.</div>
                    </div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 11 }}>
                    <thead><tr style={{ background: '#f5f7fb' }}>
                      {['☐','서증부호 *','가지부호','서증번호 *','가지번호','서류명 *','파일명','페이지번호','입증취지 등','삭제'].map(h => (
                        <th key={h} style={{ padding: '7px 6px', fontWeight: 700, borderBottom: '2px solid #1a3a6b', textAlign: 'center', whiteSpace: 'nowrap', fontSize: 10 }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {formData.evidences.length === 0 ? (
                        <tr><td colSpan={10} style={{ padding: 16, textAlign: 'center', color: '#999' }}>등록된 입증서류가 없습니다.</td></tr>
                      ) : formData.evidences.map(ev => (
                        <tr key={ev.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '5px 4px', textAlign: 'center' }}>☐</td>
                          <td style={{ padding: '5px 4px', textAlign: 'center' }}>{ev.number?.replace(/[0-9]/g,'')}</td>
                          <td style={{ padding: '5px 4px', textAlign: 'center' }}>-</td>
                          <td style={{ padding: '5px 4px', textAlign: 'center' }}>{ev.number?.replace(/[^0-9]/g,'')}</td>
                          <td style={{ padding: '5px 4px', textAlign: 'center' }}>-</td>
                          <td style={{ padding: '5px 4px' }}>{ev.name}</td>
                          <td style={{ padding: '5px 4px', color: '#888' }}>-</td>
                          <td style={{ padding: '5px 4px', textAlign: 'center' }}>-</td>
                          <td style={{ padding: '5px 4px', color: '#555' }}>{ev.purpose || '-'}</td>
                          <td style={{ padding: '5px 4px', textAlign: 'center' }}><button onClick={() => handleDeleteEvidence(ev.id)} style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: '#999' }}>⊗</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 12 }}>
                    <span>총 {formData.evidences.length}건</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}><input type="checkbox" defaultChecked style={{ accentColor: '#1a3a6b' }} /> 가지번호로 분리</label>
                      <span style={{ fontSize: 11 }}>분리방법</span>
                      <select style={{ height: 24, fontSize: 11, border: '1px solid #c8cdd6', borderRadius: 2 }}><option>서류개수</option></select>
                      <input type="text" style={{ height: 24, width: 40, border: '1px solid #c8cdd6', borderRadius: 2, padding: '0 4px', fontSize: 11 }} />
                      <button style={{ height: 26, padding: '0 12px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 2, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>입증서류분리</button>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#e53e3e', marginTop: 8, lineHeight: 1.7 }}>
                  ※ 입증서류목록에 서증파일들을 추가한 후 서증분리, 서류명 수정등 수정할 사항이 많은 경우 입력편의를 위하여 <strong>[서증입력파일 등록]</strong>기능을 활용하여 서증목록을 수정할 수 있습니다.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button style={{ height: 36, padding: '0 24px', border: 'none', borderRadius: 3, background: '#1a3a6b', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>✎ 등록</button>
                </div>
              </div>
            )}
          </div>

          {/* ⑥ 첨부서류 */}
          <div id="sec-s6" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="⑥ 첨부서류" open={open.s6} toggle={() => toggle('s6')} />
            {open.s6 && (
              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 10, lineHeight: 1.7 }}>
                  • 첨부서류로 제출한 문서는 증거로 사용될 수 없으며, 판결(결정) 등에 효력이 없습니다.
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }}>
                  <tbody>
                    <tr>
                      <th style={{ ...TH, verticalAlign: 'top', paddingTop: 14, width: 120, lineHeight: 1.6 }}>서류명 <span style={{ color: '#e53e3e' }}>*</span> <span style={{ fontSize: 10, color: '#888' }}>ⓘ</span></th>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                          <select style={{ height: 30, border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 12, padding: '0 8px', minWidth: 160 }}>
                            <option>직접입력</option>
                            <option>법인등기사항증명서</option>
                            <option>주민등록등본</option>
                            <option>소송위임장</option>
                            <option>담당변호사지정서</option>
                            <option>소가계산서</option>
                          </select>
                          <input type="text" placeholder="" style={{ height: 30, border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 12, padding: '0 8px', flex: 1 }} />
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, whiteSpace: 'nowrap' }}>☐ 파일명과 동일</label>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <th style={{ ...TH, verticalAlign: 'top', paddingTop: 14, width: 120, lineHeight: 1.6 }}>파일첨부 <span style={{ color: '#e53e3e' }}>*</span> <span style={{ fontSize: 10, color: '#888' }}>ⓘ</span></th>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 6 }}>
                          <button onClick={() => attachFileRef.current?.click()} style={{ height: 28, padding: '0 12px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>📎 파일찾기</button>
                          <button style={{ height: 28, padding: '0 12px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>🗑 삭제</button>
                          <input ref={attachFileRef} type="file" style={{ display: 'none' }} accept=".hwp,.hwpx,.doc,.docx,.pdf,.txt,.bmp,.jpg,.jpeg,.gif,.tif,.tiff,.png" onChange={e => { const f = e.target.files?.[0]; if (f) setAttachFiles(prev => [...prev, { id: crypto.randomUUID(), name: f.name, file: f }]); e.target.value = ''; }} />
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 11, marginBottom: 8 }}>
                          <thead><tr style={{ background: '#f5f7fb' }}>
                            <th style={{ padding: '6px', borderBottom: '1px solid #d0d8e4', textAlign: 'center' }}>파일명</th>
                            <th style={{ padding: '6px', borderBottom: '1px solid #d0d8e4', textAlign: 'center', width: 80 }}>파일크기</th>
                            <th style={{ padding: '6px', borderBottom: '1px solid #d0d8e4', textAlign: 'center', width: 60 }}>순서변경</th>
                            <th style={{ padding: '6px', borderBottom: '1px solid #d0d8e4', textAlign: 'center', width: 40 }}>삭제</th>
                          </tr></thead>
                          <tbody>
                            {attachFiles.length === 0 ? (
                              <tr><td colSpan={4} style={{ padding: 12, textAlign: 'center', color: '#999' }}>조회된 결과가 없습니다.</td></tr>
                            ) : attachFiles.map(f => (
                              <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '6px 8px' }}>{f.name}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right' }}>-</td>
                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>▲ ▼</td>
                                <td style={{ padding: '6px 8px', textAlign: 'center' }}><button onClick={() => setAttachFiles(prev => prev.filter(x => x.id !== f.id))} style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: '#999' }}>⊗</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ border: '2px dashed #d0d8e4', borderRadius: 4, padding: '24px 20px', textAlign: 'center', background: '#fafbfe' }}>
                          <div style={{ fontSize: 28, opacity: 0.4, marginBottom: 4 }}>🎵 🖼 📄 ▶ ⚙</div>
                          <div style={{ fontSize: 14, color: '#00a99d', fontWeight: 700, letterSpacing: 2 }}>DRAG & DROP</div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ fontSize: 11, color: '#e53e3e', marginTop: 6, lineHeight: 1.7 }}>※ 첨부할 파일을 등록 후 반드시 [목록에 추가]버튼을 눌러 첨부서류 목록에 추가하시기 바랍니다.</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button style={{ height: 30, padding: '0 16px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>목록에 추가</button>
                </div>

                {/* 첨부서류목록 */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>• 첨부서류목록</span>
                    <button style={{ height: 26, padding: '0 12px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer' }}>📎 전자발급 서류 첨부하기</button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 11 }}>
                    <thead><tr style={{ background: '#f5f7fb' }}>
                      {['번호','서류명 *','파일명','등록일','순서변경','삭제'].map(h => (
                        <th key={h} style={{ padding: '7px 8px', fontWeight: 700, borderBottom: '2px solid #1a3a6b', textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {attachFiles.length === 0 ? (
                        <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#999' }}>조회된 결과가 없습니다.</td></tr>
                      ) : attachFiles.map((f, i) => (
                        <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>{i + 1}</td>
                          <td style={{ padding: '6px 8px' }}><input type="text" defaultValue={f.name.replace(/\.[^.]+$/, '')} style={{ border: '1px solid #d0d8e4', borderRadius: 2, padding: '3px 6px', fontSize: 11, width: '100%', boxSizing: 'border-box' }} /></td>
                          <td style={{ padding: '6px 8px', color: '#0067c2' }}>{f.name}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>{new Date().toLocaleDateString('ko-KR')}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>▲ ▼</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}><button onClick={() => setAttachFiles(prev => prev.filter(x => x.id !== f.id))} style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: '#999' }}>⊗</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>총 {attachFiles.length} 건</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button style={{ height: 36, padding: '0 24px', border: 'none', borderRadius: 3, background: '#1a3a6b', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>✎ 등록</button>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {submitError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 3, padding: '10px 14px', color: '#dc2626', fontSize: 12, marginBottom: 10 }}>⚠️ {submitError}</div>
          )}

          {/* Bottom buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ height: 32, padding: '0 16px', background: '#fff', border: '1px solid #999', color: '#555', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                파일첨부방식작성
              </button>
              <button onClick={saveDraft} style={{ height: 32, padding: '0 16px', background: '#fff', border: `1px solid ${TEAL}`, color: TEAL, borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                임시저장
              </button>
            </div>
            <button onClick={handleSubmit} disabled={submitting} style={{ height: 34, padding: '0 24px', background: submitting ? '#7ab8bd' : TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {submitting ? (grading ? '🤖 AI 채점 중...' : '⏳ 제출 중...') : '작성완료 →'}
            </button>
          </div>
        </div>
      </div>

      {draftToast && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, background: '#1a3a6b', color: '#fff', padding: '10px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: '0 2px 12px rgba(0,0,0,.3)' }}>
          ✓ 임시저장되었습니다
        </div>
      )}
      <Footer />
    </div>
  );
}
