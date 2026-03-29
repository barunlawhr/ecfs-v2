'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MockBar from '@/components/layout/MockBar';
import GnbNav from '@/components/layout/GnbNav';
import Footer from '@/components/layout/Footer';
import StepBar from '@/components/apply/StepBar';
import Step1Consent from '@/components/apply/Step1Consent';
import Step2Parties from '@/components/apply/Step2Parties';
import Step3WriteAnswer from '@/components/apply/Step3WriteAnswer';
import Step4Attach from '@/components/apply/Step4Attach';
import Step5SubmitAnswer from '@/components/apply/Step5SubmitAnswer';
import { useAuth } from '@/context/AuthContext';
import type { ComplaintFormData, SampleCase, Assignment } from '@/types';

const EMPTY_FORM: ComplaintFormData = {
  doc_type: 'answer',
  caseCategory: '', caseName: '', court: '', claimType: '', sogaType: '', soga: '',
  parties: [], claimPurpose: '', claimCause: '',
  hasAgent: false, agentType: undefined, agentName: undefined, evidences: [],
};

const COURTS = [
  '서울중앙지방법원','서울동부지방법원','서울남부지방법원','서울북부지방법원','서울서부지방법원',
  '의정부지방법원','인천지방법원','수원지방법원','춘천지방법원','청주지방법원',
  '대전지방법원','전주지방법원','광주지방법원','부산지방법원','울산지방법원',
  '창원지방법원','대구지방법원','제주지방법원',
];

const CASE_TYPES = [
  '가단','가합','나','다','라','마','머','카단','카합','타',
];

const SIDEBAR_ITEMS = [
  '소장','답변서','준비서면','소취하서','이의신청서','주소보정서','항소장','개명허가신청서','재산목록보고서','후견사무보고서',
];

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

  // 답변서 작성 phase
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<ComplaintFormData>(EMPTY_FORM);
  const [assignedCase, setAssignedCase] = useState<SampleCase | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRecordId, setSubmittedRecordId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    // 사건확인: 배정된 사건에서 법원+당사자명으로 매칭 시도
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
      // 사건이 없더라도 입력 정보로 진행 허용
      const caseNum = `${caseSearch.year}${caseSearch.caseCode}${caseSearch.caseNum}`;
      setFormData(prev => ({
        ...prev,
        court: caseSearch.court,
        sogaType: caseNum,
      }));
      setCaseConfirmed(true);
    } else {
      alert('법원을 선택해주세요.');
    }
  }

  const handleReset = () => {
    setStep(0);
    setFormData(EMPTY_FORM);
    setAssignedCase(null);
    setSubmitted(false);
    setSubmittedRecordId(null);
    setCaseConfirmed(false);
  };

  if (loading || !user) {
    return (
      <div style={{ fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#666', fontSize: 14 }}>로딩 중...</span>
      </div>
    );
  }

  const SEL: React.CSSProperties = { height: 34, padding: '0 10px', border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 13, fontFamily: 'inherit', color: '#222', background: '#fff', cursor: 'pointer' };
  const INP: React.CSSProperties = { height: 34, padding: '0 10px', border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 13, fontFamily: 'inherit', color: '#222', background: '#fff' };

  // ── 사건확인 Phase ──
  if (!caseConfirmed) {
    return (
      <div style={{ margin: 0, padding: 0, fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f2f5' }}>
        <MockBar />
        <GnbNav active="서류제출" />

        {/* 브레드크럼 */}
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
              {SIDEBAR_ITEMS.map(item => (
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
            {/* 제목 */}
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 14, borderBottom: '1px solid #dde3ed' }}>
              <span style={{ color: '#0067c2', fontSize: 16 }}>●</span> 나홀로소송 (답변서)
            </h1>

            {/* 사건확인 */}
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0067c2', margin: '0 0 8px' }}>사건확인</h2>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>
              대상 사건을 검색하시고 기본정보를 확인하신 후 작성하시기 바랍니다.
            </p>

            {/* 배정된 사건이 있으면 빠른 선택 표시 */}
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

            {/* 사건 검색 폼 */}
            <div style={{ background: '#fff', border: '1px solid #dde3ed', borderRadius: 6, padding: '24px 32px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px 0', width: 100, fontSize: 13, color: '#333', fontWeight: 600 }}>소송유형</td>
                    <td style={{ padding: '10px 0' }}>
                      <select value={caseSearch.caseType} onChange={e => setCaseSearch(p => ({ ...p, caseType: e.target.value }))} style={{ ...SEL, width: 220 }}>
                        <option value="민사">민사</option>
                        <option value="가사">가사</option>
                        <option value="행정">행정</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 0', fontSize: 13, color: '#333', fontWeight: 600 }}>법원</td>
                    <td style={{ padding: '10px 0' }}>
                      <select value={caseSearch.court} onChange={e => setCaseSearch(p => ({ ...p, court: e.target.value }))} style={{ ...SEL, width: 220 }}>
                        <option value="">-- 법원 선택 --</option>
                        {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 0', fontSize: 13, color: '#333', fontWeight: 600 }}>사건번호</td>
                    <td style={{ padding: '10px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select value={caseSearch.year} onChange={e => setCaseSearch(p => ({ ...p, year: e.target.value }))} style={{ ...SEL, width: 80 }}>
                        {[2026,2025,2024,2023,2022].map(y => <option key={y} value={String(y)}>{y}</option>)}
                      </select>
                      <select value={caseSearch.caseCode} onChange={e => setCaseSearch(p => ({ ...p, caseCode: e.target.value }))} style={{ ...SEL, width: 70 }}>
                        {CASE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input
                        value={caseSearch.caseNum}
                        onChange={e => setCaseSearch(p => ({ ...p, caseNum: e.target.value.replace(/[^0-9]/g, '') }))}
                        placeholder=""
                        style={{ ...INP, width: 120 }}
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
                        style={{ ...INP, width: 220 }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 유의사항 */}
            <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', borderRadius: 6, padding: '20px 24px', marginTop: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', margin: '0 0 10px' }}>유의사항</h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#555', lineHeight: 2 }}>
                <li>이 화면은 단순히 서류작성 편의를 제공하는 화면에 불과하므로, 작성한 서류는 프린터로 출력하여 법원에 방문하여 직접 제출하거나 우편제출 또는 전자소송포털의 [서류제출]기능을 통하여 전자제출을 하는 등 <strong style={{ color: '#c00' }}>반드시 별도의 법원 접수 절차가 필요</strong>합니다.</li>
                <li>본 작성화면에서 제공하는 서비스는 나홀로 소송인이 소송서류를 보다 쉽게 작성할 수 있도록 지원하는 서비스에 불과하므로 이를 통해 작성된 서류의 소송 결과에 대해서 법원은 법적책임을 지지 않습니다. <strong style={{ color: '#c00' }}>복잡하고 어려운 사건의 경우에는 반드시 법률전문가의 도움을 받으시기 바랍니다.</strong></li>
              </ul>
            </div>

            {/* 확인 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={handleCaseConfirm}
                style={{
                  padding: '10px 40px', background: '#1a4ea0', color: '#fff', border: 'none',
                  borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // ── 답변서 작성 Phase (기존 Step flow) ──
  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f2f5' }}>
      <MockBar />
      <GnbNav active="서류제출" />

      {/* 브레드크럼 */}
      <div style={{ background: '#f7f9fc', borderBottom: '1px solid #e2e6ea' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '8px 20px', fontSize: 12, color: '#888', display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0, fontSize: 12 }}>홈</button>
          <span>›</span><span>나홀로소송</span><span>›</span><span>소송서류작성</span><span>›</span>
          <span style={{ color: '#1a3a6b', fontWeight: 'bold' }}>답변서 작성</span>
        </div>
      </div>

      {/* 사건 확인 완료 표시 */}
      <div style={{ background: '#e8f4fb', borderBottom: '1px solid #b0d0eb' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '8px 20px', fontSize: 12, color: '#1a4a6b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            ✔ 사건확인 완료 — {formData.court} {formData.sogaType || ''} {assignedCase ? `(${assignedCase.title || assignedCase.case_type})` : ''}
          </span>
          <button onClick={() => setCaseConfirmed(false)} style={{ background: 'none', border: '1px solid #8ab8d8', borderRadius: 3, padding: '2px 10px', fontSize: 11, color: '#1a4a6b', cursor: 'pointer', fontFamily: 'inherit' }}>
            사건 재검색
          </button>
        </div>
      </div>

      {/* Step bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dde1e7', padding: '16px 0' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 20px' }}>
          <StepBar step={step} />
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '16px' }}>
          {submitted ? (
            <div style={{
              background: '#fff', border: '1px solid #dde1e7', borderRadius: 8,
              padding: '48px 32px', textAlign: 'center', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
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
          ) : (
            <>
              {step === 0 && <Step1Consent onNext={() => setStep(1)} onCancel={() => setCaseConfirmed(false)} />}
              {step === 1 && <Step2Parties data={formData} onChange={setFormData} onNext={() => setStep(2)} onBack={() => setStep(0)} assignedCase={assignedCase ?? undefined} defaultRole="피고" />}
              {step === 2 && <Step3WriteAnswer data={formData} onChange={setFormData} onNext={() => setStep(3)} onBack={() => setStep(1)} assignedCase={assignedCase ?? undefined} />}
              {step === 3 && <Step4Attach data={formData} onChange={setFormData} onNext={() => setStep(4)} onBack={() => setStep(2)} evidencePrefix="을" />}
              {step === 4 && <Step5SubmitAnswer data={formData} onBack={() => setStep(3)} onSubmitComplete={(id: string) => { setSubmittedRecordId(id); setSubmitted(true); }} assignedCase={assignedCase ?? undefined} userId={user.id} userName={user.name} />}
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
