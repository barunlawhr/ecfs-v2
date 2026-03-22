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
  nationality: string;
  name: string; nameQualifier: boolean;
  regNum1: string; regNum2: string; regNumShow: boolean;
  bizRegNum1: string; bizRegNum2: string; bizRegNum3: string; bizRegNumShow: boolean;
  corpName: string;
  corpRegNum: string; corpRegNumShow: boolean;
  repTitle: string; repName: string;
  ministry: string;
  foreignName: string;
  addrForeign: boolean; addrUnknown: boolean;
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
  nationality: '한국',
  name: '', nameQualifier: false,
  regNum1: '', regNum2: '', regNumShow: false,
  bizRegNum1: '', bizRegNum2: '', bizRegNum3: '', bizRegNumShow: false,
  corpName: '',
  corpRegNum: '', corpRegNumShow: false,
  repTitle: '선택', repName: '',
  ministry: '',
  foreignName: '',
  addrForeign: false, addrUnknown: false,
  zipCode: '', addrRoad: '', addrDetail: '',
  deliverySameAsAddr: false, addrDelivery: '',
  mobilePre: '010', mobile1: '', mobile2: '', mobileShow: false,
  telPre: '02', tel1: '', tel2: '', telShow: false,
  faxPre: '02', fax1: '', fax2: '', faxShow: false,
  email: '', emailDomain: 'naver.com', emailShow: false,
  smsAlert: false, emailAlert: false,
};

interface AgentLocal {
  partyId: string;
  agentType: string;
  litigationStructure: boolean;
  regNum1: string; regNum2: string;
  name: string;
  deliverySameAsParty: boolean;
  zipCode: string; addrRoad: string; addrDetail: string;
  addrDelivery: string;
  mobilePre: string; mobile1: string; mobile2: string; mobileShow: boolean;
  telPre: string; tel1: string; tel2: string; telShow: boolean;
  faxPre: string; fax1: string; fax2: string; faxShow: boolean;
  email: string; emailShow: boolean;
  subEmail: string; subEmailDomain: string; subEmailSelect: string;
}
const EMPTY_AGENT: AgentLocal = {
  partyId: '', agentType: '변호사', litigationStructure: false,
  regNum1: '', regNum2: '',
  name: '', deliverySameAsParty: false,
  zipCode: '', addrRoad: '', addrDetail: '',
  addrDelivery: '',
  mobilePre: '010', mobile1: '', mobile2: '', mobileShow: false,
  telPre: '02', tel1: '', tel2: '', telShow: false,
  faxPre: '02', fax1: '', fax2: '', faxShow: false,
  email: '', emailShow: false,
  subEmail: '', subEmailDomain: '', subEmailSelect: '선택',
};


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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function initPostcode() {
      if (!containerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (window as any).daum.Postcode({
        oncomplete(data: { zonecode: string; roadAddress: string; jibunAddress: string }) {
          onSelect(data.zonecode, data.roadAddress || data.jibunAddress);
          onClose();
        },
        width: '100%',
        height: '100%',
      }).embed(containerRef.current);
    }

    if (typeof window !== 'undefined' && (window as any).daum?.Postcode) {
      initPostcode();
    } else {
      const script = document.createElement('script');
      script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.onload = initPostcode;
      document.head.appendChild(script);
    }
  }, [onSelect, onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: 560, borderRadius: 4, boxShadow: '0 4px 24px rgba(0,0,0,.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: TEAL, color: '#fff', padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>우편번호 / 주소 찾기</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div ref={containerRef} style={{ width: '100%', height: 480 }} />
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
  const purposeFileRef = useRef<HTMLInputElement>(null);
  const causeFileRef = useRef<HTMLInputElement>(null);
  const [purposeFileName, setPurposeFileName] = useState<string | null>(null);
  const [causeFileName, setCauseFileName] = useState<string | null>(null);
  // 입증서류 상태
  const evFileInputRef = useRef<HTMLInputElement>(null);
  const evDropRef = useRef<HTMLDivElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{id:string;name:string;size:number;checked:boolean}[]>([]);
  const [evidenceRows, setEvidenceRows] = useState<{id:string;checked:boolean;서증부호:string;가지부호:string;서증번호:number;가지번호:string;서류명:string;파일명:string;페이지번호1:string;페이지번호2:string}[]>([]);
  const [evAllChecked, setEvAllChecked] = useState(false);
  const [uploadAllChecked, setUploadAllChecked] = useState(false);
  const [가지번호분리, set가지번호분리] = useState(true);
  const [분리방법, set분리방법] = useState('서류개수');
  const [분리개수, set분리개수] = useState('');
  const [showRegModal, setShowRegModal] = useState(false);
  const [showAgentRegModal, setShowAgentRegModal] = useState(false);
  const [showPurposeRegModal, setShowPurposeRegModal] = useState(false);
  const [showCauseRegModal, setShowCauseRegModal] = useState(false);
  // 첨부서류 상태
  const attachFileInputRef = useRef<HTMLInputElement>(null);
  const [attachDocType, setAttachDocType] = useState('직접입력');
  const [attachDocName, setAttachDocName] = useState('');
  const [attachSameAsFile, setAttachSameAsFile] = useState(false);
  const [attachUploadedFiles, setAttachUploadedFiles] = useState<{id:string;name:string;size:number;checked:boolean}[]>([]);
  const [attachRows, setAttachRows] = useState<{id:string;번호:number;서류명:string;파일명:string;파일크기:number;등록일:string}[]>([]);
  const [attachAllChecked, setAttachAllChecked] = useState(false);
  const [showAttachRegModal, setShowAttachRegModal] = useState(false);

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

  function handleEvFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).map(f => ({ id: crypto.randomUUID(), name: f.name, size: f.size, checked: false }));
    setUploadedFiles(p => [...p, ...arr]);
  }

  function addToEvidenceList() {
    const toAdd = uploadedFiles;
    if (toAdd.length === 0) { alert('첨부된 파일이 없습니다.'); return; }
    const base = evidenceRows.length;
    const newRows = toAdd.map((f, i) => ({
      id: crypto.randomUUID(), checked: false,
      서증부호: '갑', 가지부호: '없-',
      서증번호: base + i + 1, 가지번호: '',
      서류명: f.name.replace(/\.[^.]+$/, ''), 파일명: f.name,
      페이지번호1: '', 페이지번호2: '',
    }));
    setEvidenceRows(p => [...p, ...newRows]);
    setUploadedFiles([]);
    upd({ evidences: [...data.evidences, ...newRows.map(r => ({ id: r.id, number: `갑 제${r.서증번호}호증`, name: r.서류명, purpose: '' }))] });
  }

  function doEvSplit() {
    if (!가지번호분리) return;
    setEvidenceRows(rows => {
      const updated = [...rows];
      if (분리방법 === '서류개수') {
        // 체크된 것들을 같은 서증번호(첫번째 서증번호)로, 가지번호 1,2,3...
        const checkedIdx = updated.map((r,i) => r.checked ? i : -1).filter(i => i >= 0);
        if (checkedIdx.length === 0) {
          // 전체 대상
          const baseNum = updated[0]?.서증번호 ?? 1;
          return updated.map((r, i) => ({ ...r, 서증번호: baseNum, 가지번호: String(i + 1) }));
        }
        const firstNum = updated[checkedIdx[0]].서증번호;
        checkedIdx.forEach((idx, i) => { updated[idx] = { ...updated[idx], 서증번호: firstNum, 가지번호: String(i + 1) }; });
      }
      return updated;
    });
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

      // 1) Supabase insert 시도 (테이블 없으면 localStorage 폴백)
      let recordId: string = crypto.randomUUID();
      const payload = {
        student_id: user!.id, user_name: user!.name,
        case_type: data.caseCategory || data.caseName, court: data.court,
        plaintiff: data.parties.find(p => p.role === '원고')?.name || '',
        defendant: data.parties.find(p => p.role === '피고')?.name || '',
        has_agent: data.hasAgent, evidence_count: data.evidences.length,
        score: 0, feedback: '채점 중...', complaint_data: data,
        case_id: assignedCase?.id || null,
        submitted_at: new Date().toISOString(),
      };

      let useLocal = false;
      const { data: inserted, error: insertError } = await supabase
        .from('practice_records')
        .insert(payload)
        .select('id').single();

      if (insertError) {
        // 테이블이 없거나 권한 오류 → localStorage 폴백
        useLocal = true;
        const localKey = 'ecfs_practice_records';
        const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
        existing.push({ id: recordId, ...payload });
        localStorage.setItem(localKey, JSON.stringify(existing));
      } else {
        recordId = inserted.id;
      }

      // 2) 채점 API 호출
      const gradeRes = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: data, sampleCase: effectiveCase }),
      });

      if (gradeRes.ok) {
        const g = await gradeRes.json();
        if (!useLocal) {
          await supabase.from('practice_records').update({
            score: g.score ?? 0, feedback: g.feedback ?? '', grade_breakdown: g.breakdown ?? null, graded_at: new Date().toISOString(),
          }).eq('id', recordId);
        } else {
          // localStorage에 채점 결과 업데이트
          const localKey = 'ecfs_practice_records';
          const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
          const idx = existing.findIndex((r: { id: string }) => r.id === recordId);
          if (idx >= 0) {
            existing[idx] = { ...existing[idx], score: g.score ?? 0, feedback: g.feedback ?? '', grade_breakdown: g.breakdown ?? null };
            localStorage.setItem(localKey, JSON.stringify(existing));
          }
        }
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
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>당사자 구분<span style={{ color: '#e53e3e' }}>*</span></th>
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
                            <button type="button" style={{ height: 24, padding: '0 9px', border: '1px solid #c8cdd6', background: '#fff', color: '#444', fontSize: 11, cursor: 'pointer', borderRadius: 2 }}>자주쓰는 당사자</button>
                          </div>
                        </td>
                      </tr>
                      {/* 인격 구분 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>인격 구분<span style={{ color: '#e53e3e' }}>*</span></th>
                        <td style={TD}>
                          <select value={partyForm.personType} onChange={e => setPartyForm(p => ({ ...p, personType: e.target.value as PartyLocal['personType'] }))} style={{ ...SEL, width: 200 }}>
                            <option value="individual">자연인</option>
                            <option value="corporation">법인</option>
                            <option value="unincorporated">권리능력없는법인(비법인)</option>
                            <option value="state">국가</option>
                            <option value="local">지방자치단체</option>
                          </select>
                        </td>
                      </tr>
                      {/* 국적 (법인/비법인/지방자치단체) */}
                      {(partyForm.personType === 'corporation' || partyForm.personType === 'unincorporated' || partyForm.personType === 'local') && (
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>국적<span style={{ color: '#e53e3e' }}>*</span></th>
                          <td style={TD}>
                            <select value={partyForm.nationality} onChange={e => setPartyForm(p => ({ ...p, nationality: e.target.value }))} style={{ ...SEL, width: 160 }}>
                              {['한국','미국','중국','일본','영국','독일','프랑스','기타'].map(n => <option key={n}>{n}</option>)}
                            </select>
                          </td>
                        </tr>
                      )}
                      {/* 사업자등록번호 (법인/비법인/지방자치단체) */}
                      {(partyForm.personType === 'corporation' || partyForm.personType === 'unincorporated' || partyForm.personType === 'local') && (
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>사업자등록번호</th>
                          <td style={TD}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', cursor: 'pointer', marginRight: 4 }}>
                                <input type="checkbox" checked={partyForm.bizRegNumShow} onChange={e => setPartyForm(p => ({ ...p, bizRegNumShow: e.target.checked }))} style={{ accentColor: TEAL }} />
                                제출문서에 보임
                              </label>
                              <input value={partyForm.bizRegNum1} onChange={e => setPartyForm(p => ({ ...p, bizRegNum1: e.target.value.replace(/\D/g,'').slice(0,3) }))} style={{ ...INP, width: 48 }} maxLength={3} placeholder="000" />
                              <span style={{ color: '#888' }}>-</span>
                              <input value={partyForm.bizRegNum2} onChange={e => setPartyForm(p => ({ ...p, bizRegNum2: e.target.value.replace(/\D/g,'').slice(0,2) }))} style={{ ...INP, width: 40 }} maxLength={2} placeholder="00" />
                              <span style={{ color: '#888' }}>-</span>
                              <input value={partyForm.bizRegNum3} onChange={e => setPartyForm(p => ({ ...p, bizRegNum3: e.target.value.replace(/\D/g,'').slice(0,5) }))} style={{ ...INP, width: 62 }} maxLength={5} placeholder="00000" />
                            </div>
                            {partyForm.role === '피고' && (
                              <div style={{ fontSize: 11, color: '#c0392b', lineHeight: 1.7, marginTop: 4, background: '#fff8f8', border: '1px solid #fdd', borderRadius: 2, padding: '5px 8px' }}>
                                ※ 주의<br />
                                피고가 법인인 경우 등을 함에 따라 성명 또는 신체에 대한 위해의 우려가 있는 경우에는 피고의 사업자등록번호를 기재하지 말고 별도의 개인정보 보호조치 신청에 따라 결정을 받은 이후에 제출하시기 바랍니다(다만, 위와 같은 사유가 없음에도 사업자등록번호를 기재하지 않으면 소송절차가 지연될 수 있습니다).
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                      {/* 법인등록번호 (법인/지방자치단체) */}
                      {(partyForm.personType === 'corporation' || partyForm.personType === 'local') && (
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>법인등록번호</th>
                          <td style={TD}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', cursor: 'pointer', marginRight: 4 }}>
                                <input type="checkbox" checked={partyForm.corpRegNumShow} onChange={e => setPartyForm(p => ({ ...p, corpRegNumShow: e.target.checked }))} style={{ accentColor: TEAL }} />
                                제출문서에 보임
                              </label>
                              <input value={partyForm.corpRegNum.slice(0,6)} onChange={e => setPartyForm(p => ({ ...p, corpRegNum: e.target.value.replace(/\D/g,'').slice(0,6) + p.corpRegNum.slice(6) }))} style={{ ...INP, width: 76 }} maxLength={6} />
                              <span style={{ color: '#888' }}>-</span>
                              <input value={partyForm.corpRegNum.slice(6)} onChange={e => setPartyForm(p => ({ ...p, corpRegNum: p.corpRegNum.slice(0,6) + e.target.value.replace(/\D/g,'').slice(0,7) }))} style={{ ...INP, width: 88 }} maxLength={7} />
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* 성명 / 이름 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>
                          이름<span style={{ color: '#e53e3e' }}>*</span>
                        </th>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <input
                              value={partyForm.personType === 'individual' ? partyForm.name : partyForm.corpName}
                              onChange={e => { const val = e.target.value; setPartyForm(p => p.personType === 'individual' ? { ...p, name: val } : { ...p, corpName: val }); }}
                              style={{ ...INP, width: 180 }}
                              placeholder={partyForm.personType === 'individual' ? '성명 입력' : '법인·단체명 입력'} />
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: '#555' }}>
                              <input type="checkbox" checked={partyForm.nameQualifier} onChange={e => setPartyForm(p => ({ ...p, nameQualifier: e.target.checked }))} style={{ accentColor: TEAL }} />
                              소장의 당사자자격 표시문구 추가
                            </label>
                            <button type="button" style={{ height: 26, padding: '0 10px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', color: '#444', fontSize: 11, cursor: 'pointer' }}>확인</button>
                          </div>
                          <div style={{ fontSize: 11, color: '#555', marginTop: 4, lineHeight: 1.7 }}>
                            ※ 서류의 당사자표시를 변경해야 할 경우 선택하시기 바랍니다.<br />
                            ※ 당사자겸란에 주민등록번호, 생년월일 등 개인정보가 입력되지 않도록 주의하여 주시기 바랍니다.
                          </div>
                        </td>
                      </tr>
                      {/* 주민등록번호 (자연인) */}
                      {partyForm.personType === 'individual' && (
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>주민등록번호</th>
                          <td style={TD}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', cursor: 'pointer', marginRight: 4 }}>
                                <input type="checkbox" checked={partyForm.regNumShow} onChange={e => setPartyForm(p => ({ ...p, regNumShow: e.target.checked }))} style={{ accentColor: TEAL }} />
                                제출문서에 보임
                              </label>
                              <input value={partyForm.regNum1} onChange={e => setPartyForm(p => ({ ...p, regNum1: e.target.value.replace(/\D/g,'').slice(0,6) }))} style={{ ...INP, width: 76 }} placeholder="000000" maxLength={6} />
                              <span style={{ color: '#888' }}>-</span>
                              <input value={partyForm.regNum2} onChange={e => setPartyForm(p => ({ ...p, regNum2: e.target.value.replace(/\D/g,'').slice(0,7) }))} style={{ ...INP, width: 88 }} type="password" placeholder="●●●●●●●" maxLength={7} />
                            </div>
                          </td>
                        </tr>
                      )}
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
                      {/* 대표자표시성명 (법인/국가/지방자치단체) */}
                      {(partyForm.personType === 'corporation' || partyForm.personType === 'state' || partyForm.personType === 'local') && (
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>대표자표시성명<span style={{ color: '#e53e3e' }}>*</span></th>
                          <td style={TD}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <select value={partyForm.repTitle} onChange={e => setPartyForm(p => ({ ...p, repTitle: e.target.value }))} style={{ ...SEL, width: 120 }}>
                                {['선택','대표이사','대표자','이사장','원장','장관','청장','단체장','시장','도지사','구청장'].map(t => <option key={t}>{t}</option>)}
                              </select>
                              <input value={partyForm.repName} onChange={e => setPartyForm(p => ({ ...p, repName: e.target.value }))} style={{ ...INP, width: 200 }} placeholder={partyForm.personType === 'state' ? '법률상 대표자 법무부장관' : '성명 입력'} />
                            </div>
                            <div style={{ fontSize: 11, color: '#555', lineHeight: 1.7 }}>
                              ※ 대표 표시를 대표자 성명과 함께 입력해 주십시오. 예)대표이사 최 OO<br />
                              ※ 대표자표시와 성명란에 주민등록번호, 생년월일 등 개인정보가 입력되지 않도록 주의하여 주시기 바랍니다.
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
                      {/* 외국어이름 (법인/비법인/지방자치단체) */}
                      {partyForm.personType !== 'individual' && (
                        <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                          <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>외국어이름</th>
                          <td style={TD}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <input value={partyForm.foreignName} onChange={e => setPartyForm(p => ({ ...p, foreignName: e.target.value }))} style={{ ...INP, width: 200 }} placeholder="외국어 이름 입력" />
                              <span style={{ fontSize: 11, color: '#888' }}>※ 당사자가 외국인 또는 법인인 경우 외국어(영어,한자) 이름의 병기가 필요요 입력하세요.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* 주소 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>주소<span style={{ color: '#e53e3e' }}>*</span></th>
                        <td style={TD}>
                          <div style={{ display: 'flex', gap: 12, marginBottom: 5 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: '#555' }}>
                              <input type="checkbox" checked={partyForm.addrForeign} onChange={e => setPartyForm(p => ({ ...p, addrForeign: e.target.checked }))} style={{ accentColor: TEAL }} />
                              국내주소가 아닌경우, 우편번호조회 없이 직접입력하세요.
                            </label>
                            {partyForm.role === '피고' && (
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: '#555' }}>
                                <input type="checkbox" checked={partyForm.addrUnknown}
                                  onChange={e => {
                                    const chk = e.target.checked;
                                    setPartyForm(p => ({ ...p, addrUnknown: chk, zipCode: chk ? '00000' : p.zipCode, addrRoad: chk ? '주소불명' : (p.addrRoad === '주소불명' ? '' : p.addrRoad), addrDetail: chk ? '' : p.addrDetail }));
                                  }}
                                  style={{ accentColor: TEAL }} />
                                피고의 주소를 모르는 경우 체크하세요.
                              </label>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                            <input value={partyForm.zipCode} readOnly={!partyForm.addrForeign} placeholder="우편번호" style={{ ...INP, width: 76, background: partyForm.addrForeign ? '#fff' : '#f5f5f5', color: '#555' }} onChange={e => partyForm.addrForeign && setPartyForm(p => ({ ...p, zipCode: e.target.value }))} />
                            {!partyForm.addrForeign && <button onClick={() => setZipTarget('party')} style={{ height: 28, padding: '0 10px', border: `1px solid ${TEAL}`, borderRadius: 2, background: '#fff', color: TEAL, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>우편번호 찾기 &gt;</button>}
                          </div>
                          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                            <input value={partyForm.addrRoad} onChange={e => setPartyForm(p => ({ ...p, addrRoad: e.target.value }))} placeholder="도로명 주소" style={{ ...INP, flex: 1 }} />
                            <input value={partyForm.addrDetail} onChange={e => setPartyForm(p => ({ ...p, addrDetail: e.target.value }))} placeholder="상세주소" style={{ ...INP, width: 160 }} />
                          </div>
                          <div style={{ fontSize: 11, color: '#555' }}>※ 상세주소 표기 방법 : 동·호수 등 + (동명, 아파트/건물명)</div>
                        </td>
                      </tr>
                      {/* 송달장소 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>송달장소<span style={{ color: '#e53e3e' }}>*</span></th>
                        <td style={TD}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12 }}>
                            <input type="checkbox" checked={partyForm.deliverySameAsAddr} onChange={e => setPartyForm(p => ({ ...p, deliverySameAsAddr: e.target.checked, addrDelivery: e.target.checked ? '' : p.addrDelivery }))} style={{ accentColor: TEAL }} />
                            위 주소와 동일
                          </label>
                          {!partyForm.deliverySameAsAddr && (
                            <input value={partyForm.addrDelivery} onChange={e => setPartyForm(p => ({ ...p, addrDelivery: e.target.value }))} placeholder="주소와 다른 경우 입력" style={{ ...INP, width: '100%', maxWidth: 360, marginTop: 5 }} />
                          )}
                        </td>
                      </tr>
                      {/* 연락처 */}
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }} rowSpan={3}>연락처</th>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', cursor: 'pointer', width: 100 }}>
                              <input type="checkbox" checked={partyForm.mobileShow} onChange={e => setPartyForm(p => ({ ...p, mobileShow: e.target.checked }))} style={{ accentColor: TEAL }} />
                              제출문서에 보임
                            </label>
                            <span style={{ fontSize: 11, color: '#555', minWidth: 70 }}>휴대전화번호</span>
                            <select value={partyForm.mobilePre} onChange={e => setPartyForm(p => ({ ...p, mobilePre: e.target.value }))} style={{ ...SEL, width: 70 }}>
                              <option value="">선택</option>
                              {['010','011','016','017','018','019'].map(v => <option key={v}>{v}</option>)}
                            </select>
                            <input value={partyForm.mobile1} onChange={e => setPartyForm(p => ({ ...p, mobile1: e.target.value.replace(/\D/g,'').slice(0,4) }))} style={{ ...INP, width: 56 }} maxLength={4} />
                            <input value={partyForm.mobile2} onChange={e => setPartyForm(p => ({ ...p, mobile2: e.target.value.replace(/\D/g,'').slice(0,4) }))} style={{ ...INP, width: 56 }} maxLength={4} />
                          </div>
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', cursor: 'pointer', width: 100 }}>
                              <input type="checkbox" checked={partyForm.telShow} onChange={e => setPartyForm(p => ({ ...p, telShow: e.target.checked }))} style={{ accentColor: TEAL }} />
                              제출문서에 보임
                            </label>
                            <span style={{ fontSize: 11, color: '#555', minWidth: 70 }}>전화번호(선택)</span>
                            <select value={partyForm.telPre} onChange={e => setPartyForm(p => ({ ...p, telPre: e.target.value }))} style={{ ...SEL, width: 70 }}>
                              <option value="">선택</option>
                              {['02','031','032','033','041','042','043','044','051','052','053','054','055','061','062','063','064'].map(v => <option key={v}>{v}</option>)}
                            </select>
                            <input value={partyForm.tel1} onChange={e => setPartyForm(p => ({ ...p, tel1: e.target.value.replace(/\D/g,'').slice(0,4) }))} style={{ ...INP, width: 56 }} maxLength={4} />
                            <input value={partyForm.tel2} onChange={e => setPartyForm(p => ({ ...p, tel2: e.target.value.replace(/\D/g,'').slice(0,4) }))} style={{ ...INP, width: 56 }} maxLength={4} />
                          </div>
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', cursor: 'pointer', width: 100 }}>
                              <input type="checkbox" checked={partyForm.faxShow} onChange={e => setPartyForm(p => ({ ...p, faxShow: e.target.checked }))} style={{ accentColor: TEAL }} />
                              제출문서에 보임
                            </label>
                            <span style={{ fontSize: 11, color: '#555', minWidth: 70 }}>팩스번호(선택)</span>
                            <select value={partyForm.faxPre} onChange={e => setPartyForm(p => ({ ...p, faxPre: e.target.value }))} style={{ ...SEL, width: 70 }}>
                              <option value="">선택</option>
                              {['02','031','032','033','041','042','043','044','051','052','053','054','055','061','062','063','064'].map(v => <option key={v}>{v}</option>)}
                            </select>
                            <input value={partyForm.fax1} onChange={e => setPartyForm(p => ({ ...p, fax1: e.target.value.replace(/\D/g,'').slice(0,4) }))} style={{ ...INP, width: 56 }} maxLength={4} />
                            <input value={partyForm.fax2} onChange={e => setPartyForm(p => ({ ...p, fax2: e.target.value.replace(/\D/g,'').slice(0,4) }))} style={{ ...INP, width: 56 }} maxLength={4} />
                          </div>
                        </td>
                      </tr>
                      {/* 이메일 */}
                      <tr>
                        <th style={{ ...TH, width: 110, background: '#f0f4f8' }}>이메일</th>
                        <td style={TD}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <input value={partyForm.email} onChange={e => setPartyForm(p => ({ ...p, email: e.target.value }))} style={{ ...INP, width: 110 }} placeholder="계정" />
                            <span style={{ fontSize: 12 }}>@</span>
                            <input value={partyForm.emailDomain === '직접입력' ? '' : partyForm.emailDomain} onChange={e => setPartyForm(p => ({ ...p, emailDomain: e.target.value }))} style={{ ...INP, width: 110 }} placeholder="직접입력" />
                            <select value={EMAIL_DOMAINS.includes(partyForm.emailDomain) ? partyForm.emailDomain : '직접입력'} onChange={e => setPartyForm(p => ({ ...p, emailDomain: e.target.value }))} style={{ ...SEL, width: 80 }}>
                              {EMAIL_DOMAINS.map(d => <option key={d}>{d}</option>)}
                            </select>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', cursor: 'pointer' }}>
                              <input type="checkbox" checked={partyForm.emailShow} onChange={e => setPartyForm(p => ({ ...p, emailShow: e.target.checked }))} style={{ accentColor: TEAL }} />
                              제출문서에 보임
                            </label>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, paddingTop: 10 }}>
                    <button onClick={() => setPartyForm(EMPTY_PARTY)} style={{ height: 30, padding: '0 16px', border: '1px solid #c8cdd6', background: '#fff', color: '#555', borderRadius: 2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>↺ 초기화</button>
                    <button onClick={addParty} style={{ height: 30, padding: '0 18px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>✏ 등록</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ③ 대리인 */}
          <div id="sec-s3" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="③ 대리인" open={open.s3} toggle={() => toggle('s3')} />
            {open.s3 && (
              <div style={{ padding: '12px 14px 16px' }}>
                {/* 대리인 목록 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>• 대리인 목록 <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>ⓘ</span></span>
                  <button style={{ height: 26, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333' }}>순서저장</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', marginBottom: 10 }}>
                  <thead>
                    <tr style={{ background: '#f5f7fb' }}>
                      {['대리인구분','이름(사무소이름이다)','대리인성세','당사자구분','당사자','알림서비스','순서변번','삭제'].map(h => (
                        <th key={h} style={{ padding: '6px 8px', fontSize: 11, fontWeight: 700, color: '#333', borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan={8} style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: '#888' }}>총 0명</td></tr>
                  </tbody>
                </table>

                {/* 대리인 정보 입력 */}
                <div style={{ fontSize: 13, fontWeight: 700, color: '#222', marginBottom: 8 }}>• 대리인 정보입력</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                  <tbody>
                    {/* 당사자 */}
                    <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                      <th style={{ ...TH, width: 120 }}>당사자</th>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select value={agentForm.partyId} onChange={e => setAgentForm(p => ({ ...p, partyId: e.target.value }))} style={{ ...SEL, width: 180 }}>
                            <option value="">당사자선택</option>
                            {data.parties.map(p => <option key={p.id} value={p.id}>{p.role} - {p.name}</option>)}
                          </select>
                          <button onClick={() => {
                            if (!user) return;
                            // 휴대전화 파싱: "010-2111-3077"
                            const mobParts = (user.mobile || user.tel || '').split('-');
                            const mobilePre = mobParts[0] || '010';
                            const mobile1 = mobParts[1] || '';
                            const mobile2 = mobParts[2] || '';
                            // 전화번호 파싱
                            const telParts = (user.tel || '').split('-');
                            const telPre = telParts[0] || '02';
                            const tel1 = telParts[1] || '';
                            const tel2 = telParts[2] || '';
                            // 팩스 파싱
                            const faxParts = (user.fax || '').split('-');
                            const faxPre = faxParts[0] || '02';
                            const fax1 = faxParts[1] || '';
                            const fax2 = faxParts[2] || '';
                            // 이메일 파싱
                            const emailParts = (user.email || '').split('@');
                            setAgentForm(p => ({
                              ...p,
                              agentType: '변호사',
                              name: user.name,
                              regNum1: user.barNum || '',
                              regNum2: user.barNum2 || '',
                              zipCode: user.zipCode || '',
                              addrRoad: user.addr || '',
                              addrDetail: user.addrDetail || '',
                              mobilePre, mobile1, mobile2, mobileShow: false,
                              telPre, tel1, tel2, telShow: false,
                              faxPre, fax1, fax2, faxShow: false,
                              email: user.email || '',
                              emailShow: false,
                              subEmail: emailParts[0] || '',
                              subEmailDomain: emailParts[1] || '',
                              subEmailSelect: '선택',
                            }));
                            upd({ hasAgent: true, agentName: user.name, agentType: '변호사' });
                          }} style={{ height: 28, padding: '0 10px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>내정보가져오기</button>
                          <button style={{ height: 28, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333' }}>비회원</button>
                        </div>
                      </td>
                    </tr>
                    {/* 대리인구분 */}
                    <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                      <th style={TH}>대리인구분 <span style={{ color: '#e53e3e' }}>*</span></th>
                      <td style={TD}>
                        <select value={agentForm.agentType} onChange={e => { setAgentForm(p => ({ ...p, agentType: e.target.value })); upd({ agentType: e.target.value }); }} style={{ ...SEL, width: 160 }}>
                          {['변호사','법무사','국선대리인','법정대리인','임의대리인'].map(v => <option key={v}>{v}</option>)}
                        </select>
                        <div style={{ marginTop: 5, fontSize: 11, color: '#555', lineHeight: 1.7 }}>
                          ※ 전자소송에서 소재대리인은 본인 인증된 법원전자소송으로 등록 인구를 등록 할 수 없습니다. 소재서류에서 개인대리인의 자격 소 소 등의 출력으로는: 선생규범으로 주원할 수 있는: 서류의 (기계관련소시) 건의 등의: 선택서비스 <span style={{ color: '#c00', fontWeight: 700 }}>선생적분 및 소송법인으로 제출하여야 수시가 바랍니다.</span><br />
                          ※ 대리인의 등록 사용여부가 아닌 경우에는: 비로변명 확인을 클릭하고 입력하시기 바랍니다.
                        </div>
                      </td>
                    </tr>
                    {/* 소송구조 선정대리인여부 */}
                    <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                      <th style={TH}>소송구조<br />선정대리인여부</th>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: 18 }}>
                          {[['예', true], ['아니오', false]].map(([lbl, val]) => (
                            <label key={String(val)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                              <input type="radio" name="litigationStructure" checked={agentForm.litigationStructure === val} onChange={() => setAgentForm(p => ({ ...p, litigationStructure: val as boolean }))} style={{ accentColor: TEAL }} />
                              {lbl as string}
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                    {/* 수임등록번호 */}
                    <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                      <th style={TH}>수임등록번호</th>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                          <input value={agentForm.regNum1} onChange={e => setAgentForm(p => ({ ...p, regNum1: e.target.value }))} style={{ ...INP, width: 80 }} placeholder="등록번호" />
                          <span style={{ fontSize: 12 }}>-</span>
                          <input value={agentForm.regNum2} onChange={e => setAgentForm(p => ({ ...p, regNum2: e.target.value }))} style={{ ...INP, width: 80 }} placeholder="------" />
                          <button style={{ height: 28, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333' }}>사용자정보 확인</button>
                        </div>
                        <div style={{ fontSize: 11, color: '#555' }}>※ 민사소송규칙 제75조의2, 법원 행사서 사무서규칙 제5조의제에 그거예로 수임, 이용합니다.</div>
                      </td>
                    </tr>
                    {/* 대리인명 */}
                    <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                      <th style={TH}>대리인명 <span style={{ color: '#e53e3e' }}>*</span></th>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input value={agentForm.name} onChange={e => { setAgentForm(p => ({ ...p, name: e.target.value })); upd({ agentName: e.target.value }); }} style={{ ...INP, width: 160 }} placeholder="대리인 성명" />
                          <span style={{ fontSize: 11, color: '#555' }}>(법무법인코드)</span>
                        </div>
                        <div style={{ marginTop: 5 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                            <input type="checkbox" checked={agentForm.deliverySameAsParty} onChange={e => setAgentForm(p => ({ ...p, deliverySameAsParty: e.target.checked }))} style={{ accentColor: TEAL }} />
                            당사자 송달장소와 동일
                          </label>
                        </div>
                        <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>※ 대리인명에 주민등록번호, 세변(법등 등 개인정보가 입력되지 않도록 주의 하여 추가가 거사가 됩니다.</div>
                      </td>
                    </tr>
                    {/* 송달장소 */}
                    {!agentForm.deliverySameAsParty && (
                      <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                        <th style={TH}>송달장소 <span style={{ color: '#e53e3e' }}>*</span></th>
                        <td style={TD}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                            <input value={agentForm.zipCode} readOnly placeholder="우편번호" style={{ ...INP, width: 76, background: '#f5f5f5', color: '#555' }} />
                            <button onClick={() => setZipTarget('agent')} style={{ height: 28, padding: '0 10px', border: `1px solid ${TEAL}`, borderRadius: 2, background: '#fff', color: TEAL, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>우편번호 찾기 &gt;</button>
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                            <input value={agentForm.addrRoad} onChange={e => setAgentForm(p => ({ ...p, addrRoad: e.target.value }))} placeholder="도로명 주소" style={{ ...INP, width: 240 }} />
                            <input value={agentForm.addrDetail} onChange={e => setAgentForm(p => ({ ...p, addrDetail: e.target.value }))} placeholder="상세주소 (예:성성동, 성성빌딩)" style={{ ...INP, width: 200 }} />
                          </div>
                          <div style={{ fontSize: 11, color: '#555' }}>※ 상세주소 표기 방법 : 동·호수 및 + (동, 아파트/건물명)</div>
                        </td>
                      </tr>
                    )}
                    {/* 송달장소와 아니다 */}
                    <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                      <th style={TH}>송달장소와 아니다</th>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input value={agentForm.addrDelivery} onChange={e => setAgentForm(p => ({ ...p, addrDelivery: e.target.value }))} style={{ ...INP, width: 280 }} placeholder="별도 송달장소 입력" />
                          <button style={{ height: 28, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333' }}>사용자에대리대방</button>
                        </div>
                      </td>
                    </tr>
                    {/* 연락처 - rowSpan 3 */}
                    <tr style={{ borderBottom: '1px solid #e0e6ee' }}>
                      <th style={{ ...TH, verticalAlign: 'middle' }} rowSpan={3}>연락처 <span style={{ color: '#e53e3e' }}>*</span></th>
                      <td style={{ ...TD, borderBottom: '1px solid #e0e6ee' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={agentForm.mobileShow} onChange={e => setAgentForm(p => ({ ...p, mobileShow: e.target.checked }))} style={{ accentColor: TEAL }} />제출문서에 보임
                          </label>
                          <span style={{ fontSize: 11, color: '#555', minWidth: 72 }}>휴대전화번호</span>
                          <select value={agentForm.mobilePre} onChange={e => setAgentForm(p => ({ ...p, mobilePre: e.target.value }))} style={{ ...SEL, width: 64 }}>
                            {['010','011','016','017','018','019'].map(v => <option key={v}>{v}</option>)}
                          </select>
                          <input value={agentForm.mobile1} onChange={e => setAgentForm(p => ({ ...p, mobile1: e.target.value }))} style={{ ...INP, width: 68 }} maxLength={4} />
                          <input value={agentForm.mobile2} onChange={e => setAgentForm(p => ({ ...p, mobile2: e.target.value }))} style={{ ...INP, width: 68 }} maxLength={4} />
                        </div>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e0e6ee' }}>
                      <td style={{ ...TD, borderBottom: '1px solid #e0e6ee' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={agentForm.telShow} onChange={e => setAgentForm(p => ({ ...p, telShow: e.target.checked }))} style={{ accentColor: TEAL }} />제출문서에 보임
                          </label>
                          <span style={{ fontSize: 11, color: '#555', minWidth: 72 }}>전화번호(선택)</span>
                          <select value={agentForm.telPre} onChange={e => setAgentForm(p => ({ ...p, telPre: e.target.value }))} style={{ ...SEL, width: 64 }}>
                            {['02','031','032','033','041','042','043','044','051','052','053','054','055','061','062','063','064'].map(v => <option key={v}>{v}</option>)}
                          </select>
                          <input value={agentForm.tel1} onChange={e => setAgentForm(p => ({ ...p, tel1: e.target.value }))} style={{ ...INP, width: 68 }} maxLength={4} />
                          <input value={agentForm.tel2} onChange={e => setAgentForm(p => ({ ...p, tel2: e.target.value }))} style={{ ...INP, width: 68 }} maxLength={4} />
                        </div>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={agentForm.faxShow} onChange={e => setAgentForm(p => ({ ...p, faxShow: e.target.checked }))} style={{ accentColor: TEAL }} />제출문서에 보임
                          </label>
                          <span style={{ fontSize: 11, color: '#555', minWidth: 72 }}>팩스번호(선택)</span>
                          <select value={agentForm.faxPre} onChange={e => setAgentForm(p => ({ ...p, faxPre: e.target.value }))} style={{ ...SEL, width: 64 }}>
                            {['02','031','032','033','041','042','043','044','051','052','053','054','055','061','062','063','064'].map(v => <option key={v}>{v}</option>)}
                          </select>
                          <input value={agentForm.fax1} onChange={e => setAgentForm(p => ({ ...p, fax1: e.target.value }))} style={{ ...INP, width: 68 }} maxLength={4} />
                          <input value={agentForm.fax2} onChange={e => setAgentForm(p => ({ ...p, fax2: e.target.value }))} style={{ ...INP, width: 68 }} maxLength={4} />
                        </div>
                      </td>
                    </tr>
                    {/* 이메일 */}
                    <tr style={{ borderBottom: '1px solid #e8edf4' }}>
                      <th style={TH}>이메일 <span style={{ color: '#e53e3e' }}>*</span></th>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input value={agentForm.email} onChange={e => setAgentForm(p => ({ ...p, email: e.target.value }))} style={{ ...INP, width: 220 }} placeholder="이메일 주소 입력" />
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
                            <input type="checkbox" checked={agentForm.emailShow} onChange={e => setAgentForm(p => ({ ...p, emailShow: e.target.checked }))} style={{ accentColor: TEAL }} />제출문서에 보임
                          </label>
                        </div>
                      </td>
                    </tr>
                    {/* 보조이메일 */}
                    <tr>
                      <th style={TH}>보조이메일</th>
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input value={agentForm.subEmail} onChange={e => setAgentForm(p => ({ ...p, subEmail: e.target.value }))} style={{ ...INP, width: 130 }} placeholder="계정" />
                          <span style={{ fontSize: 12 }}>@</span>
                          <input value={agentForm.subEmailDomain} onChange={e => setAgentForm(p => ({ ...p, subEmailDomain: e.target.value }))} style={{ ...INP, width: 130 }} placeholder="도메인 직접입력" />
                          <select value={agentForm.subEmailSelect} onChange={e => setAgentForm(p => ({ ...p, subEmailSelect: e.target.value }))} style={{ ...SEL, width: 80 }}>
                            <option>선택</option>
                            {['naver.com','gmail.com','daum.net','kakao.com','hanmail.net','nate.com'].map(d => <option key={d}>{d}</option>)}
                          </select>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 참고하세요 박스 */}
                <div style={{ marginTop: 14, border: '1px solid #d0d8e4', borderRadius: 3, background: '#f8f9fb', padding: '12px 16px', display: 'flex', gap: 12 }}>
                  <div style={{ fontSize: 20, color: '#aaa', flexShrink: 0, marginTop: 2 }}>🖶</div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'disc', paddingLeft: 16, fontSize: 11, color: '#555', lineHeight: 1.9 }}>
                    <li>법대전화번호에 대리인수는 사용자의 정보를 변경하고자 하는 경우, <span style={{ color: TEAL, textDecoration: 'underline', cursor: 'pointer' }}>사용자 정보보관</span> 메뉴에서 먼저 변경하셔야 합니다.</li>
                    <li>대리인이 대리인 목록에서 사무직원 이면 선택하지 않은 경우, 사건 상세의 법법서비스를 제공합니다.</li>
                    <li>사건이 배당될 수수리가 적용되는 법법서비스 제공이 가능합니다.</li>
                    <li>사용자정보에서 휴대전화번호로 주로 변경된 경우 전화하고 오는 사건이 접수세서서 발생하는 휴대전화번호로 저장된 이 이루어집니다.</li>
                  </ul>
                </div>

                {/* 초기화 / 대리인 등록 버튼 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                  <button onClick={() => setAgentForm(EMPTY_AGENT)} style={{ height: 32, padding: '0 16px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 12, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 5 }}>
                    ↺ 초기화
                  </button>
                  <button onClick={() => { upd({ hasAgent: true, agentName: agentForm.name, agentType: agentForm.agentType }); setShowAgentRegModal(true); }} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 2, background: '#1a3a6b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    ✎ 대리인 등록
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ④ 청구취지 */}
          <div id="sec-s4" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="④ 청구취지" open={open.s4} toggle={() => toggle('s4')} />
            {open.s4 && (
              <div style={{ padding: '12px 14px 14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                  <tbody>
                    <tr>
                      <th style={{ ...TH, verticalAlign: 'top', paddingTop: 11, width: 120 }}>청구취지<span style={{ color: '#e53e3e' }}>*</span></th>
                      <td style={{ ...TD, verticalAlign: 'top', paddingTop: 10 }}>
                        {/* 상단: 작성예시참고 + 바이트 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <button style={{ height: 24, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>
                            🗒 작성예시참고
                          </button>
                          <span style={{ fontSize: 11, color: '#888' }}>( {new TextEncoder().encode(data.claimPurpose).length} / 6000 Bytes )</span>
                        </div>
                        <textarea
                          value={data.claimPurpose}
                          onChange={e => upd({ claimPurpose: e.target.value })}
                          rows={6}
                          style={{ width: '100%', padding: '7px 8px', border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 12, lineHeight: 1.8, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                          placeholder={'피고는 원고에게 △△△△△△△△△△원과 이에 대하여 △△△△. △△. △△.부터 이 사건 소장 부본을 송달받는 날까지는 연 △△%의,\n그 다음날부터 다 갚는 날까지는 연 △△%의 각 비율로 계산한 돈을 지급하라.\n※ 자연손해금의 청구는 원고가 △△△△. △△. △△.까지 소유권이전 및 인도를 완료한 경우에 가능'}
                        />
                        {/* 청구취지별지 첨부하기 */}
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => purposeFileRef.current?.click()} style={{ height: 26, padding: '0 12px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>
                            📎 청구취지별지 첨부하기
                          </button>
                          {purposeFileName && <span style={{ fontSize: 11, color: TEAL }}>{purposeFileName}</span>}
                          <input ref={purposeFileRef} type="file" style={{ display: 'none' }} accept=".hwp,.hwpx,.doc,.docx,.pdf,.txt,.bmp,.jpg,.jpeg,.gif,.tif,.tiff,.png" onChange={e => setPurposeFileName(e.target.files?.[0]?.name ?? null)} />
                        </div>
                        <div style={{ marginTop: 5, fontSize: 11, color: TEAL, lineHeight: 1.7 }}>
                          ※ 첨부가능한 파일 형식 : HWP, HWPX, DOC, DOCX, PDF, TXT, BMP, JPG, JPEG, GIF, TIF, TIFF, PNG (PDF파일로 자동변환, 20MB까지 첨부가능)
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button onClick={() => { upd({ claimPurpose: data.claimPurpose }); setShowPurposeRegModal(true); }} style={{ height: 32, padding: '0 20px', border: 'none', borderRadius: 2, background: '#1a3a6b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    ✎ 등록
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ⑤ 청구원인 */}
          <div id="sec-s5" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="⑤ 청구원인" open={open.s5} toggle={() => toggle('s5')} />
            {open.s5 && (
              <div style={{ padding: '12px 14px 14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                  <tbody>
                    <tr>
                      <th style={{ ...TH, verticalAlign: 'top', paddingTop: 11, width: 120 }}>청구원인<span style={{ color: '#e53e3e' }}>*</span></th>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        {/* 탭 */}
                        <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
                          {(['direct','facts'] as const).map(tab => (
                            <button key={tab} onClick={() => setCauseTab(tab)} style={{ height: 28, padding: '0 14px', border: `1px solid ${causeTab === tab ? TEAL : '#c8cdd6'}`, borderRadius: '2px 2px 0 0', background: causeTab === tab ? TEAL : '#f5f7fb', color: causeTab === tab ? '#fff' : '#555', fontWeight: causeTab === tab ? 700 : 400, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                              {tab === 'direct' ? '직접입력' : '요건사실'}
                            </button>
                          ))}
                        </div>
                        {/* 에디터 박스 */}
                        <div style={{ border: '1px solid #c8cdd6', borderRadius: '0 2px 2px 2px' }}>
                          {/* 툴바 행 1 */}
                          <div style={{ background: '#f0f3f8', borderBottom: '1px solid #dde0e6', padding: '3px 6px', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            {['🗋','💾','✕','⧉','📋','🗑'].map((ic,i) => (
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
                          {/* 툴바 행 2: 글꼴/크기 */}
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
                                ref={causeRef}
                                contentEditable
                                suppressContentEditableWarning
                                onInput={() => { if (causeRef.current) upd({ claimCause: causeRef.current.innerText }); }}
                                style={{ minHeight: 160, padding: '9px 12px', fontSize: 12, fontFamily: "'맑은 고딕',sans-serif", lineHeight: 1.8, outline: 'none', background: '#fff', color: '#222' }}
                                data-placeholder="청구원인을 입력하세요. (한글 2000자 이내, 표나 그림은 내용파일첨부를 이용)"
                              />
                              <div style={{ background: '#f7f8fb', borderTop: '1px solid #e5e8ee', padding: '3px 10px', textAlign: 'right', fontSize: 11, color: '#888' }}>글자: {data.claimCause.length}/2000</div>
                            </>
                          ) : (
                            <div style={{ padding: '14px' }}>
                              {['1. 당사자 관계', '2. 계약 체결 사실', '3. 이행 청구 근거', '4. 손해 발생 사실'].map((label, i) => (
                                <div key={i} style={{ marginBottom: 10 }}>
                                  <label style={{ fontSize: 12, fontWeight: 600, color: '#333', display: 'block', marginBottom: 3 }}>{label}</label>
                                  <textarea rows={2} style={{ width: '100%', padding: '5px 8px', border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 12, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} placeholder={`${label} 입력`} />
                                </div>
                              ))}
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
                          ※ 청구원인을 청구취지를 별첨하는 주장사실만 기재하여 작성하시고, 청구원인 이외의 다른 기재내용은 첨부되지 않도록 하여 주시기 바랍니다.
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button onClick={() => { upd({ claimCause: data.claimCause }); setShowCauseRegModal(true); }} style={{ height: 32, padding: '0 20px', border: 'none', borderRadius: 2, background: '#1a3a6b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    ✎ 등록
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ⑥ 입증서류 */}
          <div id="sec-s6" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="⑥ 입증서류" open={open.s6} toggle={() => toggle('s6')} />
            {open.s6 && (
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
                        {/* 파일찾기/삭제 버튼 */}
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
                                <td style={{ padding: '5px 8px', fontSize: 12, borderRight: '1px solid #eaecf4', textAlign: 'right', color: '#555' }}>{f.size < 1024 ? `${f.size} Bytes` : `${(f.size/1024).toFixed(0)} KB`}</td>
                                <td style={{ padding: '5px', borderRight: '1px solid #eaecf4', textAlign: 'center' }}>
                                  <button onClick={() => setUploadedFiles(p => { const a=[...p]; if(i>0)[a[i],a[i-1]]=[a[i-1],a[i]]; return a; })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10, marginRight: 2 }}>▲</button>
                                  <button onClick={() => setUploadedFiles(p => { const a=[...p]; if(i<a.length-1)[a[i],a[i+1]]=[a[i+1],a[i]]; return a; })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10 }}>▼</button>
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
                          ref={evDropRef}
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
                  <button onClick={addToEvidenceList} style={{ height: 30, padding: '0 14px', border: '1px solid #1a3a6b', borderRadius: 2, background: '#1a3a6b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>목록에 추가</button>
                </div>

                {/* 입증서류목록 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>• 입증서류목록 <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>ⓘ</span></span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['전자발급 서류 첨부하기','서증등록목록삭제','서증등록목록조회','서증입력파일 등록'].map((lbl,i) => (
                      <button key={i} style={{ height: 26, padding: '0 8px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 3 }}>
                        {['📋','🗑','🔍','📄'][i]} {lbl}
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
                      {['서증부호*','가지부호','서증번호*','가지번호','서류명*','파일명','페이지번호','입증취지 등','삭제'].map(h => (
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
                          <input value={String(row.서증번호)} onChange={e => setEvidenceRows(p => p.map(r => r.id === row.id ? { ...r, 서증번호: Number(e.target.value)||0 } : r))} style={{ ...INP, width: 36, textAlign: 'center', padding: '0 3px' }} />
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

                {/* 등록 버튼 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button onClick={() => setShowRegModal(true)} style={{ height: 32, padding: '0 20px', border: 'none', borderRadius: 2, background: '#1a3a6b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    ✎ 등록
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 등록 완료 모달 */}
          {showRegModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#fff', width: 340, borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.3)' }}>
                <div style={{ background: '#1a3a6b', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>설명</div>
                <div style={{ padding: '30px 20px', textAlign: 'center', fontSize: 13, color: '#333' }}>등록되었습니다.</div>
                <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
                  <button onClick={() => setShowRegModal(false)} style={{ height: 32, padding: '0 32px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>확인</button>
                </div>
              </div>
            </div>
          )}

          {/* 대리인 등록 모달 */}
          {showAgentRegModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#fff', width: 340, borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.3)' }}>
                <div style={{ background: '#1a3a6b', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>설명</div>
                <div style={{ padding: '30px 20px', textAlign: 'center', fontSize: 13, color: '#333' }}>등록되었습니다.</div>
                <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
                  <button onClick={() => setShowAgentRegModal(false)} style={{ height: 32, padding: '0 32px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>확인</button>
                </div>
              </div>
            </div>
          )}

          {/* 청구취지 등록 모달 */}
          {showPurposeRegModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#fff', width: 340, borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.3)' }}>
                <div style={{ background: '#1a3a6b', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>설명</div>
                <div style={{ padding: '30px 20px', textAlign: 'center', fontSize: 13, color: '#333' }}>등록되었습니다.</div>
                <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
                  <button onClick={() => setShowPurposeRegModal(false)} style={{ height: 32, padding: '0 32px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>확인</button>
                </div>
              </div>
            </div>
          )}

          {/* 청구원인 등록 모달 */}
          {showCauseRegModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#fff', width: 340, borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.3)' }}>
                <div style={{ background: '#1a3a6b', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>설명</div>
                <div style={{ padding: '30px 20px', textAlign: 'center', fontSize: 13, color: '#333' }}>등록되었습니다.</div>
                <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
                  <button onClick={() => setShowCauseRegModal(false)} style={{ height: 32, padding: '0 32px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>확인</button>
                </div>
              </div>
            </div>
          )}

          {/* ⑦ 첨부서류 */}
          <div id="sec-s7" style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 5, borderRadius: 2 }}>
            <SecHd label="⑦ 첨부서류" open={open.s7} toggle={() => toggle('s7')} />
            {open.s7 && (
              <div style={{ padding: '12px 14px 16px' }}>
                {/* 안내문 */}
                <div style={{ fontSize: 11, color: '#333', lineHeight: 2, marginBottom: 10 }}>
                  <div>• 첨부서류로 제출한 문서는 증거로 사용될 수 없으며, 판결(결정) 등에 효력이 없습니다.</div>
                  <div>• 소송대리허가신청서 및 기타 신청서는 소장과 별도의 서류로 제출하여야 하므로 첨부서류에 포함되지 않도록 유의하여 주시기 바랍니다.</div>
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
                              if (v !== '직접입력') setAttachDocName(`${v} (입력 가능)`);
                              else setAttachDocName('');
                            }}
                            style={{ ...SEL, width: 200 }}
                          >
                            {['직접입력','법인등기사항증명서','주민등록등본','소송위임장','담당변호사지정서','소가계산서','토지대장등본','건축물대장등본'].map(v => (
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
                        {/* 파일찾기/삭제 */}
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
                                <td style={{ padding: '5px 8px', fontSize: 12, borderRight: '1px solid #eaecf4', textAlign: 'right', color: '#555' }}>{f.size < 1024 ? `${f.size} Bytes` : `${(f.size/1024).toFixed(0)} KB`}</td>
                                <td style={{ padding: '5px', borderRight: '1px solid #eaecf4', textAlign: 'center' }}>
                                  <button onClick={() => setAttachUploadedFiles(p => { const a=[...p]; if(i>0)[a[i],a[i-1]]=[a[i-1],a[i]]; return a; })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10, marginRight: 2 }}>▲</button>
                                  <button onClick={() => setAttachUploadedFiles(p => { const a=[...p]; if(i<a.length-1)[a[i],a[i+1]]=[a[i+1],a[i]]; return a; })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10 }}>▼</button>
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
                    const today = new Date().toISOString().slice(0,10).replace(/-/g,'.');
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
                  }} style={{ height: 30, padding: '0 14px', border: '1px solid #1a3a6b', borderRadius: 2, background: '#1a3a6b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>목록에 추가</button>
                </div>

                {/* 첨부서류목록 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>• 첨부서류목록</span>
                  <button style={{ height: 26, padding: '0 10px', border: '1px solid #aaa', borderRadius: 2, background: '#f5f5f5', fontSize: 11, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>📋 전자발급 서류 첨부하기</button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                  <thead>
                    <tr style={{ background: '#f5f7fb' }}>
                      {['번호','서류명*','파일명','등록일','순서변경','삭제'].map(h => (
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
                          <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>({row.파일크기 < 1024 ? `${row.파일크기} Bytes` : `${(row.파일크기/1024).toFixed(0)} KB`})</span>
                        </td>
                        <td style={{ padding: '5px 8px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #eaecf4', whiteSpace: 'nowrap' }}>{row.등록일}</td>
                        <td style={{ padding: '5px', borderRight: '1px solid #eaecf4', textAlign: 'center' }}>
                          <button onClick={() => setAttachRows(p => { const a=[...p]; if(i>0)[a[i],a[i-1]]=[a[i-1],a[i]]; return a.map((r,j) => ({...r, 번호: j+1})); })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10, marginRight: 2 }}>▲</button>
                          <button onClick={() => setAttachRows(p => { const a=[...p]; if(i<a.length-1)[a[i],a[i+1]]=[a[i+1],a[i]]; return a.map((r,j) => ({...r, 번호: j+1})); })} style={{ height: 20, width: 22, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer', fontSize: 10 }}>▼</button>
                        </td>
                        <td style={{ padding: '5px', textAlign: 'center' }}>
                          <button onClick={() => setAttachRows(p => p.filter(r => r.id !== row.id).map((r,j) => ({...r, 번호: j+1})))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#888' }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 12, marginTop: 6, marginBottom: 10 }}>총 <strong>{attachRows.length}</strong> 건</div>

                {/* 등록 버튼 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowAttachRegModal(true)} style={{ height: 32, padding: '0 20px', border: 'none', borderRadius: 2, background: '#1a3a6b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    ✎ 등록
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 첨부서류 등록 완료 모달 */}
          {showAttachRegModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#fff', width: 340, borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.3)' }}>
                <div style={{ background: '#1a3a6b', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>설명</div>
                <div style={{ padding: '30px 20px', textAlign: 'center', fontSize: 13, color: '#333' }}>등록되었습니다.</div>
                <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
                  <button onClick={() => setShowAttachRegModal(false)} style={{ height: 32, padding: '0 32px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>확인</button>
                </div>
              </div>
            </div>
          )}

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
