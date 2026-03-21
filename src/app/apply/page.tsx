'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MockBar from '@/components/layout/MockBar';
import GnbNav from '@/components/layout/GnbNav';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { ComplaintFormData, Party, Evidence, SampleCase } from '@/types';

// ── Constants ──────────────────────────────────────────────
const CASE_NAMES = ['대여금', '손해배상(기)', '매매대금', '부당이득금', '임금'];
const COURTS = [
  '서울중앙지방법원','서울동부지방법원','서울서부지방법원','서울남부지방법원','서울북부지방법원',
  '수원지방법원','인천지방법원','부산지방법원','대구지방법원','광주지방법원',
  '대전지방법원','울산지방법원','의정부지방법원','춘천지방법원','청주지방법원',
  '전주지방법원','창원지방법원','제주지방법원',
];

const subtabs = ['민사', '민사서류 작성', '가사', '행정', '신청서', '준비서면', '기타서류'];

const EMPTY: ComplaintFormData = {
  doc_type: 'complaint',
  caseCategory: '', caseName: '', court: '', claimType: '재산권', sogaType: '금액', soga: '',
  parties: [], claimPurpose: '', claimCause: '', hasAgent: false, agentType: undefined,
  agentName: undefined, evidences: [],
};

function secHd(label: string, open: boolean, toggle: () => void) {
  return (
    <div
      onClick={toggle}
      style={{ background: '#edf1f8', borderBottom: open ? '1px solid #ccd4e0' : 'none', padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', borderLeft: '3px solid #006699' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#006699', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#003366' }}>{label}</span>
      </div>
      <div style={{ width: 22, height: 22, border: '1px solid #aab8c8', borderRadius: 3, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#555' }}>
        {open ? '∧' : '∨'}
      </div>
    </div>
  );
}

const INP: React.CSSProperties = { height: 30, padding: '0 8px', border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 13, fontFamily: 'inherit', color: '#222', background: '#fff', outline: 'none', boxSizing: 'border-box' };
const SEL: React.CSSProperties = { ...INP, appearance: 'none', paddingRight: 22, cursor: 'pointer' };

// ── Main Page ──────────────────────────────────────────────
export default function ApplyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<ComplaintFormData>(EMPTY);
  const [assignedCase, setAssignedCase] = useState<SampleCase | null>(null);
  const [open, setOpen] = useState({ s1: true, s2: true, s3: true, s4: true, s5: true, s6: true });
  const [activeSubtab, setActiveSubtab] = useState(1);
  const [partyForm, setPartyForm] = useState<Omit<Party,'id'>>({ role: '원고', name: '', addr: '', tel: '', isCompany: false });
  const [evForm, setEvForm] = useState({ name: '', purpose: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [sogaDisp, setSogaDisp] = useState('( 0 원 )');
  const [pageStep, setPageStep] = useState<'form' | 'payment'>('form');
  const [payAgreed, setPayAgreed] = useState(false);
  const [showBankPay, setShowBankPay] = useState(false);
  const [payCompleted, setPayCompleted] = useState(false);
  const [refundBank, setRefundBank] = useState('');
  const [refundAcct, setRefundAcct] = useState('');
  const [refundName, setRefundName] = useState('');
  const [payParty, setPayParty] = useState('');
  const causeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('assigned_case');
      if (raw) {
        const parsed: SampleCase = JSON.parse(raw);
        sessionStorage.removeItem('assigned_case');
        setAssignedCase(parsed);
        setData(prev => ({
          ...prev,
          court: parsed.court || prev.court,
          caseCategory: CASE_NAMES.includes(parsed.case_type) ? parsed.case_type : prev.caseCategory,
          caseName: parsed.case_type || prev.caseName,
          claimPurpose: parsed.claim_purpose || prev.claimPurpose,
          claimCause: parsed.claim_reason || prev.claimCause,
        }));
        // Pre-fill parties
        const initial: Party[] = [];
        if (parsed.plaintiff) initial.push({ id: crypto.randomUUID(), role: '원고', name: parsed.plaintiff, addr: '', tel: '' });
        if (parsed.defendant) initial.push({ id: crypto.randomUUID(), role: '피고', name: parsed.defendant, addr: '', tel: '' });
        if (initial.length) setData(prev => ({ ...prev, parties: initial }));
      }
    } catch { /* ignore */ }
  }, []);

  // Sync causeRef on mount
  useEffect(() => {
    if (causeRef.current) causeRef.current.innerText = data.claimCause || '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback((k: keyof typeof open) => setOpen(p => ({ ...p, [k]: !p[k] })), []);
  const upd = (patch: Partial<ComplaintFormData>) => setData(p => ({ ...p, ...patch }));

  function calcStampDuty(sogaStr: string): number {
    const n = parseInt(sogaStr || '0', 10);
    if (!n) return 0;
    let d = 0;
    if (n <= 10_000_000) d = n * 50 / 10000;
    else if (n <= 100_000_000) d = 50_000 + (n - 10_000_000) * 45 / 10000;
    else if (n <= 1_000_000_000) d = 455_000 + (n - 100_000_000) * 40 / 10000;
    else d = 3_655_000 + (n - 1_000_000_000) * 35 / 10000;
    return Math.max(1000, Math.ceil(d / 1000) * 1000);
  }

  function fmtSoga(v: string) {
    const n = v.replace(/[^0-9]/g, '');
    upd({ soga: n });
    setSogaDisp(`( ${Number(n).toLocaleString('ko-KR')} 원 )`);
  }

  function addParty() {
    if (!partyForm.name.trim() || !partyForm.addr.trim()) { alert('이름과 주소를 입력해주세요.'); return; }
    upd({ parties: [...data.parties, { ...partyForm, id: crypto.randomUUID() }] });
    setPartyForm({ role: '원고', name: '', addr: '', tel: '', isCompany: false });
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
    const renumbered = filtered.map((e, i) => ({ ...e, number: `갑 제${i+1}호증` }));
    upd({ evidences: renumbered });
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
          student_id: user!.id,
          user_name: user!.name,
          case_type: data.caseCategory || data.caseName,
          court: data.court,
          plaintiff: data.parties.find(p => p.role === '원고')?.name || '',
          defendant: data.parties.find(p => p.role === '피고')?.name || '',
          has_agent: data.hasAgent,
          evidence_count: data.evidences.length,
          score: 0,
          feedback: '채점 중...',
          complaint_data: data,
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

  // ── Submitted screen ──
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif", background: '#f2f4f7' }}>
        <MockBar /><GnbNav active="서류제출" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ background: '#fff', border: '1px solid #d0d8e4', borderRadius: 6, padding: '48px 40px', textAlign: 'center', maxWidth: 480 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#003366', margin: '0 0 12px' }}>소장 제출이 완료되었습니다!</h2>
            <div style={{ background: '#f0f7ff', border: '1px solid #c5d8f6', borderRadius: 4, padding: '14px 18px', fontSize: 13, color: '#2952a3', lineHeight: 1.7, marginBottom: 24 }}>
              채점 결과는 <strong>나의전자소송 &gt; 나의 실습기록</strong>에서 확인하세요.
              {submittedId && <span style={{ display: 'block', marginTop: 4, color: '#888', fontSize: 11 }}>기록 ID: {submittedId}</span>}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => router.push('/mypage')} style={{ padding: '10px 22px', background: '#003366', color: '#fff', border: 'none', borderRadius: 3, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>나의 실습기록 확인</button>
              <button onClick={() => { setData(EMPTY); setSubmitted(false); setSubmittedId(null); }} style={{ padding: '10px 22px', background: '#fff', color: '#003366', border: '1px solid #003366', borderRadius: 3, fontSize: 14, cursor: 'pointer' }}>새 소장 작성</button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const wonCount = data.parties.filter(p => p.role === '원고').length;
  const defCount = data.parties.filter(p => p.role === '피고').length;

  // ── Payment screen ────────────────────────────────────────────
  if (pageStep === 'payment') {
    const stampDuty = calcStampDuty(data.soga);
    const souralRyo = 82500;
    const totalPayment = stampDuty + souralRyo;
    const BANKS = ['국민은행','신한은행','우리은행','하나은행','기업은행','농협은행','카카오뱅크','토스뱅크'];
    const thS: React.CSSProperties = { background:'#f5f7fb', width:140, padding:'11px 14px', fontSize:12, fontWeight:600, color:'#333', textAlign:'left', verticalAlign:'middle', borderRight:'1px solid #e0e6ee', whiteSpace:'nowrap' };
    const tdSt: React.CSSProperties = { padding:'9px 14px', verticalAlign:'middle', fontSize:13 };
    const SectionHd = ({ label }: { label: string }) => (
      <div style={{ background:'#edf1f8', borderBottom:'1px solid #ccd4e0', padding:'11px 16px', display:'flex', alignItems:'center', gap:8, borderLeft:'3px solid #006699' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#006699', flexShrink:0 }} />
        <span style={{ fontSize:13, fontWeight:700, color:'#003366' }}>{label}</span>
      </div>
    );
    return (
      <div style={{ margin:0, padding:0, fontFamily:"'Malgun Gothic','맑은 고딕',sans-serif", minHeight:'100vh', display:'flex', flexDirection:'column', background:'#f2f4f7', fontSize:13 }}>
        <MockBar /><GnbNav active="서류제출" />
        {/* Subtab */}
        <div style={{ background:'#fff', borderBottom:'1px solid #dde0e8', display:'flex', padding:'0 20px', overflowX:'auto', height:38 }}>
          {subtabs.map((t, i) => (
            <button key={i} onClick={() => setActiveSubtab(i)} style={{ padding:'0 14px', height:38, border:'none', borderBottom:activeSubtab===i?'2px solid #003366':'2px solid transparent', background:'transparent', color:activeSubtab===i?'#003366':'#555', fontWeight:activeSubtab===i?700:400, fontSize:12, cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit' }}>{t}</button>
          ))}
        </div>
        {/* Breadcrumb */}
        <div style={{ background:'#fff', borderBottom:'1px solid #eee', padding:'7px 20px', display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#888' }}>
          <button onClick={() => router.push('/')} style={{ background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:11, padding:0 }}>🏠</button>
          <span style={{ color:'#ccc' }}>›</span><span>서류제출</span>
          <span style={{ color:'#ccc' }}>›</span><span>민사서류 작성</span>
          <span style={{ color:'#ccc' }}>›</span><span style={{ color:'#444', fontWeight:600 }}>소장</span>
        </div>
        {/* Stepbar — 수납/제출(index 4) active */}
        <div style={{ background:'#f8f9fc', borderBottom:'1px solid #dde0e8', padding:'12px 20px', display:'flex', justifyContent:'center' }}>
          <div style={{ display:'flex', alignItems:'center' }}>
            {['서류선택','소장작성','당사자정보','첨부서류','수납/제출'].map((lbl, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, background:i<4?'#006699':'#fff', color:i<4?'#fff':'#006699', border:i===4?'2px solid #006699':'2px solid transparent', boxShadow:i===4?'0 0 0 3px rgba(0,102,153,.12)':'none' }}>
                    {i < 4 ? '✓' : i+1}
                  </div>
                  <div style={{ fontSize:10, marginTop:4, color:'#006699', fontWeight:i===4?700:400, whiteSpace:'nowrap' }}>{lbl}</div>
                </div>
                {i < 4 && <div style={{ width:60, height:2, background:'#006699', marginBottom:22, flexShrink:0 }} />}
              </div>
            ))}
          </div>
        </div>
        {/* Content */}
        <div style={{ flex:1 }}>
          <div style={{ maxWidth:980, margin:'0 auto', padding:'16px 12px 80px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <div style={{ width:12, height:12, borderRadius:'50%', background:'#006699' }} />
              <span style={{ fontSize:16, fontWeight:700, color:'#003366' }}>소송비용납부</span>
            </div>

            {/* 수납정보 */}
            <div style={{ background:'#fff', border:'1px solid #d0d8e4', marginBottom:8, borderRadius:3, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
              <SectionHd label="① 수납정보" />
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <tbody>
                  {[
                    { label:'납부구분', value:'소장 - 소송비용납부' },
                    { label:'사건명', value:`${data.caseCategory||data.caseName||'민사'} / ${data.court||'법원미선택'}` },
                    { label:'인지액', value:`${stampDuty.toLocaleString('ko-KR')}원` },
                    { label:'송달료', value:`${souralRyo.toLocaleString('ko-KR')}원 (15회분 × 5,500원)` },
                    { label:'법원보관금', value:'0원' },
                  ].map(({ label, value }) => (
                    <tr key={label} style={{ borderBottom:'1px solid #eaecf4' }}>
                      <th style={thS}>{label}</th>
                      <td style={tdSt}>{value}</td>
                    </tr>
                  ))}
                  <tr>
                    <th style={{ ...thS, background:'#e8f0fb', fontWeight:700 }}>납부합계</th>
                    <td style={{ ...tdSt, fontWeight:700, color:'#003366', fontSize:15 }}>{totalPayment.toLocaleString('ko-KR')}원</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 환급계좌 */}
            <div style={{ background:'#fff', border:'1px solid #d0d8e4', marginBottom:8, borderRadius:3, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
              <SectionHd label="② 환급계좌 입력" />
              <div style={{ padding:'10px 16px 14px' }}>
                <div style={{ fontSize:11, color:'#666', marginBottom:10, lineHeight:1.7 }}>※ 소송비용이 환급될 경우 지급할 계좌를 입력하세요. (선택사항)</div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom:'1px solid #eaecf4' }}>
                      <th style={thS}>은행명</th>
                      <td style={tdSt}>
                        <select value={refundBank} onChange={e=>setRefundBank(e.target.value)} style={{ ...SEL, width:160 }}>
                          <option value="">선택</option>
                          {BANKS.map(b=><option key={b}>{b}</option>)}
                        </select>
                      </td>
                    </tr>
                    <tr style={{ borderBottom:'1px solid #eaecf4' }}>
                      <th style={thS}>계좌번호</th>
                      <td style={tdSt}><input value={refundAcct} onChange={e=>setRefundAcct(e.target.value)} style={{ ...INP, width:220 }} placeholder="숫자만 입력" /></td>
                    </tr>
                    <tr>
                      <th style={thS}>예금주</th>
                      <td style={tdSt}><input value={refundName} onChange={e=>setRefundName(e.target.value)} style={{ ...INP, width:160 }} placeholder="예금주명" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 납부당사자 선택 */}
            <div style={{ background:'#fff', border:'1px solid #d0d8e4', marginBottom:8, borderRadius:3, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
              <SectionHd label="③ 납부당사자 선택" />
              <div style={{ padding:'10px 16px 14px' }}>
                <div style={{ fontSize:12, color:'#666', marginBottom:8 }}>납부인을 선택하세요.</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {data.parties.map(p => (
                    <label key={p.id} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'9px 14px', border:`1px solid ${payParty===p.id?'#006699':'#dde0e8'}`, borderRadius:3, background:payParty===p.id?'#f0f7ff':'#fff', width:'fit-content' }}>
                      <input type="radio" name="payParty" checked={payParty===p.id} onChange={()=>setPayParty(p.id)} style={{ accentColor:'#006699', cursor:'pointer' }} />
                      <span style={{ fontSize:13, fontWeight:payParty===p.id?700:400 }}>
                        <span style={{ display:'inline-block', padding:'1px 8px', borderRadius:20, fontSize:11, fontWeight:700, background:p.role==='원고'?'#dbeafe':'#fce7f3', color:p.role==='원고'?'#1e40af':'#9d174d', marginRight:6 }}>{p.role}</span>
                        {p.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 납부수단 선택 */}
            <div style={{ background:'#fff', border:'1px solid #d0d8e4', marginBottom:8, borderRadius:3, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
              <SectionHd label="④ 납부수단 선택" />
              <div style={{ padding:'10px 16px 14px' }}>
                <label style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer', padding:'12px 16px', border:'2px solid #006699', borderRadius:4, background:'#f0f7ff', width:'fit-content' }}>
                  <input type="radio" defaultChecked style={{ accentColor:'#006699', cursor:'pointer', width:16, height:16 }} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#003366' }}>🏦 BankPay (가상계좌)</div>
                    <div style={{ fontSize:11, color:'#666', marginTop:2 }}>안전한 인터넷뱅킹 납부 서비스</div>
                  </div>
                </label>
              </div>
            </div>

            {/* 이용약관 동의 */}
            <div style={{ background:'#fff', border:'1px solid #d0d8e4', marginBottom:8, borderRadius:3, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
              <SectionHd label="⑤ 이용약관 동의" />
              <div style={{ padding:'10px 16px 14px' }}>
                <div style={{ background:'#f8f8f8', border:'1px solid #dde0e8', borderRadius:3, padding:'10px 12px', height:80, overflowY:'auto', fontSize:11, color:'#555', lineHeight:1.8, marginBottom:10 }}>
                  전자소송 시스템을 통한 소송비용 납부 시, 납부한 금액은 전자소송 절차에 따라 처리됩니다. 납부 후 취소는 재판부 허가를 요합니다. 본 실습 페이지는 실제 법원 납부 시스템과 연동되지 않으며 모의 실습 목적으로만 사용됩니다. 실제 법원 비용 납부는 반드시 법원 공식 전자소송 시스템(ecfs.scourt.go.kr)을 이용하시기 바랍니다.
                </div>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" checked={payAgreed} onChange={e=>setPayAgreed(e.target.checked)} style={{ accentColor:'#006699', width:16, height:16, cursor:'pointer' }} />
                  <span style={{ fontSize:13, fontWeight:600 }}>위 약관에 동의합니다.</span>
                </label>
              </div>
            </div>

            {/* 유의사항 */}
            <div style={{ border:'1px solid #d8dce8', background:'#f7f8fb', borderRadius:3, padding:'10px 14px', marginBottom:12 }}>
              <ul style={{ listStyle:'none', padding:0, margin:0 }}>
                {['인지액은 민사소송 등 인지법에 따라 소가를 기준으로 산정됩니다.','송달료는 당사자 수 × 15회분 × 5,500원으로 계산됩니다.','납부 후 영수증은 나의전자소송 > 납부/환급관리에서 확인하실 수 있습니다.'].map((t,i)=>(
                  <li key={i} style={{ fontSize:11, color:'#555', lineHeight:1.7, paddingLeft:10, position:'relative' }}>
                    <span style={{ position:'absolute', left:0 }}>•</span>{t}
                  </li>
                ))}
              </ul>
            </div>

            {submitError && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:4, padding:'12px 16px', color:'#dc2626', fontSize:13, marginBottom:12 }}>⚠️ {submitError}</div>
            )}

            {/* 납부 완료 후 전자제출 */}
            {payCompleted ? (
              <div>
                <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:6, padding:'16px 20px', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:28 }}>✅</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#166534' }}>소송비용 납부가 완료되었습니다!</div>
                    <div style={{ fontSize:12, color:'#555', marginTop:2 }}>납부금액: {totalPayment.toLocaleString('ko-KR')}원</div>
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <button onClick={()=>setPageStep('form')} style={{ height:38, padding:'0 20px', background:'#fff', color:'#555', border:'1px solid #c8cdd6', borderRadius:3, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>← 이전</button>
                  <button onClick={handleSubmit} disabled={submitting} style={{ height:38, padding:'0 28px', background:submitting?'#7ab0c8':'#003366', color:'#fff', border:'none', borderRadius:3, fontSize:14, fontWeight:700, cursor:submitting?'not-allowed':'pointer', fontFamily:'inherit' }}>
                    {submitting ? '⏳ 제출 중...' : '📨 전자제출하기 →'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <button onClick={()=>setPageStep('form')} style={{ height:38, padding:'0 20px', background:'#fff', color:'#555', border:'1px solid #c8cdd6', borderRadius:3, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>← 이전 (소장수정)</button>
                <button onClick={()=>{ if(!payAgreed){alert('이용약관에 동의해주세요.');return;} setShowBankPay(true); }} style={{ height:38, padding:'0 28px', background:'#006699', color:'#fff', border:'none', borderRadius:3, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>🏦 소송비용 납부하기 →</button>
              </div>
            )}

            {/* BankPay 모의 모달 */}
            {showBankPay && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ background:'#fff', borderRadius:8, width:420, boxShadow:'0 8px 32px rgba(0,0,0,.3)', overflow:'hidden' }}>
                  <div style={{ background:'linear-gradient(90deg,#003366,#006699)', color:'#fff', padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15 }}>🏦 BankPay</div>
                      <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>가상계좌 납부 서비스</div>
                    </div>
                    <button onClick={()=>setShowBankPay(false)} style={{ background:'none', border:'none', color:'#fff', fontSize:20, cursor:'pointer', lineHeight:1 }}>✕</button>
                  </div>
                  <div style={{ padding:'20px' }}>
                    <div style={{ background:'#f0f7ff', border:'1px solid #c5d8f6', borderRadius:4, padding:'12px 16px', marginBottom:14, textAlign:'center' }}>
                      <div style={{ fontSize:11, color:'#888', marginBottom:4 }}>납부금액</div>
                      <div style={{ fontSize:26, fontWeight:700, color:'#003366' }}>{totalPayment.toLocaleString('ko-KR')}원</div>
                    </div>
                    <div style={{ fontSize:12, color:'#444', lineHeight:1.9, marginBottom:12, background:'#f8f9fc', border:'1px solid #e0e6ee', borderRadius:3, padding:'10px 12px' }}>
                      <div style={{ fontWeight:700, marginBottom:4, color:'#003366' }}>가상계좌 납부 안내</div>
                      은행: 국민은행<br/>
                      계좌번호: 123456-78-901234<br/>
                      입금기한: {new Date(Date.now()+3*24*60*60*1000).toLocaleDateString('ko-KR')}까지<br/>
                      <span style={{ color:'#dc2626', fontWeight:600 }}>반드시 위 계좌로 정확한 금액을 입금하세요.</span>
                    </div>
                    <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                      {['일반결제','간편결제'].map((t,i)=>(
                        <button key={t} style={{ flex:1, height:34, border:`1px solid ${i===0?'#003366':'#ccc'}`, borderRadius:3, fontSize:12, fontWeight:i===0?700:400, background:i===0?'#003366':'#fff', color:i===0?'#fff':'#555', cursor:'pointer', fontFamily:'inherit' }}>{t}</button>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:'#888', marginBottom:10, textAlign:'center' }}>⚠️ 본 결제창은 실습 전용 모의 화면입니다. 실제 납부 처리 없음.</div>
                    <button onClick={()=>{setShowBankPay(false);setPayCompleted(true);window.scrollTo(0,0);}} style={{ width:'100%', height:42, background:'#006699', color:'#fff', border:'none', borderRadius:4, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>납부하기 (모의 처리)</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "'Malgun Gothic','맑은 고딕',sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f2f4f7', fontSize: 13 }}>
      <MockBar />
      <GnbNav active="서류제출" />

      {/* Subtab */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dde0e8', display: 'flex', padding: '0 20px', overflowX: 'auto', height: 38 }}>
        {subtabs.map((t, i) => (
          <button key={i} onClick={() => setActiveSubtab(i)} style={{ padding: '0 14px', height: 38, border: 'none', borderBottom: activeSubtab === i ? '2px solid #003366' : '2px solid transparent', background: 'transparent', color: activeSubtab === i ? '#003366' : '#555', fontWeight: activeSubtab === i ? 700 : 400, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Breadcrumb */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '7px 20px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#888' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 11, padding: 0 }}>🏠</button>
        <span style={{ color: '#ccc' }}>›</span><span>서류제출</span>
        <span style={{ color: '#ccc' }}>›</span><span>민사서류 작성</span>
        <span style={{ color: '#ccc' }}>›</span><span style={{ color: '#444', fontWeight: 600 }}>소장</span>
      </div>

      {/* Stepbar */}
      <div style={{ background: '#f8f9fc', borderBottom: '1px solid #dde0e8', padding: '12px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {['서류선택','소장작성','당사자정보','첨부서류','수납/제출'].map((lbl, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: i < 2 ? '#006699' : i === 2 ? '#fff' : '#dde0e6', color: i < 2 ? '#fff' : i === 2 ? '#006699' : '#888', border: i === 2 ? '2px solid #006699' : '2px solid transparent', boxShadow: i === 2 ? '0 0 0 3px rgba(0,102,153,.12)' : 'none' }}>
                  {i < 2 ? '✓' : i+1}
                </div>
                <div style={{ fontSize: 10, marginTop: 4, color: i <= 2 ? '#006699' : '#aaa', fontWeight: i === 2 ? 700 : 400, whiteSpace: 'nowrap' }}>{lbl}</div>
              </div>
              {i < 4 && <div style={{ width: 60, height: 2, background: i < 2 ? '#006699' : '#dde0e6', marginBottom: 22, flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '16px 12px 80px' }}>

          {/* Page title */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#006699' }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#003366' }}>민사서류 - 소장</span>
              {assignedCase && <span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>배정 사건: {assignedCase.title}</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setOpen({ s1:true, s2:true, s3:true, s4:true, s5:true, s6:true })} style={{ height: 30, padding: '0 12px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', color: '#444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>전체열기 ∨</button>
              <button onClick={() => setOpen({ s1:false, s2:false, s3:false, s4:false, s5:false, s6:false })} style={{ height: 30, padding: '0 12px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', color: '#444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>전체닫기 ∧</button>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#dc2626', marginBottom: 10 }}>* 필수입력사항</div>

          {/* ① 사건기본정보 */}
          <div style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 8, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            {secHd('① 사건기본정보', open.s1, () => toggle('s1'))}
            {open.s1 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                    <th style={{ background: '#f5f7fb', width: 140, padding: '11px 14px', fontSize: 12, fontWeight: 600, color: '#333', textAlign: 'left', verticalAlign: 'middle', borderRight: '1px solid #e0e6ee', whiteSpace: 'nowrap' }}>사건명<span style={{ color: '#dc2626' }}>*</span></th>
                    <td style={{ padding: '9px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <select value={data.caseCategory} onChange={e => upd({ caseCategory: e.target.value })} style={{ ...SEL, width: 140 }}>
                          <option value="">선택</option>
                          {CASE_NAMES.map(n => <option key={n}>{n}</option>)}
                        </select>
                        <input value={data.caseName} onChange={e => upd({ caseName: e.target.value })} style={{ ...INP, width: 200 }} placeholder="사건명 직접입력" />
                      </div>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                    <th style={{ background: '#f5f7fb', width: 140, padding: '11px 14px', fontSize: 12, fontWeight: 600, color: '#333', textAlign: 'left', verticalAlign: 'middle', borderRight: '1px solid #e0e6ee', whiteSpace: 'nowrap' }}>법원<span style={{ color: '#dc2626' }}>*</span></th>
                    <td style={{ padding: '9px 14px', verticalAlign: 'middle' }}>
                      <select value={data.court} onChange={e => upd({ court: e.target.value })} style={{ ...SEL, width: 200 }}>
                        <option value="">선택</option>
                        {COURTS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                    <th style={{ background: '#f5f7fb', width: 140, padding: '11px 14px', fontSize: 12, fontWeight: 600, color: '#333', textAlign: 'left', verticalAlign: 'middle', borderRight: '1px solid #e0e6ee', whiteSpace: 'nowrap' }}>청구구분<span style={{ color: '#dc2626' }}>*</span></th>
                    <td style={{ padding: '9px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        {['재산권', '비재산권'].map(v => (
                          <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                            <input type="radio" name="ctype" value={v} checked={data.claimType === v} onChange={() => upd({ claimType: v })} style={{ accentColor: '#003366', cursor: 'pointer' }} />
                            <span style={{ fontSize: 13 }}>{v === '재산권' ? '재산권상청구' : '비재산권상 청구'}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                    <th style={{ background: '#f5f7fb', width: 140, padding: '11px 14px', fontSize: 12, fontWeight: 600, color: '#333', textAlign: 'left', verticalAlign: 'middle', borderRight: '1px solid #e0e6ee', whiteSpace: 'nowrap' }}>소가구분<span style={{ color: '#dc2626' }}>*</span></th>
                    <td style={{ padding: '9px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        {['금액', '토지', '불능'].map(v => (
                          <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                            <input type="radio" name="sogat" value={v} checked={data.sogaType === v} onChange={() => upd({ sogaType: v })} style={{ accentColor: '#003366', cursor: 'pointer' }} />
                            <span style={{ fontSize: 13 }}>{v === '금액' ? '금액' : v === '토지' ? '토지 등의 평가액' : '소가를 산출할 수 없는 경우'}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                  {data.sogaType === '금액' && (
                    <tr>
                      <th style={{ background: '#f5f7fb', width: 140, padding: '11px 14px', fontSize: 12, fontWeight: 600, color: '#333', textAlign: 'left', verticalAlign: 'middle', borderRight: '1px solid #e0e6ee', whiteSpace: 'nowrap' }}>소가<span style={{ color: '#dc2626' }}>*</span></th>
                      <td style={{ padding: '9px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="text" value={data.soga} onChange={e => fmtSoga(e.target.value)} style={{ ...INP, width: 140 }} placeholder="0" />
                          <span>원</span>
                          <span style={{ fontSize: 12, color: '#555' }}>{sogaDisp}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* ② 당사자 */}
          <div style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 8, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            {secHd('② 당사자', open.s2, () => toggle('s2'))}
            {open.s2 && (
              <div style={{ padding: '4px 16px 16px' }}>
                {/* Party list */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 8px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>• 당사자 목록</span>
                  <span style={{ fontSize: 12, color: '#555' }}>원고 <strong>{wonCount}</strong>명 / 피고 <strong>{defCount}</strong>명</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                  <thead>
                    <tr>
                      {['당사자구분','이름','주소','전화번호','삭제'].map(h => (
                        <th key={h} style={{ background: '#f0f4f8', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#333', borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.parties.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999', fontSize: 12, padding: 14 }}>조회된 결과가 없습니다.</td></tr>
                    ) : data.parties.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #eaecf4' }}>
                        <td style={{ padding: '7px 10px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #eaecf4' }}>
                          <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: p.role === '원고' ? '#dbeafe' : '#fce7f3', color: p.role === '원고' ? '#1e40af' : '#9d174d' }}>{p.role}</span>
                        </td>
                        <td style={{ padding: '7px 10px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #eaecf4' }}>{p.name}</td>
                        <td style={{ padding: '7px 10px', fontSize: 12, textAlign: 'left', borderRight: '1px solid #eaecf4', color: '#555' }}>{p.addr}</td>
                        <td style={{ padding: '7px 10px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #eaecf4', color: '#555' }}>{p.tel || '-'}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                          <button onClick={() => delParty(p.id)} style={{ background: 'none', border: '1px solid #c0392b', color: '#c0392b', borderRadius: 2, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>삭제</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <hr style={{ border: 'none', borderTop: '1px solid #dde0e6', margin: '14px -16px' }} />
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>• 당사자 정보 입력</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                      <th style={{ background: '#f5f7fb', width: 140, padding: '11px 14px', fontSize: 12, fontWeight: 600, textAlign: 'left', verticalAlign: 'middle', borderRight: '1px solid #e0e6ee', whiteSpace: 'nowrap' }}>당사자 구분</th>
                      <td style={{ padding: '9px 14px' }}>
                        <div style={{ display: 'flex', gap: 16 }}>
                          {['원고', '피고'].map(r => (
                            <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                              <input type="radio" name="prole" checked={partyForm.role === r} onChange={() => setPartyForm(p => ({ ...p, role: r as '원고'|'피고' }))} style={{ accentColor: '#003366', cursor: 'pointer' }} />
                              <span>{r}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                      <th style={{ background: '#f5f7fb', width: 140, padding: '11px 14px', fontSize: 12, fontWeight: 600, textAlign: 'left', verticalAlign: 'middle', borderRight: '1px solid #e0e6ee', whiteSpace: 'nowrap' }}>이름<span style={{ color: '#dc2626' }}>*</span></th>
                      <td style={{ padding: '9px 14px' }}>
                        <input value={partyForm.name} onChange={e => setPartyForm(p => ({ ...p, name: e.target.value }))} style={{ ...INP, width: 220 }} placeholder="성명 입력" />
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                      <th style={{ background: '#f5f7fb', width: 140, padding: '11px 14px', fontSize: 12, fontWeight: 600, textAlign: 'left', verticalAlign: 'middle', borderRight: '1px solid #e0e6ee', whiteSpace: 'nowrap' }}>주소<span style={{ color: '#dc2626' }}>*</span></th>
                      <td style={{ padding: '9px 14px' }}>
                        <input value={partyForm.addr} onChange={e => setPartyForm(p => ({ ...p, addr: e.target.value }))} style={{ ...INP, width: 380 }} placeholder="주소 입력" />
                      </td>
                    </tr>
                    <tr>
                      <th style={{ background: '#f5f7fb', width: 140, padding: '11px 14px', fontSize: 12, fontWeight: 600, textAlign: 'left', verticalAlign: 'middle', borderRight: '1px solid #e0e6ee', whiteSpace: 'nowrap' }}>전화번호</th>
                      <td style={{ padding: '9px 14px' }}>
                        <input value={partyForm.tel || ''} onChange={e => setPartyForm(p => ({ ...p, tel: e.target.value }))} style={{ ...INP, width: 180 }} placeholder="010-0000-0000" />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 10 }}>
                  <button onClick={() => setPartyForm({ role: '원고', name: '', addr: '', tel: '', isCompany: false })} style={{ height: 38, padding: '0 18px', border: '1px solid #c8cdd6', background: '#fff', color: '#444', borderRadius: 3, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>↺ 초기화</button>
                  <button onClick={addParty} style={{ height: 38, padding: '0 20px', background: '#003366', color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✏️ 등록</button>
                </div>
              </div>
            )}
          </div>

          {/* ③ 대리인 */}
          <div style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 8, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            {secHd('③ 대리인', open.s3, () => toggle('s3'))}
            {open.s3 && (
              <div style={{ padding: '12px 16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                      <th style={{ background: '#f5f7fb', width: 140, padding: '11px 14px', fontSize: 12, fontWeight: 600, textAlign: 'left', verticalAlign: 'middle', borderRight: '1px solid #e0e6ee', whiteSpace: 'nowrap' }}>대리인 여부</th>
                      <td style={{ padding: '9px 14px' }}>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                            <input type="radio" name="hasag" checked={!data.hasAgent} onChange={() => upd({ hasAgent: false, agentName: undefined, agentType: undefined })} style={{ accentColor: '#003366', cursor: 'pointer' }} />
                            <span>없음 (본인 소송)</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                            <input type="radio" name="hasag" checked={data.hasAgent} onChange={() => upd({ hasAgent: true })} style={{ accentColor: '#003366', cursor: 'pointer' }} />
                            <span>있음 (대리인 선임)</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                    {data.hasAgent && (
                      <>
                        <tr style={{ borderBottom: '1px solid #eaecf4' }}>
                          <th style={{ background: '#f5f7fb', width: 140, padding: '11px 14px', fontSize: 12, fontWeight: 600, textAlign: 'left', verticalAlign: 'middle', borderRight: '1px solid #e0e6ee', whiteSpace: 'nowrap' }}>대리인 구분</th>
                          <td style={{ padding: '9px 14px' }}>
                            <select value={data.agentType || ''} onChange={e => upd({ agentType: e.target.value })} style={{ ...SEL, width: 180 }}>
                              <option value="">선택</option>
                              {['변호사','법무사','소송대리인(본인)','법정대리인','임의대리인'].map(v => <option key={v}>{v}</option>)}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <th style={{ background: '#f5f7fb', width: 140, padding: '11px 14px', fontSize: 12, fontWeight: 600, textAlign: 'left', verticalAlign: 'middle', borderRight: '1px solid #e0e6ee', whiteSpace: 'nowrap' }}>대리인 성명</th>
                          <td style={{ padding: '9px 14px' }}>
                            <input value={data.agentName || ''} onChange={e => upd({ agentName: e.target.value })} style={{ ...INP, width: 280 }} placeholder="대리인 성명 입력" />
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ④ 청구취지 */}
          <div style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 8, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            {secHd('④ 청구취지', open.s4, () => toggle('s4'))}
            {open.s4 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <th style={{ background: '#f5f7fb', width: 140, padding: '11px 14px', fontSize: 12, fontWeight: 600, textAlign: 'left', verticalAlign: 'top', borderRight: '1px solid #e0e6ee', paddingTop: 14, whiteSpace: 'nowrap' }}>청구취지<span style={{ color: '#dc2626' }}>*</span></th>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: '#555' }}>청구취지를 입력하세요 (한글 2,000자 이내)</span>
                        <span style={{ fontSize: 12, color: '#666' }}>({data.claimPurpose.length} / 6000 Bytes)</span>
                      </div>
                      <textarea
                        value={data.claimPurpose}
                        onChange={e => upd({ claimPurpose: e.target.value })}
                        rows={5}
                        style={{ width: '100%', padding: '7px 8px', border: '1px solid #c8cdd6', borderRadius: 2, fontSize: 13, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                        placeholder="예) 피고는 원고에게 금 OOO원 및 이에 대하여 OOOO. OO. OO.부터 이 사건 소장 부본 송달일까지는 연 5%의, 그 다음 날부터 다 갚는 날까지는 연 12%의 각 비율로 계산한 돈을 지급하라. 소송비용은 피고가 부담한다. 위 제1항은 가집행할 수 있다."
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* ⑤ 청구원인 */}
          <div style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 8, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            {secHd('⑤ 청구원인', open.s5, () => toggle('s5'))}
            {open.s5 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <th style={{ background: '#f5f7fb', width: 140, padding: '11px 14px', fontSize: 12, fontWeight: 600, textAlign: 'left', verticalAlign: 'top', borderRight: '1px solid #e0e6ee', paddingTop: 14, whiteSpace: 'nowrap' }}>청구원인<span style={{ color: '#dc2626' }}>*</span></th>
                    <td style={{ padding: '12px 14px' }}>
                      {/* Editor toolbar */}
                      <div style={{ border: '1px solid #b0b8c8', borderRadius: 2 }}>
                        <div style={{ background: '#f0f3f8', borderBottom: '1px solid #dde0e6', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                          {[['B','bold'],['I','italic'],['U','underline']].map(([lbl, cmd]) => (
                            <button key={cmd} onMouseDown={e => { e.preventDefault(); document.execCommand(cmd); }} style={{ height: 24, minWidth: 24, padding: '0 4px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>{lbl}</button>
                          ))}
                          <span style={{ width: 1, height: 16, background: '#c8cdd6', margin: '0 3px' }} />
                          <button onMouseDown={e => { e.preventDefault(); document.execCommand('undo'); }} style={{ height: 24, minWidth: 24, padding: '0 4px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>↩</button>
                          <button onMouseDown={e => { e.preventDefault(); document.execCommand('redo'); }} style={{ height: 24, minWidth: 24, padding: '0 4px', border: '1px solid #c8cdd6', borderRadius: 2, background: '#fff', fontSize: 11, cursor: 'pointer' }}>↪</button>
                        </div>
                        <div style={{ background: '#eef4ff', borderBottom: '1px solid #dde0e6', padding: '4px 8px', fontSize: 11, color: '#2952a3' }}>ℹ️ 청구원인을 상세히 입력하세요</div>
                        <div
                          ref={causeRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={() => {
                            if (causeRef.current) upd({ claimCause: causeRef.current.innerText });
                          }}
                          style={{ minHeight: 140, padding: '10px 12px', fontSize: 13, fontFamily: "'맑은 고딕',sans-serif", lineHeight: 1.8, outline: 'none', background: '#fff' }}
                          data-placeholder="청구원인을 입력하세요. (한글 2000자 이내)"
                        />
                        <div style={{ background: '#f7f8fb', borderTop: '1px solid #e5e8ee', padding: '3px 10px', textAlign: 'right', fontSize: 11, color: '#666' }}>
                          글자: {data.claimCause.length}/2000
                        </div>
                      </div>
                      <style>{`[data-placeholder]:empty::before{content:attr(data-placeholder);color:#aaa;pointer-events:none}`}</style>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* ⑥ 입증서류 */}
          <div style={{ background: '#fff', border: '1px solid #d0d8e4', marginBottom: 8, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            {secHd('⑥ 입증서류', open.s6, () => toggle('s6'))}
            {open.s6 && (
              <div style={{ padding: '10px 16px 16px' }}>
                <p style={{ fontSize: 12, color: '#444', lineHeight: 1.8, marginBottom: 10 }}>
                  * 입증서류(증거)는 단순한 첨부서류와 구분하여 제출하여야 합니다.<br />
                  * 제출자가 원고일 경우 '갑호증', 피고일 경우 '을호증'으로 제출하시기 바랍니다.
                </p>

                {/* Add evidence form */}
                <div style={{ background: '#f7f8fb', border: '1px solid #d0d8e4', borderRadius: 3, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>• 서증 추가</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 3 }}>서증번호</label>
                      <input value={`갑 제${data.evidences.length + 1}호증`} readOnly style={{ ...INP, width: '100%', background: '#f0f0f0', color: '#888' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 3 }}>서류명<span style={{ color: '#dc2626' }}>*</span></label>
                      <input value={evForm.name} onChange={e => setEvForm(p => ({ ...p, name: e.target.value }))} style={{ ...INP, width: '100%' }} placeholder="예) 차용증, 통장사본" onKeyDown={e => e.key === 'Enter' && addEvidence()} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 3 }}>입증취지</label>
                      <input value={evForm.purpose} onChange={e => setEvForm(p => ({ ...p, purpose: e.target.value }))} style={{ ...INP, width: '100%' }} placeholder="예) 대여사실 입증" onKeyDown={e => e.key === 'Enter' && addEvidence()} />
                    </div>
                    <button onClick={addEvidence} style={{ height: 30, padding: '0 14px', background: '#003366', color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>목록에 추가</button>
                  </div>
                </div>

                {/* Evidence list */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>• 입증서류목록</span>
                  <span style={{ fontSize: 12 }}>총 <strong>{data.evidences.length}</strong>건</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                    <thead>
                      <tr>
                        {['서증번호','서류명','입증취지','삭제'].map(h => (
                          <th key={h} style={{ background: '#f0f4f8', padding: '6px 10px', fontSize: 11, fontWeight: 700, color: '#333', borderBottom: '1px solid #d0d8e4', borderRight: '1px solid #e0e6ee', textAlign: 'center' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.evidences.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999', fontSize: 12, padding: 14 }}>조회된 결과가 없습니다.</td></tr>
                      ) : data.evidences.map(ev => (
                        <tr key={ev.id} style={{ borderBottom: '1px solid #eaecf4' }}>
                          <td style={{ padding: '6px 10px', fontSize: 12, textAlign: 'center', borderRight: '1px solid #eaecf4', color: '#003366', fontWeight: 600 }}>{ev.number}</td>
                          <td style={{ padding: '6px 10px', fontSize: 12, borderRight: '1px solid #eaecf4' }}>{ev.name}</td>
                          <td style={{ padding: '6px 10px', fontSize: 12, color: '#555', borderRight: '1px solid #eaecf4' }}>{ev.purpose || '-'}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                            <button onClick={() => delEvidence(ev.id)} style={{ background: 'none', border: '1px solid #c0392b', color: '#c0392b', borderRadius: 2, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>삭제</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Bottom notice */}
          <div style={{ border: '1px solid #d8dce8', background: '#f7f8fb', borderRadius: 3, padding: '10px 14px', marginBottom: 12 }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['당사자 정보는 주민등록상 정보와 일치해야 하며, 허위 정보 입력 시 법적 책임이 발생할 수 있습니다.','피고의 주소를 알 수 없는 경우 주소보정명령이 발부될 수 있으니 최대한 정확한 주소를 기재하시기 바랍니다.','송달장소가 주소와 다른 경우 반드시 별도로 입력해 주십시오.'].map((t, i) => (
                <li key={i} style={{ fontSize: 11, color: '#555', lineHeight: 1.7, paddingLeft: 10, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>•</span>{t}
                </li>
              ))}
            </ul>
          </div>

          {/* Submit error */}
          {submitError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '12px 16px', color: '#dc2626', fontSize: 13, marginBottom: 12 }}>
              ⚠️ {submitError}
            </div>
          )}

          {/* Bottom buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                if (!data.court) { alert('법원을 선택해주세요.'); return; }
                if (data.parties.length < 2) { alert('원고와 피고를 각 1명 이상 등록해주세요.'); return; }
                if (!data.claimPurpose.trim()) { alert('청구취지를 입력해주세요.'); return; }
                if (!data.claimCause.trim()) { alert('청구원인을 입력해주세요.'); return; }
                setPageStep('payment');
                window.scrollTo(0, 0);
              }}
              style={{ height: 38, padding: '0 28px', background: '#003366', color: '#fff', border: 'none', borderRadius: 3, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              ✏️ 소송비용납부 →
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
