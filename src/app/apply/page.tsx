'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MockBar from '@/components/layout/MockBar';
import GnbNav from '@/components/layout/GnbNav';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { ComplaintFormData, Party, SampleCase } from '@/types';

// ── Constants ─────────────────────────────────────────────────
const CASE_NAMES = [
  '가등기말소','강제집행에 관한 소송','건물','건물등철거','건물인도','건축에관한 소송',
  '계금','공사대금','공유물분쟁','공탁금 출급청구권 확인','관리비','광고대금','구상금',
  '근로에관한 소송','근저당권말소','기타(금전)','대여금','매매대금','매매대금반환',
  '손해배상(건)','손해배상(국)','손해배상(기)','손해배상(산)','손해배상(연)',
  '손해배상(의)','손해배상(자)','손해배상(지)','손해배상(직)','손해배상(체)','손해배상(환)',
  '수표,어음금','수표금','시효중단을 위한 재판상 청구 확인의 소','신용카드이용대금',
  '약정금','양수금','어음금','예금','용역비','운송료','위자료','유익비','유체동산도',
  '유치권 부존재 확인','임금','임대차보증금','임목','저당권설정등기','전부금','제3자이의',
  '증권','증권관련집단소송','집행문부여에 대한 이의의 소','집행문부여의 소','집행판결',
  '재권조사확정재판에 대한 이의의 소','채무부존재확인','청구이의','추심금',
  '토지','토지인도','해고무효확인','회사에 관한 소송','기타',
];
const COURTS = [
  '서울회생법원','서울중앙지방법원','서울동부지방법원','서울남부지방법원','서울북부지방법원','서울서부지방법원',
  '의정부지방법원','의정부지법 고양지원','파주시법원','포천시법원','의정부지법 남양주지원',
  '동두천시법원','가평군법원','연천군법원','철원군법원',
  '인천지방법원','인천지법 부천지원','김포시법원','강화군법원',
  '수원지방법원','수원지법 성남지원','수원지법 여주지원','수원지법 평택지원','수원지법 안산지원','수원지법 안양지원',
  '춘천지방법원','춘천지법 강릉지원','춘천지법 원주지원','춘천지법 속초지원','춘천지법 영월지원',
  '청주지방법원','청주지법 충주지원','청주지법 제천지원','청주지법 영동지원',
  '대전지방법원','대전지법 홍성지원','대전지법 논산지원','대전지법 천안지원','대전지법 서산지원','대전지법 공주지원',
  '전주지방법원','전주지법 군산지원','전주지법 정읍지원','전주지법 남원지원',
  '광주지방법원','광주지법 목포지원','광주지법 장흥지원','광주지법 순천지원','광주지법 해남지원',
  '부산지방법원','부산지법 동부지원','부산지법 서부지원',
  '울산지방법원',
  '창원지방법원','창원지법 마산지원','창원지법 진주지원','창원지법 통영지원','창원지법 밀양지원','창원지법 거창지원',
  '대구지방법원','대구지법 서부지원','대구지법 안동지원','대구지법 경주지원','대구지법 포항지원',
  '대구지법 김천지원','대구지법 상주지원','대구지법 의성지원','대구지법 영덕지원',
  '제주지방법원',
];

function getCaseTitle(name: string): string {
  if (!name) return '';
  if (name.endsWith('의 소') || name.endsWith('소송') || name === '집행판결') return name;
  if (name === '해고무효확인') return '해고무효확인의 소';
  if (name === '유치권 부존재 확인') return '유치권 부존재 확인의 소';
  if (name === '채무부존재확인') return '채무부존재확인의 소';
  if (name === '청구이의') return '청구이의의 소';
  return `${name} 청구의 소`;
}

function toKoreanNum(n: number): string {
  if (!n || n === 0) return '0';
  const digits = ['','일','이','삼','사','오','육','칠','팔','구'];
  const su = ['','십','백','천'];
  const bu = ['','만','억','조'];
  let result = '';
  let bi = 0;
  let rem = n;
  while (rem > 0) {
    const chunk = rem % 10000;
    if (chunk > 0) {
      let cs = '';
      for (let i = 3; i >= 0; i--) {
        const d = Math.floor(chunk / Math.pow(10, i)) % 10;
        if (d === 0) continue;
        cs += (d === 1 && i > 0 ? '' : digits[d]) + su[i];
      }
      result = cs + bu[bi] + (result ? ' ' + result : '');
    }
    rem = Math.floor(rem / 10000);
    bi++;
  }
  return result;
}
const TEAL = '#0098a3';
const TEAL_DARK = '#007a84';
const EMAIL_DOMAINS = ['naver.com','gmail.com','daum.net','hanmail.net','nate.com','직접입력'];

const EMPTY: ComplaintFormData = {
  doc_type: 'complaint',
  caseCategory: '', caseName: '', court: '', claimType: '재산권', sogaType: '금액', soga: '',
  parties: [], claimPurpose: '', claimCause: '', hasAgent: false, agentType: undefined,
  agentName: undefined, evidences: [],
};

interface PartyLocal {
  role: '원고' | '피고';
  personType: 'individual' | 'corporation' | 'unincorporated' | 'state' | 'local';
  selectedParty: 'none' | 'selected' | 'selector';
  name: string; nameQualifier: boolean;
  regNum1: string; regNum2: string; regNumShow: boolean;
  bizRegNum: string; bizRegNumShow: boolean;
  corpName: string;
  corpRegNum: string; corpRegNumShow: boolean;
  repTitle: string; repName: string;
  ministry: string;
  zipCode: string; addrRoad: string; addrDetail: string;
  deliverySameAsAddr: boolean; addrDelivery: string;
  mobilePre: string; mobile1: string; mobile2: string; mobileShow: boolean;
  telPre: string; tel1: string; tel2: string; telShow: boolean;
  faxPre: string; fax1: string; fax2: string; faxShow: boolean;
  email: string; emailDomain: string; emailShow: boolean;
  smsAlert: boolean; emailAlert: boolean;
}
const EMPTY_PARTY: PartyLocal = {
  role: '원고', personType: 'individual', selectedParty: 'none',
  name: '', nameQualifier: false,
  regNum1: '', regNum2: '', regNumShow: false,
  bizRegNum: '', bizRegNumShow: false,
  corpName: '',
  corpRegNum: '', corpRegNumShow: false,
  repTitle: '대표이사', repName: '',
  ministry: '',
  zipCode: '', addrRoad: '', addrDetail: '',
  deliverySameAsAddr: false, addrDelivery: '',
  mobilePre: '010', mobile1: '', mobile2: '', mobileShow: false,
  telPre: '02', tel1: '', tel2: '', telShow: false,
  faxPre: '02', fax1: '', fax2: '', faxShow: false,
  email: '', emailDomain: 'naver.com', emailShow: false,
  smsAlert: false, emailAlert: false,
};

interface AgentLocal {
  partyId: string; agentType: string; name: string; regNum: string;
  zipCode: string; addrRoad: string; addrDetail: string;
  tel: string; mobile: string; email: string; emailDomain: string;
}
const EMPTY_AGENT: AgentLocal = {
  partyId: '', agentType: '', name: '', regNum: '',
  zipCode: '', addrRoad: '', addrDetail: '',
  tel: '', mobile: '', email: '', emailDomain: 'naver.com',
};

const SAMPLE_ADDRS = [
  { zip: '06236', road: '서울특별시 강남구 테헤란로 152', jibun: '서울 강남구 역삼동 737' },
  { zip: '03172', road: '서울특별시 종로구 세종대로 209', jibun: '서울 종로구 세종로 1' },
  { zip: '16499', road: '경기도 수원시 영통구 삼성로 129', jibun: '경기 수원시 영통구 매탄동 416' },
  { zip: '21565', road: '인천광역시 남동구 인하로 100', jibun: '인천 남동구 간석동 253-5' },
  { zip: '35235', road: '대전광역시 서구 청사로 189', jibun: '대전 서구 둔산동 1000' },
];

// ── Shared styles ──────────────────────────────────────────────
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

function ZipModal({ onSelect, onClose }: { onSelect: (zip: string, road: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const list = q.trim() ? SAMPLE_ADDRS.filter(a => a.road.includes(q) || a.zip.includes(q) || a.jibun.includes(q)) : SAMPLE_ADDRS;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: 560, borderRadius: 4, boxShadow: '0 4px 24px rgba(0,0,0,.3)', overflow: 'hidden' }}>
        <div style={{ background: TEAL, color: '#fff', padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>우편번호 / 주소 찾기</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '12px 16px 16px' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>※ 실습용 샘플 주소입니다.</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="도로명, 건물명, 지번 입력" style={{ ...INP, flex: 1, height: 30 }} />
            <button style={{ height: 30, padding: '0 12px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>검색</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
            <thead>
              <tr style={{ background: '#f5f7fb' }}>
                <th style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', width: 70 }}>우편번호</th>
                <th style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', textAlign: 'left' }}>주소</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a, i) => (
                <tr key={i} onClick={() => { onSelect(a.zip, a.road); onClose(); }}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #eaecf4' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f0f7f8')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '7px 10px', fontSize: 12, borderRight: '1px solid #eaecf4', color: TEAL, fontWeight: 600 }}>{a.zip}</td>
                  <td style={{ padding: '7px 10px', fontSize: 12 }}>
                    <div>{a.road}</div>
                    <div style={{ color: '#888', fontSize: 11 }}>{a.jibun}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AlertModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: 480, borderRadius: 4, boxShadow: '0 4px 24px rgba(0,0,0,.3)', overflow: 'hidden' }}>
        <div style={{ background: TEAL, color: '#fff', padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>알림서비스 내역</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '16px' }}>
          <p style={{ fontSize: 12, color: '#555', lineHeight: 1.8, marginBottom: 10 }}>전자소송 알림서비스를 신청하시면 소송진행상황을 SMS 또는 이메일로 안내받으실 수 있습니다.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f5f7fb' }}>
                {['서비스 종류','전송 시점','내용'].map(h => <th key={h} style={{ padding: '6px 10px', fontWeight: 700, borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[['SMS','소장 접수 완료','소장이 정상 접수되었습니다.'],['이메일','기일 통보','다음 기일에 대한 안내입니다.'],['SMS','송달 결과','서류 송달 결과를 안내합니다.']].map(([t,m,c],i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eaecf4' }}>
                  <td style={{ padding: '7px 10px', textAlign: 'center', borderRight: '1px solid #eaecf4' }}>{t}</td>
                  <td style={{ padding: '7px 10px', borderRight: '1px solid #eaecf4' }}>{m}</td>
                  <td style={{ padding: '7px 10px', color: '#555' }}>{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <button onClick={onClose} style={{ height: 30, padding: '0 18px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>확인</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function ApplyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<ComplaintFormData>(EMPTY);
  const [assignedCase, setAssignedCase] = useState<SampleCase | null>(null);
  const [open, setOpen] = useState({ s1: true, s2: true, s3: true, s4: true, s5: true, s6: true, s7: true });
  const [partyForm, setPartyForm] = useState<PartyLocal>(EMPTY_PARTY);
  const [agentForm, setAgentForm] = useState<AgentLocal>(EMPTY_AGENT);
  const [evForm, setEvForm] = useState({ name: '', purpose: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [sogaDisp, setSogaDisp] = useState('0');
  const [nonPropSpecial, setNonPropSpecial] = useState(false);
  const [causeTab, setCauseTab] = useState<'direct' | 'facts'>('direct');
  const [zipTarget, setZipTarget] = useState<'party' | 'agent' | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [activeNav, setActiveNav] = useState<string | null>(null);
  const causeRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) router.push('/'); }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    async function loadAssignedCase() {
      // 1) sessionStorage 우선 (다른 페이지에서 넘어온 경우)
      try {
        const raw = sessionStorage.getItem('assigned_case');
        if (raw) {
          const parsed: SampleCase = JSON.parse(raw);
          sessionStorage.removeItem('assigned_case');
          applyCase(parsed);
          return;
        }
      } catch { /* ignore */ }

      // 2) Supabase assignments 테이블에서 현재 학생의 배정 사건 조회
      try {
        const { data: rows } = await supabase
          .from('assignments')
          .select('*, sample_cases(*)')
          .eq('user_id', user!.id)
          .order('id', { ascending: false })
          .limit(1);

        const row = rows?.[0];
        const sc = row?.sample_cases as SampleCase | undefined;
        if (sc) applyCase(sc);
      } catch { /* ignore */ }
    }

    function applyCase(parsed: SampleCase) {
      setAssignedCase(parsed);
      setData(prev => ({
        ...prev,
        court: parsed.court || prev.court,
        caseCategory: CASE_NAMES.includes(parsed.case_type) ? parsed.case_type : prev.caseCategory,
        caseName: parsed.case_type || prev.caseName,
        claimPurpose: parsed.claim_purpose || prev.claimPurpose,
        claimCause: parsed.claim_reason || prev.claimCause,
      }));
      const initial: Party[] = [];
      if (parsed.plaintiff) initial.push({ id: crypto.randomUUID(), role: '원고', name: parsed.plaintiff, addr: '' });
      if (parsed.defendant) initial.push({ id: crypto.randomUUID(), role: '피고', name: parsed.defendant, addr: '' });
      if (initial.length) setData(prev => ({ ...prev, parties: initial }));
    }

    loadAssignedCase();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (causeRef.current) causeRef.current.innerText = data.claimCause || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback((k: keyof typeof open) => setOpen(p => ({ ...p, [k]: !p[k] })), []);
  const upd = (patch: Partial<ComplaintFormData>) => setData(p => ({ ...p, ...patch }));

  function fmtSoga(v: string) {
    const n = v.replace(/[^0-9]/g, '');
    upd({ soga: n });
    setSogaDisp(toKoreanNum(Number(n)));
  }

  function addParty() {
    const name = partyForm.personType === 'individual' ? partyForm.name.trim() : partyForm.corpName.trim();
    const addr = [partyForm.addrRoad, partyForm.addrDetail].filter(Boolean).join(' ');
    if (!name) { alert('성명(법인명)을 입력해주세요.'); return; }
    if (!addr) { alert('주소를 입력해주세요.'); return; }
    const telStr = partyForm.mobile1
      ? `${partyForm.mobilePre}-${partyForm.mobile1}-${partyForm.mobile2}`
      : partyForm.tel1 ? `${partyForm.telPre}-${partyForm.tel1}-${partyForm.tel2}` : '';
    upd({ parties: [...data.parties, { id: crypto.randomUUID(), role: partyForm.role, name, addr, tel: telStr, isCompany: partyForm.personType !== 'individual' }] });
    setPartyForm(EMPTY_PARTY);
  }

  function delParty(id: string) { upd({ parties: data.parties.filter(p => p.id !== id) }); }

  function addEvidence() {
    if (!evForm.name.trim()) { alert('서류명을 입력해주세요.'); return; }
    const num = `갑 제${data.evidences.length + 1}호증`;
    upd({ evidences: [...data.evidences, { id: crypto.randomUUID(), number: num, name: evForm.name.trim(), purpose: evForm.purpose.trim() }] });
    setEvForm({ name: '', purpose: '' });
  }

  function delEvidence(id: string) {
    const filtered = data.evidences.filter(e => e.id !== id);
    upd({ evidences: filtered.map((e, i) => ({ ...e, number: `갑 제${i + 1}호증` })) });
  }

  function saveDraft() {
    try {
      localStorage.setItem('ecfs_apply_draft', JSON.stringify(data));
      alert('임시저장 되었습니다.');
    } catch { alert('임시저장에 실패했습니다.'); }
  }

  async function handleSubmit() {
    if (!data.court) { alert('법원을 선택해주세요.'); return; }
    if (data.parties.length < 2) { alert('원고와 피고를 각 1명 이상 등록해주세요.'); return; }
    if (!data.claimPurpose.trim()) { alert('청구취지를 입력해주세요.'); return; }
    if (!data.claimCause.trim()) { alert('청구원인을 입력해주세요.'); return; }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const mockCase: SampleCase = {
        id: 'mock', title: data.caseName, case_type: data.caseCategory, court: data.court,
        plaintiff: data.parties.find(p => p.role === '원고')?.name || '원고',
        defendant: data.parties.find(p => p.role === '피고')?.name || '피고',
        created_at: new Date().toISOString(),
      };
      const effectiveCase = assignedCase || mockCase;

      const { data: inserted, error: insertError } = await supabase
        .from('practice_records')
        .insert({
          student_id: user!.id, user_name: user!.name,
          case_type: data.caseCategory || data.caseName, court: data.court,
          plaintiff: data.parties.find(p => p.role === '원고')?.name || '',
          defendant: data.parties.find(p => p.role === '피고')?.name || '',
          has_agent: data.hasAgent, evidence_count: data.evidences.length,
          score: 0, feedback: '채점 중...', complaint_data: data,
          case_id: assignedCase?.id || null,
        })
        .select('id').single();

      if (insertError) throw new Error(insertError.message);
      const recordId: string = inserted.id;

      const gradeRes = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: data, sampleCase: effectiveCase }),
      });

      if (gradeRes.ok) {
        const g = await gradeRes.json();
        await supabase.from('practice_records').update({
          score: g.score ?? 0, feedback: g.feedback ?? '', grade_breakdown: g.breakdown ?? null, graded_at: new Date().toISOString(),
        }).eq('id', recordId);
      }

      setSubmittedId(recordId);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 14, color: '#666' }}>로딩 중...</span></div>;
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif", background: '#f2f4f7' }}>
        <MockBar /><GnbNav active="서류제출" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ background: '#fff', border: '1px solid #d0d8e4', borderRadius: 6, padding: '48px 40px', textAlign: 'center', maxWidth: 480 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#003366', margin: '0 0 12px' }}>소장 작성이 완료되었습니다!</h2>
            <div style={{ background: '#f0f7f8', border: `1px solid ${TEAL}40`, borderRadius: 4, padding: '14px 18px', fontSize: 13, color: TEAL_DARK, lineHeight: 1.7, marginBottom: 24 }}>
              채점 결과는 <strong>나의전자소송 &gt; 나의 실습기록</strong>에서 확인하세요.
              {submittedId && <span style={{ display: 'block', marginTop: 4, color: '#888', fontSize: 11 }}>기록 ID: {submittedId}</span>}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => router.push('/mypage')} style={{ padding: '10px 22px', background: TEAL, color: '#fff', border: 'none', borderRadius: 3, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>나의 실습기록 확인</button>
              <button onClick={() => { setData(EMPTY); setSubmitted(false); setSubmittedId(null); }} style={{ padding: '10px 22px', background: '#fff', color: TEAL, border: `1px solid ${TEAL}`, borderRadius: 3, fontSize: 14, cursor: 'pointer' }}>새 소장 작성</button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const wonCount = data.parties.filter(p => p.role === '원고').length;
  const defCount = data.parties.filter(p => p.role === '피고').length;

  const sideItems = [
    { key: 's1', label: '사건기본정보' }, { key: 's2', label: '당사자' },
    { key: 's3', label: '대리인' }, { key: 's4', label: '청구취지' },
    { key: 's5', label: '청구원인' }, { key: 's6', label: '입증서류' },
    { key: 's7', label: '첨부서류' },
  ];

  function scrollTo(key: string) {
    setActiveNav(key);
    document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#eef0f3', fontSize: 13 }}>
      <MockBar />
      <GnbNav active="서류제출" />

      {/* Modals */}
      {zipTarget && (
        <ZipModal
          onSelect={(zip, road) => {
            if (zipTarget === 'party') setPartyForm(p => ({ ...p, zipCode: zip, addrRoad: road }));
            else setAgentForm(p => ({ ...p, zipCode: zip, addrRoad: road }));
          }}
          onClose={() => setZipTarget(null)}
        />
      )}
      {showAlertModal && <AlertModal onClose={() => setShowAlertModal(false)} />}

      {/* Page body */}
      <div style={{ flex: 1, display: 'flex', maxWidth: 1160, margin: '0 auto', width: '100%', padding: '14px 10px 60px', boxSizing: 'border-box', gap: 12, alignItems: 'flex-start' }}>

        {/* ── Left Sidebar ── */}
        <div style={{ width: 172, flexShrink: 0 }}>
          <div style={{ background: TEAL, color: '#fff', padding: '9px 14px', fontWeight: 700, fontSize: 13, borderRadius: '3px 3px 0 0' }}>서류작성</div>
          <div style={{ border: '1px solid #c8d4dc', borderTop: 'none', background: '#fff', borderRadius: '0 0 3px 3px', overflow: 'hidden' }}>
            {/* 1.문서작성 (활성) */}
            <div style={{ background: '#e6f7f8', borderBottom: '1px solid #c8dde0', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: TEAL, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>1</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>문서작성</span>
            </div>
            {/* Sub-items */}
            {sideItems.map(item => (
              <div key={item.key} onClick={() => scrollTo(item.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px 5px 26px', cursor: 'pointer', background: activeNav === item.key ? '#f0fafa' : '#fff', color: activeNav === item.key ? TEAL : '#555', fontSize: 11, borderBottom: '1px solid #edf0f3' }}
                onMouseEnter={e => { if (activeNav !== item.key) e.currentTarget.style.background = '#f8fafb'; }}
                onMouseLeave={e => { if (activeNav !== item.key) e.currentTarget.style.background = '#fff'; }}>
                <span style={{ color: activeNav === item.key ? TEAL : '#bbb', fontSize: 9 }}>▸</span>
                {item.label}
              </div>
            ))}
            {/* 2~5 비활성 단계 */}
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
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>민사서류 - 소장</span>
              {assignedCase && <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>배정: {assignedCase.title}</span>}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={() => setOpen({ s1:true,s2:true,s3:true,s4:true,s5:true,s6:true,s7:true })} style={{ height: 26, padding: '0 10px', border: '1px solid #b8c4cc', borderRadius: 2, background: '#fff', color: '#555', fontSize: 11, cursor: 'pointer' }}>전체열기 ▼</button>
              <button onClick={() => setOpen({ s1:false,s2:false,s3:false,s4:false,s5:false,s6:false,s7:false })} style={{ height: 26, padding: '0 10px', border: '1px solid #b8c4cc', borderRadius: 2, background: '#fff', color: '#555', fontSize: 11, cursor: 'pointer' }}>전체닫기 ▲</button>
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
                    {/* 사건명 */}
                    <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                      <th style={TH}>사건명<span style={{ color: '#e53e3e' }}>*</span></th>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            value={data.caseCategory}
                            onChange={e => { const cat = e.target.value; upd({ caseCategory: cat, caseName: getCaseTitle(cat) }); }}
                            style={{ ...SEL, width: 160 }}>
                            <option value="">선택</option>
                            {CASE_NAMES.map(n => <option key={n}>{n}</option>)}
                          </select>
                          <input
                            value={data.caseName}
                            onChange={e => upd({ caseName: e.target.value })}
                            style={{ ...INP, width: 210 }}
                            placeholder="사건명 자동입력" />
                          <button type="button" style={{ height: 28, padding: '0 10px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', color: '#444', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            🔍 사건명검색
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* 법원 */}
                    <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                      <th style={TH}>
                        법원<span style={{ color: '#e53e3e' }}>*</span>{' '}
                        <span title="관할법원을 선택해 주세요" style={{ color: '#0067c2', fontSize: 11, cursor: 'default' }}>ⓘ</span>
                      </th>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select value={data.court} onChange={e => upd({ court: e.target.value })} style={{ ...SEL, width: 200 }}>
                            <option value="">선택</option>
                            {COURTS.map(c => <option key={c}>{c}</option>)}
                          </select>
                          <button type="button" style={{ height: 28, padding: '0 10px', border: `1px solid ${TEAL}`, borderRadius: 2, background: '#fff', color: TEAL, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>관할법원찾기 &gt;</button>
                        </div>
                      </td>
                    </tr>
                    {/* 청구구분 */}
                    <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                      <th style={TH}>청구구분<span style={{ color: '#e53e3e' }}>*</span></th>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: 20 }}>
                          {[['재산권','재산권상청구'],['비재산권','비재산권 청구']].map(([v, lbl]) => (
                            <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12 }}>
                              <input type="radio" name="ctype" checked={data.claimType === v} onChange={() => upd({ claimType: v })} style={{ accentColor: TEAL }} />
                              {lbl}
                            </label>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: '#c0392b', marginTop: 4, lineHeight: 1.6 }}>
                          ※ 비재산권상 청구와 재산권상 청구가 병합된 경우에는 &apos;비재산권상 청구&apos;를 선택하기 바랍니다.
                        </div>
                      </td>
                    </tr>
                    {/* 유형 (비재산권 선택 시) */}
                    {data.claimType === '비재산권' && (
                      <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                        <th style={TH}>유형</th>
                        <td style={TD}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                            <input type="checkbox" checked={nonPropSpecial} onChange={e => setNonPropSpecial(e.target.checked)} style={{ accentColor: TEAL }} />
                            해고무효확인의 소를 제외한 회사 등 관계소송, 무체재산권에 관한 소송
                          </label>
                        </td>
                      </tr>
                    )}
                    {/* 소가구분 (재산권 선택 시) */}
                    {data.claimType === '재산권' && (
                      <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                        <th style={TH}>소가구분<span style={{ color: '#e53e3e' }}>*</span></th>
                        <td style={TD}>
                          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                            {[['금액','금액'],['토지','토지 등의 평가액'],['불능','소가를 산출할 수 없는 경우']].map(([v, lbl]) => (
                              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12 }}>
                                <input type="radio" name="sogat" checked={data.sogaType === v} onChange={() => upd({ sogaType: v })} style={{ accentColor: TEAL }} />
                                {lbl}
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                    {/* 소가 */}
                    {(data.claimType === '비재산권' || data.sogaType === '금액') && (
                      <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                        <th style={TH}>
                          소가<span style={{ color: '#e53e3e' }}>*</span>{' '}
                          <span title="소가 산정 안내" style={{ color: '#0067c2', fontSize: 11, cursor: 'default' }}>ⓘ</span>
                        </th>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              value={data.soga ? Number(data.soga).toLocaleString('ko-KR') : ''}
                              onChange={e => fmtSoga(e.target.value)}
                              style={{ ...INP, width: 140, textAlign: 'right' }}
                              placeholder="0" />
                            <span style={{ fontSize: 12 }}>원</span>
                            <span style={{ fontSize: 11, color: '#666' }}>({sogaDisp} 원)</span>
                            <button type="button" style={{ height: 28, padding: '0 10px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', color: '#444', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>소가산정안내 &gt;</button>
                          </div>
                          <div style={{ fontSize: 11, color: '#c0392b', marginTop: 4, lineHeight: 1.6 }}>
                            ※ 병합청구인 경우 병합청구에 따른 소가 산정방식을 확인해 주세요. 위 소가산정안내는 내 &apos;병합청구의 소가&apos;등 다양한 유형 산정 방식(합산 또는 다액여부)을 확인할 수 있습니다.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {/* 경고 박스 */}
                <div style={{ margin: '0 14px 10px', border: '1px solid #d8dde8', background: '#f8f9fb', borderRadius: 2, padding: '9px 14px', fontSize: 11, color: '#555', lineHeight: 1.8 }}>
                  • 관할권이 없는 법원에 소장이 제출된 경우에는 사건이 이송되어 소송이 지연될 수 있으므로 주의하시기 바랍니다.
                </div>
                {/* 등록 버튼 */}
                <div style={{ textAlign: 'right', padding: '0 14px 12px' }}>
                  <button type="button" style={{ height: 32, padding: '0 18px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✏ 등록
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ② 당사자 */}
          <div id="sec-s2" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="② 당사자" open={open.s2} toggle={() => toggle('s2')} />
            {open.s2 && (
              <div style={{ padding: '10px 14px 14px' }}>
                {/* 당사자 목록 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>▸ 당사자 목록</span>
                  <span style={{ fontSize: 11, color: '#666' }}>원고 <strong style={{ color: TEAL }}>{wonCount}</strong>명 / 피고 <strong style={{ color: '#c0392b' }}>{defCount}</strong>명</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', marginBottom: 12 }}>
                  <thead>
                    <tr style={{ background: '#f0f4f8' }}>
                      {['No.','당사자구분','인격구분','성명 / 법인명','주소','삭제'].map(h => (
                        <th key={h} style={{ padding: '7px 8px', fontSize: 11, fontWeight: 700, color: '#333', borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.parties.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa', fontSize: 12, padding: 14 }}>조회된 결과가 없습니다.</td></tr>
                    ) : data.parties.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #eaecf4' }}>
                        <td style={{ padding: '6px 8px', textAlign: 'center', borderRight: '1px solid #eaecf4', color: '#888', fontSize: 11 }}>{i + 1}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', borderRight: '1px solid #eaecf4' }}>
                          <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: p.role === '원고' ? '#e6f7f8' : '#fce7f3', color: p.role === '원고' ? TEAL_DARK : '#9d174d' }}>{p.role}</span>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', borderRight: '1px solid #eaecf4', fontSize: 11, color: '#555' }}>{p.isCompany ? '법인·단체' : '개인'}</td>
                        <td style={{ padding: '6px 8px', borderRight: '1px solid #eaecf4', fontWeight: 600, fontSize: 12 }}>{p.name}</td>
                        <td style={{ padding: '6px 8px', borderRight: '1px solid #eaecf4', fontSize: 11, color: '#555', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.addr}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <button onClick={() => delParty(p.id)} style={{ background: 'none', border: '1px solid #e53e3e', color: '#e53e3e', borderRadius: 2, padding: '2px 7px', fontSize: 11, cursor: 'pointer' }}>삭제</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* 당사자 입력 폼 */}
                <div style={{ background: '#f8f9fb', border: '1px solid #d8dde6', borderRadius: 3, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 8 }}>▸ 당사자기본정보 입력</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {/* 당사자 구분 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>당사자구분<span style={{ color: '#e53e3e' }}>*</span></th>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: 14 }}>
                              {(['원고', '피고'] as const).map(r => (
                                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                                  <input type="radio" name="prole" checked={partyForm.role === r} onChange={() => setPartyForm(p => ({ ...p, role: r }))} style={{ accentColor: TEAL }} />
                                  {r}
                                </label>
                              ))}
                            </div>
                            <button type="button" style={{ height: 24, padding: '0 9px', border: '1px solid #c8cdd6', background: '#fff', color: '#444', fontSize: 11, cursor: 'pointer', borderRadius: 2 }}>내사건당사자조회</button>
                            <button type="button" style={{ height: 24, padding: '0 9px', border: '1px solid #c8cdd6', background: '#fff', color: '#444', fontSize: 11, cursor: 'pointer', borderRadius: 2 }}>자주쓰는 당사자</button>
                          </div>
                        </td>
                      </tr>
                      {/* 인격 구분 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>인격구분<span style={{ color: '#e53e3e' }}>*</span></th>
                        <td style={TD}>
                          <select value={partyForm.personType} onChange={e => setPartyForm(p => ({ ...p, personType: e.target.value as PartyLocal['personType'] }))} style={{ ...SEL, width: 220 }}>
                            <option value="individual">자연인</option>
                            <option value="corporation">법인</option>
                            <option value="unincorporated">권리능력없는법인(비법인)</option>
                            <option value="state">국가</option>
                            <option value="local">지방자치단체</option>
                          </select>
                        </td>
                      </tr>
                      {/* 선정당사자 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>선정당사자</th>
                        <td style={TD}>
                          <div style={{ display: 'flex', gap: 14 }}>
                            {[['none','해당없음'],['selected','선정당사자'],['selector','선정자']].map(([v, lbl]) => (
                              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                                <input type="radio" name="selParty" checked={partyForm.selectedParty === v} onChange={() => setPartyForm(p => ({ ...p, selectedParty: v as PartyLocal['selectedParty'] }))} style={{ accentColor: TEAL }} />
                                {lbl}
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                      {/* 성명 / 법인명 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>
                          {partyForm.personType === 'individual' ? '성명' : '법인·단체명'}<span style={{ color: '#e53e3e' }}>*</span>
                        </th>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <input
                              value={partyForm.personType === 'individual' ? partyForm.name : partyForm.corpName}
                              onChange={e => { const val = e.target.value; setPartyForm(p => p.personType === 'individual' ? { ...p, name: val } : { ...p, corpName: val }); }}
                              style={{ ...INP, width: 160 }}
                              placeholder={partyForm.personType === 'individual' ? '성명 입력' : '법인명 입력'} />
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: '#555' }}>
                              <input type="checkbox" checked={partyForm.nameQualifier} onChange={e => setPartyForm(p => ({ ...p, nameQualifier: e.target.checked }))} style={{ accentColor: TEAL }} />
                              소장의 당사자자격 표시문구 추가
                            </label>
                          </div>
                        </td>
                      </tr>
                      {/* 주민등록번호 (자연인) */}
                      {partyForm.personType === 'individual' && (
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>주민등록번호</th>
                          <td style={TD}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                              <input value={partyForm.regNum1} onChange={e => setPartyForm(p => ({ ...p, regNum1: e.target.value.replace(/\D/g,'').slice(0,6) }))} style={{ ...INP, width: 76 }} placeholder="생년월일" maxLength={6} />
                              <span style={{ color: '#888' }}>-</span>
                              <input value={partyForm.regNum2} onChange={e => setPartyForm(p => ({ ...p, regNum2: e.target.value.replace(/\D/g,'').slice(0,7) }))} style={{ ...INP, width: 88 }} type="password" placeholder="●●●●●●●" maxLength={7} />
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: '#555', marginLeft: 4 }}>
                                <input type="checkbox" checked={partyForm.regNumShow} onChange={e => setPartyForm(p => ({ ...p, regNumShow: e.target.checked }))} style={{ accentColor: TEAL }} />
                                제출문서에 보임
                              </label>
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* 사업자등록번호 (비법인) */}
                      {partyForm.personType === 'unincorporated' && (
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>사업자등록번호</th>
                          <td style={TD}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <input value={partyForm.bizRegNum} onChange={e => setPartyForm(p => ({ ...p, bizRegNum: e.target.value.replace(/\D/g,'').slice(0,10) }))} style={{ ...INP, width: 150 }} placeholder="사업자등록번호 10자리" maxLength={10} />
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: '#555' }}>
                                <input type="checkbox" checked={partyForm.bizRegNumShow} onChange={e => setPartyForm(p => ({ ...p, bizRegNumShow: e.target.checked }))} style={{ accentColor: TEAL }} />
                                제출문서에 보임
                              </label>
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* 법인등록번호 (법인/지방자치단체) */}
                      {(partyForm.personType === 'corporation' || partyForm.personType === 'local') && (
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>법인등록번호</th>
                          <td style={TD}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                              <input value={partyForm.corpRegNum.slice(0,6)} onChange={e => setPartyForm(p => ({ ...p, corpRegNum: e.target.value.replace(/\D/g,'').slice(0,6) + p.corpRegNum.slice(6) }))} style={{ ...INP, width: 76 }} maxLength={6} />
                              <span style={{ color: '#888' }}>-</span>
                              <input value={partyForm.corpRegNum.slice(6)} onChange={e => setPartyForm(p => ({ ...p, corpRegNum: p.corpRegNum.slice(0,6) + e.target.value.replace(/\D/g,'').slice(0,7) }))} style={{ ...INP, width: 88 }} maxLength={7} />
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: '#555', marginLeft: 4 }}>
                                <input type="checkbox" checked={partyForm.corpRegNumShow} onChange={e => setPartyForm(p => ({ ...p, corpRegNumShow: e.target.checked }))} style={{ accentColor: TEAL }} />
                                제출문서에 보임
                              </label>
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* 대표자표시성명 (법인/국가/지방자치단체) */}
                      {(partyForm.personType === 'corporation' || partyForm.personType === 'state' || partyForm.personType === 'local') && (
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>대표자표시성명</th>
                          <td style={TD}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <select value={partyForm.repTitle} onChange={e => setPartyForm(p => ({ ...p, repTitle: e.target.value }))} style={{ ...SEL, width: 110 }}>
                                {['대표이사','대표자','이사장','원장','장관','청장','단체장','시장','도지사','구청장'].map(t => <option key={t}>{t}</option>)}
                              </select>
                              <input value={partyForm.repName} onChange={e => setPartyForm(p => ({ ...p, repName: e.target.value }))} style={{ ...INP, width: 130 }} placeholder="성명 입력" />
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* 소관청 (국가/지방자치단체) */}
                      {(partyForm.personType === 'state' || partyForm.personType === 'local') && (
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>소관청</th>
                          <td style={TD}>
                            <input value={partyForm.ministry} onChange={e => setPartyForm(p => ({ ...p, ministry: e.target.value }))} style={{ ...INP, width: 220 }} placeholder="소관청 입력" />
                          </td>
                        </tr>
                      )}
                      {/* 주소 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>주소<span style={{ color: '#e53e3e' }}>*</span></th>
                        <td style={TD}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                            <input value={partyForm.zipCode} readOnly placeholder="우편번호" style={{ ...INP, width: 76, background: '#f5f5f5', color: '#666' }} />
                            <button onClick={() => setZipTarget('party')} style={{ height: 28, padding: '0 10px', border: `1px solid ${TEAL}`, borderRadius: 2, background: '#fff', color: TEAL, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>우편번호찾기</button>
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <input value={partyForm.addrRoad} onChange={e => setPartyForm(p => ({ ...p, addrRoad: e.target.value }))} placeholder="도로명 주소" style={{ ...INP, width: '100%', maxWidth: 340 }} />
                          </div>
                          <input value={partyForm.addrDetail} onChange={e => setPartyForm(p => ({ ...p, addrDetail: e.target.value }))} placeholder="상세주소 입력" style={{ ...INP, width: '100%', maxWidth: 340 }} />
                        </td>
                      </tr>
                      {/* 송달장소 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>송달장소</th>
                        <td style={TD}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, marginBottom: 6 }}>
                            <input type="checkbox" checked={partyForm.deliverySameAsAddr} onChange={e => setPartyForm(p => ({ ...p, deliverySameAsAddr: e.target.checked, addrDelivery: e.target.checked ? '' : p.addrDelivery }))} style={{ accentColor: TEAL }} />
                            위 주소와 동일
                          </label>
                          {!partyForm.deliverySameAsAddr && (
                            <input value={partyForm.addrDelivery} onChange={e => setPartyForm(p => ({ ...p, addrDelivery: e.target.value }))} placeholder="주소와 다른 경우 입력" style={{ ...INP, width: '100%', maxWidth: 340 }} />
                          )}
                        </td>
                      </tr>
                      {/* 연락처 - 휴대전화 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>휴대전화</th>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', cursor: 'pointer', marginRight: 4 }}>
                              <input type="checkbox" checked={partyForm.mobileShow} onChange={e => setPartyForm(p => ({ ...p, mobileShow: e.target.checked }))} style={{ accentColor: TEAL }} />
                              제출문서에 보임
                            </label>
                            <select value={partyForm.mobilePre} onChange={e => setPartyForm(p => ({ ...p, mobilePre: e.target.value }))} style={{ ...SEL, width: 60 }}>
                              {['010','011','016','017','018','019'].map(v => <option key={v}>{v}</option>)}
                            </select>
                            <span style={{ fontSize: 12, color: '#888' }}>-</span>
                            <input value={partyForm.mobile1} onChange={e => setPartyForm(p => ({ ...p, mobile1: e.target.value.replace(/\D/g,'').slice(0,4) }))} style={{ ...INP, width: 56 }} maxLength={4} placeholder="0000" />
                            <span style={{ fontSize: 12, color: '#888' }}>-</span>
                            <input value={partyForm.mobile2} onChange={e => setPartyForm(p => ({ ...p, mobile2: e.target.value.replace(/\D/g,'').slice(0,4) }))} style={{ ...INP, width: 56 }} maxLength={4} placeholder="0000" />
                          </div>
                        </td>
                      </tr>
                      {/* 연락처 - 전화 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>전화</th>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', cursor: 'pointer', marginRight: 4 }}>
                              <input type="checkbox" checked={partyForm.telShow} onChange={e => setPartyForm(p => ({ ...p, telShow: e.target.checked }))} style={{ accentColor: TEAL }} />
                              제출문서에 보임
                            </label>
                            <select value={partyForm.telPre} onChange={e => setPartyForm(p => ({ ...p, telPre: e.target.value }))} style={{ ...SEL, width: 60 }}>
                              {['02','031','032','033','041','042','043','044','051','052','053','054','055','061','062','063','064'].map(v => <option key={v}>{v}</option>)}
                            </select>
                            <span style={{ fontSize: 12, color: '#888' }}>-</span>
                            <input value={partyForm.tel1} onChange={e => setPartyForm(p => ({ ...p, tel1: e.target.value.replace(/\D/g,'').slice(0,4) }))} style={{ ...INP, width: 56 }} maxLength={4} placeholder="0000" />
                            <span style={{ fontSize: 12, color: '#888' }}>-</span>
                            <input value={partyForm.tel2} onChange={e => setPartyForm(p => ({ ...p, tel2: e.target.value.replace(/\D/g,'').slice(0,4) }))} style={{ ...INP, width: 56 }} maxLength={4} placeholder="0000" />
                          </div>
                        </td>
                      </tr>
                      {/* 연락처 - 팩스 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>팩스</th>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', cursor: 'pointer', marginRight: 4 }}>
                              <input type="checkbox" checked={partyForm.faxShow} onChange={e => setPartyForm(p => ({ ...p, faxShow: e.target.checked }))} style={{ accentColor: TEAL }} />
                              제출문서에 보임
                            </label>
                            <select value={partyForm.faxPre} onChange={e => setPartyForm(p => ({ ...p, faxPre: e.target.value }))} style={{ ...SEL, width: 60 }}>
                              {['02','031','032','033','041','042','043','044','051','052','053','054','055','061','062','063','064'].map(v => <option key={v}>{v}</option>)}
                            </select>
                            <span style={{ fontSize: 12, color: '#888' }}>-</span>
                            <input value={partyForm.fax1} onChange={e => setPartyForm(p => ({ ...p, fax1: e.target.value.replace(/\D/g,'').slice(0,4) }))} style={{ ...INP, width: 56 }} maxLength={4} placeholder="0000" />
                            <span style={{ fontSize: 12, color: '#888' }}>-</span>
                            <input value={partyForm.fax2} onChange={e => setPartyForm(p => ({ ...p, fax2: e.target.value.replace(/\D/g,'').slice(0,4) }))} style={{ ...INP, width: 56 }} maxLength={4} placeholder="0000" />
                          </div>
                        </td>
                      </tr>
                      {/* 이메일 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>이메일</th>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', cursor: 'pointer', marginRight: 4 }}>
                              <input type="checkbox" checked={partyForm.emailShow} onChange={e => setPartyForm(p => ({ ...p, emailShow: e.target.checked }))} style={{ accentColor: TEAL }} />
                              제출문서에 보임
                            </label>
                            <input value={partyForm.email} onChange={e => setPartyForm(p => ({ ...p, email: e.target.value }))} style={{ ...INP, width: 110 }} placeholder="계정" />
                            <span style={{ fontSize: 12 }}>@</span>
                            <select value={partyForm.emailDomain} onChange={e => setPartyForm(p => ({ ...p, emailDomain: e.target.value }))} style={{ ...SEL, width: 120 }}>
                              {EMAIL_DOMAINS.map(d => <option key={d}>{d}</option>)}
                            </select>
                          </div>
                        </td>
                      </tr>
                      {/* 알림서비스 */}
                      <tr>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>알림서비스</th>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            {[['smsAlert','SMS'],['emailAlert','이메일']].map(([k,lbl]) => (
                              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12 }}>
                                <input type="checkbox" checked={partyForm[k as 'smsAlert'|'emailAlert']} onChange={e => setPartyForm(p => ({ ...p, [k]: e.target.checked }))} style={{ accentColor: TEAL }} />
                                {lbl}
                              </label>
                            ))}
                            <button onClick={() => setShowAlertModal(true)} style={{ height: 24, padding: '0 10px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', color: '#555', fontSize: 11, cursor: 'pointer' }}>알림서비스 내역</button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingTop: 10 }}>
                    <button onClick={() => setPartyForm(EMPTY_PARTY)} style={{ height: 30, padding: '0 16px', border: '1px solid #c8cdd6', background: '#fff', color: '#555', borderRadius: 2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>초기화</button>
                    <button onClick={addParty} style={{ height: 30, padding: '0 18px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>등록</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ③ 대리인 */}
          <div id="sec-s3" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="③ 대리인" open={open.s3} toggle={() => toggle('s3')} />
            {open.s3 && (
              <div style={{ padding: '10px 14px 14px' }}>
                <div style={{ display: 'flex', gap: 18, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #eaecf4' }}>
                  {[[false,'없음 (본인소송)'],[true,'있음']].map(([v,lbl]) => (
                    <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12 }}>
                      <input type="radio" name="hasag" checked={data.hasAgent === v} onChange={() => upd({ hasAgent: v as boolean, agentName: undefined, agentType: undefined })} style={{ accentColor: TEAL }} />
                      {lbl as string}
                    </label>
                  ))}
                </div>

                {data.hasAgent && (
                  <div style={{ background: '#f8f9fb', border: '1px solid #d8dde6', borderRadius: 3, padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 8 }}>▸ 대리인 정보 입력</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>당사자</th>
                          <td style={TD}>
                            <select value={agentForm.partyId} onChange={e => setAgentForm(p => ({ ...p, partyId: e.target.value }))} style={{ ...SEL, width: 200 }}>
                              <option value="">선택</option>
                              {data.parties.map(p => <option key={p.id} value={p.id}>{p.role} - {p.name}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>대리인 유형<span style={{ color: '#e53e3e' }}>*</span></th>
                          <td style={TD}>
                            <select value={agentForm.agentType} onChange={e => { setAgentForm(p => ({ ...p, agentType: e.target.value })); upd({ agentType: e.target.value }); }} style={{ ...SEL, width: 180 }}>
                              <option value="">선택</option>
                              {['변호사','법무사','국선대리인','법정대리인','임의대리인'].map(v => <option key={v}>{v}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>성명<span style={{ color: '#e53e3e' }}>*</span></th>
                          <td style={TD}><input value={agentForm.name} onChange={e => { setAgentForm(p => ({ ...p, name: e.target.value })); upd({ agentName: e.target.value }); }} style={{ ...INP, width: 160 }} placeholder="대리인 성명" /></td>
                        </tr>
                        {(agentForm.agentType === '변호사' || agentForm.agentType === '법무사') && (
                          <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                            <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>등록번호</th>
                            <td style={TD}><input value={agentForm.regNum} onChange={e => setAgentForm(p => ({ ...p, regNum: e.target.value }))} style={{ ...INP, width: 160 }} placeholder="등록번호 입력" /></td>
                          </tr>
                        )}
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>주소</th>
                          <td style={TD}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                              <input value={agentForm.zipCode} readOnly placeholder="우편번호" style={{ ...INP, width: 76, background: '#f5f5f5', color: '#666' }} />
                              <button onClick={() => setZipTarget('agent')} style={{ height: 28, padding: '0 10px', border: `1px solid ${TEAL}`, borderRadius: 2, background: '#fff', color: TEAL, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>우편번호찾기</button>
                            </div>
                            <div style={{ marginBottom: 4 }}><input value={agentForm.addrRoad} onChange={e => setAgentForm(p => ({ ...p, addrRoad: e.target.value }))} placeholder="도로명 주소" style={{ ...INP, width: '100%', maxWidth: 320 }} /></div>
                            <input value={agentForm.addrDetail} onChange={e => setAgentForm(p => ({ ...p, addrDetail: e.target.value }))} placeholder="상세주소" style={{ ...INP, width: '100%', maxWidth: 320 }} />
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>전화번호</th>
                          <td style={TD}><input value={agentForm.tel} onChange={e => setAgentForm(p => ({ ...p, tel: e.target.value }))} style={{ ...INP, width: 180 }} placeholder="02-0000-0000" /></td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>휴대폰</th>
                          <td style={TD}><input value={agentForm.mobile} onChange={e => setAgentForm(p => ({ ...p, mobile: e.target.value }))} style={{ ...INP, width: 180 }} placeholder="010-0000-0000" /></td>
                        </tr>
                        <tr>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>이메일</th>
                          <td style={TD}>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <input value={agentForm.email} onChange={e => setAgentForm(p => ({ ...p, email: e.target.value }))} style={{ ...INP, width: 110 }} placeholder="계정" />
                              <span style={{ fontSize: 12 }}>@</span>
                              <select value={agentForm.emailDomain} onChange={e => setAgentForm(p => ({ ...p, emailDomain: e.target.value }))} style={{ ...SEL, width: 120 }}>
                                {EMAIL_DOMAINS.map(d => <option key={d}>{d}</option>)}
                              </select>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ④ 청구취지 */}
          <div id="sec-s4" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="④ 청구취지" open={open.s4} toggle={() => toggle('s4')} />
            {open.s4 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <th style={{ ...TH, verticalAlign: 'top', paddingTop: 11 }}>청구취지<span style={{ color: '#e53e3e' }}>*</span></th>
                    <td style={{ ...TD, verticalAlign: 'top', paddingTop: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: '#666' }}>청구취지를 입력하세요 (한글 2,000자 이내)</span>
                        <span style={{ fontSize: 11, color: '#888' }}>{data.claimPurpose.length} / 6000 Bytes</span>
                      </div>
                      <textarea
                        value={data.claimPurpose}
                        onChange={e => upd({ claimPurpose: e.target.value })}
                        rows={5}
                        style={{ width: '100%', padding: '7px 8px', border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 12, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                        placeholder="예) 피고는 원고에게 금 OOO원 및 이에 대하여 OOOO. OO. OO.부터 이 사건 소장 부본 송달일까지는 연 5%의, 그 다음 날부터 다 갚는 날까지는 연 12%의 각 비율로 계산한 돈을 지급하라. 소송비용은 피고가 부담한다."
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* ⑤ 청구원인 */}
          <div id="sec-s5" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="⑤ 청구원인" open={open.s5} toggle={() => toggle('s5')} />
            {open.s5 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <th style={{ ...TH, verticalAlign: 'top', paddingTop: 11 }}>청구원인<span style={{ color: '#e53e3e' }}>*</span></th>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      {/* 탭 */}
                      <div style={{ display: 'flex', borderBottom: '1px solid #d0d8e4', marginBottom: 0 }}>
                        {(['direct','facts'] as const).map(tab => (
                          <button key={tab} onClick={() => setCauseTab(tab)} style={{ height: 30, padding: '0 14px', border: 'none', borderBottom: causeTab === tab ? `2px solid ${TEAL}` : '2px solid transparent', background: causeTab === tab ? '#fff' : '#f5f7fb', color: causeTab === tab ? TEAL : '#666', fontWeight: causeTab === tab ? 700 : 400, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '-1px' }}>
                            {tab === 'direct' ? '직접입력' : '요건사실'}
                          </button>
                        ))}
                      </div>
                      {causeTab === 'direct' ? (
                        <div style={{ border: '1px solid #c8cdd6', borderTop: 'none', borderRadius: '0 0 2px 2px' }}>
                          <div style={{ background: '#f0f3f8', borderBottom: '1px solid #dde0e6', padding: '3px 7px', display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {[['B','bold'],['I','italic'],['U','underline']].map(([lbl,cmd]) => (
                              <button key={cmd} onMouseDown={e => { e.preventDefault(); document.execCommand(cmd); }} style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'serif' }}><b>{lbl}</b></button>
                            ))}
                            <span style={{ width: 1, height: 14, background: '#c8cdd6', margin: '4px 2px' }} />
                            <button onMouseDown={e => { e.preventDefault(); document.execCommand('undo'); }} style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>↩</button>
                            <button onMouseDown={e => { e.preventDefault(); document.execCommand('redo'); }} style={{ height: 22, minWidth: 22, padding: '0 3px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>↪</button>
                          </div>
                          <div
                            ref={causeRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={() => { if (causeRef.current) upd({ claimCause: causeRef.current.innerText }); }}
                            style={{ minHeight: 140, padding: '9px 12px', fontSize: 12, fontFamily: "'맑은 고딕',sans-serif", lineHeight: 1.8, outline: 'none', background: '#fff' }}
                            data-placeholder="청구원인을 입력하세요. (한글 2000자 이내)"
                          />
                          <div style={{ background: '#f7f8fb', borderTop: '1px solid #e5e8ee', padding: '3px 10px', textAlign: 'right', fontSize: 11, color: '#888' }}>글자: {data.claimCause.length}/2000</div>
                        </div>
                      ) : (
                        <div style={{ border: '1px solid #c8cdd6', borderTop: 'none', borderRadius: '0 0 2px 2px', padding: '14px' }}>
                          <div style={{ background: '#f0f7f8', border: `1px solid ${TEAL}30`, borderRadius: 2, padding: '8px 12px', marginBottom: 10, fontSize: 11, color: '#555', lineHeight: 1.8 }}>
                            ℹ️ 청구원인의 각 요건사실을 항목별로 입력하세요.
                          </div>
                          {['1. 당사자 관계', '2. 계약 체결 사실', '3. 이행 청구 근거', '4. 손해 발생 사실'].map((label, i) => (
                            <div key={i} style={{ marginBottom: 10 }}>
                              <label style={{ fontSize: 12, fontWeight: 600, color: '#333', display: 'block', marginBottom: 3 }}>{label}</label>
                              <textarea rows={2} style={{ width: '100%', padding: '5px 8px', border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 12, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} placeholder={`${label} 입력`} />
                            </div>
                          ))}
                        </div>
                      )}
                      <style>{`[data-placeholder]:empty::before{content:attr(data-placeholder);color:#bbb;pointer-events:none}`}</style>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* ⑥ 입증서류 */}
          <div id="sec-s6" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="⑥ 입증서류" open={open.s6} toggle={() => toggle('s6')} />
            {open.s6 && (
              <div style={{ padding: '10px 14px 14px' }}>
                <div style={{ fontSize: 11, color: '#555', lineHeight: 1.8, marginBottom: 10, background: '#f8f9fb', border: '1px solid #e0e6ee', borderRadius: 2, padding: '7px 12px' }}>
                  * 입증서류(증거)는 단순한 첨부서류와 구분하여 제출하여야 합니다.<br />
                  * 제출자가 원고일 경우 '갑호증', 피고일 경우 '을호증'으로 제출하시기 바랍니다.
                </div>
                <div style={{ background: '#f8f9fb', border: '1px solid #d8dde6', borderRadius: 3, padding: '10px 12px', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>▸ 서증 추가</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr auto', gap: 7, alignItems: 'end' }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>서증번호</div>
                      <input value={`갑 제${data.evidences.length + 1}호증`} readOnly style={{ ...INP, width: '100%', background: '#f0f0f0', color: '#888' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>서류명<span style={{ color: '#e53e3e' }}>*</span></div>
                      <input value={evForm.name} onChange={e => setEvForm(p => ({ ...p, name: e.target.value }))} style={{ ...INP, width: '100%' }} placeholder="예) 차용증, 통장사본" onKeyDown={e => e.key === 'Enter' && addEvidence()} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>입증취지</div>
                      <input value={evForm.purpose} onChange={e => setEvForm(p => ({ ...p, purpose: e.target.value }))} style={{ ...INP, width: '100%' }} placeholder="예) 대여사실 입증" onKeyDown={e => e.key === 'Enter' && addEvidence()} />
                    </div>
                    <button onClick={addEvidence} style={{ height: 28, padding: '0 10px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>목록에 추가</button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>▸ 입증서류목록</span>
                  <span style={{ fontSize: 11 }}>총 <strong style={{ color: TEAL }}>{data.evidences.length}</strong>건</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                  <thead>
                    <tr style={{ background: '#f0f4f8' }}>
                      {['서증번호','서류명','입증취지','삭제'].map(h => (
                        <th key={h} style={{ padding: '6px 8px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.evidences.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: '#aaa', fontSize: 12, padding: 14 }}>조회된 결과가 없습니다.</td></tr>
                    ) : data.evidences.map(ev => (
                      <tr key={ev.id} style={{ borderBottom: '1px solid #eaecf4' }}>
                        <td style={{ padding: '6px 8px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #eaecf4', color: TEAL, fontWeight: 600 }}>{ev.number}</td>
                        <td style={{ padding: '6px 8px', fontSize: 12, borderRight: '1px solid #eaecf4' }}>{ev.name}</td>
                        <td style={{ padding: '6px 8px', fontSize: 12, color: '#555', borderRight: '1px solid #eaecf4' }}>{ev.purpose || '-'}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <button onClick={() => delEvidence(ev.id)} style={{ background: 'none', border: '1px solid #e53e3e', color: '#e53e3e', borderRadius: 2, padding: '2px 7px', fontSize: 11, cursor: 'pointer' }}>삭제</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ⑦ 첨부서류 */}
          <div id="sec-s7" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="⑦ 첨부서류" open={open.s7} toggle={() => toggle('s7')} />
            {open.s7 && (
              <div style={{ padding: '10px 14px 14px' }}>
                <div style={{ fontSize: 11, color: '#555', lineHeight: 1.8, marginBottom: 10, background: '#f8f9fb', border: '1px solid #e0e6ee', borderRadius: 2, padding: '7px 12px' }}>
                  * 첨부서류는 소장 제출 시 함께 제출하는 서류입니다. (위임장, 인감증명서 등)<br />
                  * 파일형식: PDF, HWP, DOC, DOCX, JPG, PNG (파일당 최대 20MB)
                </div>
                <label htmlFor="attach-file" style={{ display: 'block' }}>
                  <div style={{ border: '2px dashed #c8cdd6', borderRadius: 3, padding: '22px', textAlign: 'center', background: '#fafbfd', cursor: 'pointer' }}>
                    <div style={{ fontSize: 26, marginBottom: 6 }}>📎</div>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>파일을 드래그하거나 아래 버튼을 클릭하세요</div>
                    <span style={{ display: 'inline-block', height: 28, padding: '0 14px', lineHeight: '28px', border: `1px solid ${TEAL}`, borderRadius: 2, background: '#fff', color: TEAL, fontSize: 12, fontWeight: 700 }}>파일 선택</span>
                  </div>
                </label>
                <input type="file" id="attach-file" multiple accept=".pdf,.hwp,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} />
                <div style={{ marginTop: 6, fontSize: 11, color: '#aaa' }}>※ 실습 환경에서는 파일이 실제로 저장되지 않습니다.</div>
              </div>
            )}
          </div>

          {/* Notice */}
          <div style={{ border: '1px solid #d8dce8', background: '#f8f9fb', borderRadius: 2, padding: '8px 12px', marginBottom: 10 }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['당사자 정보는 주민등록상 정보와 일치해야 하며, 허위 정보 입력 시 법적 책임이 발생할 수 있습니다.','피고의 주소를 알 수 없는 경우 주소보정명령이 발부될 수 있으니 최대한 정확한 주소를 기재하시기 바랍니다.'].map((t, i) => (
                <li key={i} style={{ fontSize: 11, color: '#666', lineHeight: 1.8, paddingLeft: 10, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>•</span>{t}
                </li>
              ))}
            </ul>
          </div>

          {submitError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 3, padding: '10px 14px', color: '#dc2626', fontSize: 12, marginBottom: 10 }}>⚠️ {submitError}</div>
          )}

          {/* Bottom buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={saveDraft} style={{ height: 34, padding: '0 16px', border: '1px solid #c8cdd6', background: '#fff', color: '#555', borderRadius: 2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              임시저장
            </button>
            <button onClick={handleSubmit} disabled={submitting} style={{ height: 34, padding: '0 24px', background: submitting ? '#7ab8bd' : TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {submitting ? '⏳ 제출 중...' : '작성완료 →'}
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
