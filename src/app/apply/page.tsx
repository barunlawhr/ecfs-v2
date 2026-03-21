'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MockBar from '@/components/layout/MockBar';
import GnbNav from '@/components/layout/GnbNav';
import Footer from '@/components/layout/Footer';
import StepBar from '@/components/apply/StepBar';
import Step1Consent from '@/components/apply/Step1Consent';
import Step2Parties from '@/components/apply/Step2Parties';
import Step3Write from '@/components/apply/Step3Write';
import Step4Attach from '@/components/apply/Step4Attach';
import Step5Submit from '@/components/apply/Step5Submit';
import { useAuth } from '@/context/AuthContext';
import type { ComplaintFormData, SampleCase } from '@/types';

const EMPTY_FORM: ComplaintFormData = {
  caseCategory: '',
  caseName: '',
  court: '',
  claimType: '',
  sogaType: '',
  soga: '',
  parties: [],
  claimPurpose: '',
  claimCause: '',
  hasAgent: false,
  agentType: undefined,
  agentName: undefined,
  evidences: [],
};

const subtabs = ['민사', '민사서류 작성', '가사', '행정', '신청서', '준비서면', '기타서류'];

export default function ApplyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<ComplaintFormData>(EMPTY_FORM);
  const [assignedCase, setAssignedCase] = useState<SampleCase | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRecordId, setSubmittedRecordId] = useState<string | null>(null);
  const [activeSubtab, setActiveSubtab] = useState(1); // '민사서류 작성' active by default

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('assigned_case');
      if (raw) {
        const parsed: SampleCase = JSON.parse(raw);
        sessionStorage.removeItem('assigned_case');
        setAssignedCase(parsed);
        setFormData(prev => ({
          ...prev,
          court: parsed.court || '',
          caseCategory: parsed.case_type || '',
        }));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleReset = () => {
    setStep(0);
    setFormData(EMPTY_FORM);
    setAssignedCase(null);
    setSubmitted(false);
    setSubmittedRecordId(null);
  };

  if (loading || !user) {
    return (
      <div style={{ fontFamily: "'Malgun Gothic', '맑은 고딕', sans-serif", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#666', fontSize: 14 }}>로딩 중...</span>
      </div>
    );
  }

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "'Malgun Gothic', '맑은 고딕', sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f2f5' }}>
      <MockBar />
      <GnbNav active="서류제출" />

      {/* Subtab bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dde1e7' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 20px', display: 'flex', gap: 0 }}>
          {subtabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveSubtab(i)}
              style={{
                padding: '10px 16px',
                fontSize: 13,
                border: 'none',
                borderBottom: activeSubtab === i ? '2px solid #1a3a6b' : '2px solid transparent',
                background: 'transparent',
                color: activeSubtab === i ? '#1a3a6b' : '#555',
                fontWeight: activeSubtab === i ? 'bold' : 'normal',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ background: '#f7f9fc', borderBottom: '1px solid #e2e6ea' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '8px 20px', fontSize: 12, color: '#888', display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0, fontSize: 12 }}>홈</button>
          <span>›</span>
          <span>서류제출</span>
          <span>›</span>
          <span>민사서류 작성</span>
          <span>›</span>
          <span style={{ color: '#1a3a6b', fontWeight: 'bold' }}>소장</span>
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
            /* 제출완료 화면 */
            <div style={{
              background: '#fff',
              border: '1px solid #dde1e7',
              borderRadius: 8,
              padding: '48px 32px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{ fontSize: 64 }}>✅</div>
              <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#1a3a6b', margin: 0 }}>
                소장 제출이 완료되었습니다!
              </h2>
              <div style={{
                background: '#f0f7ff',
                border: '1px solid #c5d8f6',
                borderRadius: 6,
                padding: '14px 20px',
                maxWidth: 440,
                fontSize: 13,
                color: '#2952a3',
                lineHeight: 1.6,
              }}>
                채점 결과는 <strong>나의전자소송 &gt; 나의 실습기록</strong>에서 확인하세요.
                {submittedRecordId && (
                  <span style={{ display: 'block', marginTop: 6, color: '#888', fontSize: 12 }}>
                    기록 ID: {submittedRecordId}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                <button
                  onClick={() => router.push('/mypage')}
                  style={{
                    background: '#1a3a6b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '10px 22px',
                    fontSize: 14,
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  나의 실습기록 확인하기
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    background: '#fff',
                    color: '#1a3a6b',
                    border: '1px solid #1a3a6b',
                    borderRadius: 4,
                    padding: '10px 22px',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  새 소장 작성하기
                </button>
              </div>
            </div>
          ) : (
            <>
              {step === 0 && (
                <Step1Consent
                  onNext={() => setStep(1)}
                  onCancel={() => router.push('/')}
                />
              )}
              {step === 1 && (
                <Step2Parties
                  data={formData}
                  onChange={setFormData}
                  onNext={() => setStep(2)}
                  onBack={() => setStep(0)}
                  assignedCase={assignedCase ?? undefined}
                />
              )}
              {step === 2 && (
                <Step3Write
                  data={formData}
                  onChange={setFormData}
                  onNext={() => setStep(3)}
                  onBack={() => setStep(1)}
                  assignedCase={assignedCase ?? undefined}
                />
              )}
              {step === 3 && (
                <Step4Attach
                  data={formData}
                  onChange={setFormData}
                  onNext={() => setStep(4)}
                  onBack={() => setStep(2)}
                />
              )}
              {step === 4 && (
                <Step5Submit
                  data={formData}
                  onBack={() => setStep(3)}
                  onSubmitComplete={(id: string) => {
                    setSubmittedRecordId(id);
                    setSubmitted(true);
                  }}
                  assignedCase={assignedCase ?? undefined}
                  userId={user.id}
                  userName={user.name}
                />
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
