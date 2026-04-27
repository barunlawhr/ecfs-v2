'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'

/* ───────── types ───────── */
interface RecordItem { date: string; name: string; type: string }
interface EvidenceItem { num: string; name: string; side: string; hasOriginal: boolean }
interface CaseInfo {
  case_number: string
  case_name: string
  court: string
  division: string
  plaintiff: string
  defendant: string
  case_type: string
}

/* ───────── seeded PRNG ───────── */
function seedRand(str: string): () => number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return () => { h = (h * 16807 + 0) % 2147483647; return (h & 0x7fffffff) / 2147483647 }
}

function pick<T>(rand: () => number, arr: T[]): T { return arr[Math.floor(rand() * arr.length)] }
function randInt(rand: () => number, min: number, max: number) { return Math.floor(rand() * (max - min + 1)) + min }

/* ───────── data generators ───────── */

const KOREAN_SURNAMES = ['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','류','홍']
const KOREAN_GIVEN = ['민수','지영','현우','서연','도윤','하은','준서','수빈','예준','지우','시우','서윤','지호','하윤','은우','유진','민준','소율','건우','채원']
const DISTRICTS = ['강남구 테헤란로','서초구 서초대로','마포구 마포대로','영등포구 여의대로','종로구 종로','송파구 올림픽로','용산구 한강대로','강서구 화곡로','노원구 상계로','관악구 관악로']
const DONG_NUMBERS = ['123','456','789','101','202','303','505','707','808','909']

function genName(rand: () => number) { return pick(rand, KOREAN_SURNAMES) + pick(rand, KOREAN_GIVEN) }
function genAddress(rand: () => number) { return `서울 ${pick(rand, DISTRICTS)} ${pick(rand, DONG_NUMBERS)}` }

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}
function fmtDate(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}
function fmtDateDot(d: Date): string {
  return `${d.getFullYear()}. ${d.getMonth()+1}. ${d.getDate()}.`
}

function generateRecords(caseNumber: string, plaintiff: string, defendant: string): RecordItem[] {
  const rand = seedRand(caseNumber + '_records')
  // base filing date derived from case number
  const yearMatch = caseNumber.match(/(\d{4})/)
  const baseYear = yearMatch ? parseInt(yearMatch[1]) : 2023
  const baseMonth = randInt(rand, 1, 9)
  const baseDay = randInt(rand, 5, 25)
  const filing = new Date(baseYear, baseMonth - 1, baseDay)

  const records: RecordItem[] = []

  // 소장 (filing date)
  records.push({ date: fmtDate(filing), name: '소장', type: '' })
  records.push({ date: fmtDate(filing), name: '소장 첨부', type: '원본' })
  records.push({ date: fmtDate(filing), name: '소장 서증', type: '' })

  // 소송위임장 (few days later)
  const delegation = addDays(filing, randInt(rand, 2, 7))
  records.push({ date: fmtDate(delegation), name: '소송위임장', type: '원본' })
  records.push({ date: fmtDate(delegation), name: '담당변호사 지정서', type: '' })

  // 주소보정명령/보정서 (optional, ~60%)
  if (rand() < 0.6) {
    const correction = addDays(filing, randInt(rand, 10, 20))
    records.push({ date: fmtDate(correction), name: '주소보정명령/보정서', type: '' })
    const correctionReply = addDays(correction, randInt(rand, 3, 8))
    records.push({ date: fmtDate(correctionReply), name: `주소보정서(${defendant})`, type: '' })
    records.push({ date: fmtDate(correctionReply), name: `주소보정서(${defendant}) 첨부`, type: '' })
  }

  // 사실조회 (optional, ~40%)
  if (rand() < 0.4) {
    const inquiry = addDays(filing, randInt(rand, 15, 25))
    records.push({ date: fmtDate(inquiry), name: '사실조회신청서', type: '' })
    const reply = addDays(inquiry, randInt(rand, 3, 7))
    records.push({ date: fmtDate(reply), name: '사실조회회신', type: '' })
  }

  // 답변서 (1-2 months later)
  const answer = addDays(filing, randInt(rand, 30, 60))
  records.push({ date: fmtDate(answer), name: `답변서(${defendant})`, type: '' })
  records.push({ date: fmtDate(answer), name: `답변서 서증(${defendant})`, type: '' })

  // 변론기일통지서
  const trialNotice = addDays(answer, randInt(rand, 5, 14))
  records.push({ date: fmtDate(trialNotice), name: '변론기일통지서', type: '' })

  // 준비서면(원고) (optional, ~70%)
  if (rand() < 0.7) {
    const prep = addDays(trialNotice, randInt(rand, 5, 15))
    records.push({ date: fmtDate(prep), name: '준비서면(원고)', type: '' })
    records.push({ date: fmtDate(prep), name: '준비서면 서증(원고)', type: '' })
  }

  // 변론조서 (optional, ~50%)
  if (rand() < 0.5) {
    const trial = addDays(trialNotice, randInt(rand, 15, 30))
    records.push({ date: fmtDate(trial), name: '변론조서', type: '' })
  }

  // 준비서면(피고) (optional, ~40%)
  if (rand() < 0.4) {
    const defPrep = addDays(trialNotice, randInt(rand, 20, 40))
    records.push({ date: fmtDate(defPrep), name: `준비서면(피고 ${defendant})`, type: '' })
  }

  return records
}

function generateEvidence(caseNumber: string, caseName: string): EvidenceItem[] {
  const rand = seedRand(caseNumber + '_evidence')
  const items: EvidenceItem[] = []

  // Determine primary documents based on case type keywords
  let primaryDocs: string[]
  if (caseName.includes('대여금') || caseName.includes('차용')) {
    primaryDocs = ['차용증', '입금내역', '통장사본', '문자메시지 내역', '내용증명 우편', '이자 지급 내역']
  } else if (caseName.includes('매매') || caseName.includes('매매대금')) {
    primaryDocs = ['매매계약서', '계약금 입금내역', '등기부등본', '부동산 감정서', '중개수수료 영수증', '인도확인서']
  } else if (caseName.includes('임금') || caseName.includes('퇴직금')) {
    primaryDocs = ['근로계약서', '급여명세서', '퇴직금 산정내역', '출퇴근기록', '취업규칙', '4대보험 가입확인서']
  } else if (caseName.includes('부당이득')) {
    primaryDocs = ['계약서', '입금확인서', '부당이득 산정내역', '반환청구 내용증명', '등기부등본', '감정서']
  } else {
    // 손해배상 or default
    primaryDocs = ['계약서', '입금내역', '영수증', '진단서', '사진자료', '녹취록', '감정서', '통장사본']
  }

  const additionalDocs = ['인감증명서', '주민등록등본', '법인등기부등본', '사업자등록증', '카카오톡 대화내역', '이메일 출력물', '현장사진', '견적서', '감정평가서', '공정증서']

  const numEvidence = randInt(rand, 10, 18)

  for (let i = 0; i < numEvidence; i++) {
    const docName = i < primaryDocs.length ? primaryDocs[i] : pick(rand, additionalDocs)
    const hasSubNum = rand() < 0.25 && i > 2
    const mainNum = hasSubNum ? `갑${i}` : `갑${i + 1}`
    const nums = hasSubNum ? [`${mainNum}-1`, `${mainNum}-2`] : [mainNum]

    for (const num of nums) {
      items.push({
        num,
        name: docName,
        side: '접수',
        hasOriginal: rand() < 0.3,
      })
      if (items.length >= numEvidence) break
    }
    if (items.length >= numEvidence) break
  }

  return items
}

function generateComplaint(info: CaseInfo): string {
  const rand = seedRand(info.case_number + '_complaint')
  const lawyerName = genName(rand)
  const plaintiffAddr = genAddress(rand)
  const defendantAddr = genAddress(rand)

  const yearMatch = info.case_number.match(/(\d{4})/)
  const baseYear = yearMatch ? parseInt(yearMatch[1]) : 2023
  const baseMonth = randInt(rand, 1, 9)
  const baseDay = randInt(rand, 5, 25)
  const filingDate = new Date(baseYear, baseMonth - 1, baseDay)

  // Generate amount
  const baseAmount = randInt(rand, 10, 200) * 1000000
  const amountStr = baseAmount.toLocaleString()

  // Case type specific content
  let causeText: string
  const cn = info.case_name
  if (cn.includes('대여금') || cn.includes('차용')) {
    const lendDate = `${baseYear - 1}. ${randInt(rand, 1, 12)}. ${randInt(rand, 1, 28)}.`
    causeText = `1. 당사자의 관계
   원고와 피고는 지인 관계에 있는 사람들입니다.

2. 금전 대여 경위
   원고는 ${lendDate}경 피고에게 금 ${amountStr}원을
   변제기 ${baseYear}. ${randInt(rand, 1, 12)}. ${randInt(rand, 1, 28)}.로 정하여
   대여하였습니다.

   피고는 위 변제기가 도래하였음에도 불구하고
   원고에게 위 대여금을 반환하지 않고 있습니다.

3. 결론
   이에 원고는 피고에 대하여 위 대여금 ${amountStr}원 및
   이에 대한 지연손해금의 지급을 구하기 위하여
   이 사건 소를 제기합니다.`
  } else if (cn.includes('매매') || cn.includes('매매대금')) {
    causeText = `1. 매매계약의 체결
   원고는 ${baseYear - 1}년경 피고와 사이에 별지 목록
   기재 부동산에 관하여 매매대금 금 ${amountStr}원으로
   정하여 매매계약을 체결하였습니다.

2. 원고의 의무 이행
   원고는 위 매매계약에 따라 계약금 및 중도금을
   모두 지급하였습니다.

3. 피고의 채무불이행
   그러나 피고는 잔금 지급기일이 도래하였음에도
   소유권이전등기 절차를 이행하지 않고 있습니다.

4. 결론
   이에 원고는 피고에 대하여 매매대금의 반환을
   구하기 위하여 이 사건 소를 제기합니다.`
  } else if (cn.includes('임금') || cn.includes('퇴직금')) {
    causeText = `1. 당사자의 관계
   원고는 ${baseYear - 2}. ${randInt(rand, 1, 12)}. ${randInt(rand, 1, 28)}.부터
   ${baseYear - 1}. ${randInt(rand, 1, 12)}. ${randInt(rand, 1, 28)}.까지
   피고 회사에서 근무한 근로자입니다.

2. 미지급 임금의 발생
   피고는 원고에게 위 근무기간 중 임금 합계
   금 ${amountStr}원을 지급하지 아니하였습니다.

3. 결론
   이에 원고는 피고에 대하여 미지급 임금
   ${amountStr}원 및 이에 대한 지연손해금의
   지급을 구하기 위하여 이 사건 소를 제기합니다.`
  } else if (cn.includes('부당이득')) {
    causeText = `1. 부당이득의 발생
   원고는 피고에게 ${baseYear - 1}년경 금 ${amountStr}원을
   지급하였으나, 위 지급은 법률상 원인이 없는
   것이었습니다.

2. 반환 청구
   원고는 피고에게 수차례 위 금원의 반환을
   요구하였으나 피고는 이를 거부하고 있습니다.

3. 결론
   이에 원고는 피고에 대하여 부당이득금
   ${amountStr}원 및 이에 대한 지연손해금의
   반환을 구하기 위하여 이 사건 소를 제기합니다.`
  } else {
    // 손해배상 or default
    causeText = `1. 당사자들의 관계
   원고와 피고는 계약 관계에 있는 당사자들입니다.

2. 피고의 불법행위
   피고는 ${baseYear - 1}년경 원고에게 허위의 사실을
   고지하여 금 ${amountStr}원 상당의 재산적 손해를
   가하였습니다.

   피고의 위 행위는 민법 제750조의 불법행위에
   해당하므로, 피고는 원고에게 이로 인한 손해를
   배상할 의무가 있습니다.

3. 결론
   이에 원고는 피고에 대하여 위 손해배상금
   ${amountStr}원 및 이에 대한 지연손해금의
   지급을 구하기 위하여 이 사건 소를 제기합니다.`
  }

  // evidence list for complaint
  const evidence = generateEvidence(info.case_number, info.case_name)
  const evidenceLines = evidence.slice(0, 8).map((ev, i) =>
    `${i + 1}. ${ev.num.replace(/갑/, '갑 제').replace(/(\d+)/, '$1호증')}     ${ev.name}`
  ).join('\n')

  return `                         사건번호 ${info.case_number}

                      소    장

원  고   ${info.plaintiff}
         ${plaintiffAddr}
         원고 소송대리인
         변호사 ${lawyerName}

피  고   ${info.defendant}
         ${defendantAddr}

${info.case_name} 청구의 소


청 구 취 지

1. 피고는 원고에게 금 ${amountStr}원 및 이에 대하여
   이 사건 소장 부본 송달일 다음 날부터 다 갚는
   날까지 연 12%의 비율에 의한 금원을 지급하라.
2. 소송비용은 피고가 부담한다.
3. 제1항은 가집행할 수 있다.
라는 판결을 구합니다.

청 구 원 인

${causeText}

입 증 방 법

${evidenceLines}

첨 부 서 류

1. 위 입증방법          각 1통
2. 소장부본              1통
3. 송달료납부서          1통

${fmtDateDot(filingDate)}

원고 소송대리인
변호사   ${lawyerName.split('').join('    ')}

${info.court}  귀중`
}

/* ───────── main component ───────── */
function CaseViewerInner() {
  const params = useSearchParams()
  const caseParam = params.get('case') || ''
  const caseIdParam = params.get('caseId') || ''

  const [caseInfo, setCaseInfo] = useState<CaseInfo>({
    case_number: caseParam || '2023가단5727',
    case_name: '손해배상 등',
    court: '서울중앙지방법원',
    division: '민사21단독',
    plaintiff: '홍길동',
    defendant: '김바른',
    case_type: 'civil',
  })
  const [loading, setLoading] = useState(!!caseIdParam)

  // Fetch from Supabase if caseId is provided
  useEffect(() => {
    if (!caseIdParam) return
    ;(async () => {
      const { data } = await supabase
        .from('practice_cases')
        .select('*')
        .eq('id', caseIdParam)
        .single()
      if (data) {
        setCaseInfo({
          case_number: data.case_number || caseParam || '2023가단5727',
          case_name: data.case_name || '손해배상 등',
          court: data.court || '서울중앙지방법원',
          division: data.division || '민사21단독',
          plaintiff: data.plaintiff || '홍길동',
          defendant: data.defendant || '김바른',
          case_type: data.case_type || 'civil',
        })
      }
      setLoading(false)
    })()
  }, [caseIdParam, caseParam])

  // If only case param, update case_number
  useEffect(() => {
    if (caseParam && !caseIdParam) {
      setCaseInfo(prev => ({ ...prev, case_number: caseParam }))
    }
  }, [caseParam, caseIdParam])

  const records = useMemo(() => generateRecords(caseInfo.case_number, caseInfo.plaintiff, caseInfo.defendant), [caseInfo.case_number, caseInfo.plaintiff, caseInfo.defendant])
  const evidence = useMemo(() => generateEvidence(caseInfo.case_number, caseInfo.case_name), [caseInfo.case_number, caseInfo.case_name])
  const complaintText = useMemo(() => generateComplaint(caseInfo), [caseInfo])

  const [selectedRecord, setSelectedRecord] = useState(0)
  const [activeTab, setActiveTab] = useState<'전체'|'실체'|'절차'|'기일'|'보류'>('전체')
  const [evidenceTab, setEvidenceTab] = useState<'서증목록'|'증인목록'|'첨부'>('서증목록')
  const [evidenceFilter, setEvidenceFilter] = useState<'전체'|'원고'|'피고'|'독립'|'보류'>('전체')
  const [zoom, setZoom] = useState(90)

  const filteredRecords = activeTab === '전체' ? records
    : activeTab === '실체' ? records.filter(r => ['소장','답변서','준비서면','보정서'].some(k => r.name.includes(k)))
    : activeTab === '절차' ? records.filter(r => ['통지','위임','지정','보정명령','조서'].some(k => r.name.includes(k)))
    : activeTab === '기일' ? records.filter(r => r.name.includes('기일') || r.name.includes('조서'))
    : []

  const filteredEvidence = evidenceFilter === '전체' ? evidence
    : evidenceFilter === '원고' ? evidence
    : []

  const tabCounts = {
    '전체': records.length,
    '실체': records.filter(r => ['소장','답변서','준비서면','보정서'].some(k => r.name.includes(k))).length,
    '절차': records.filter(r => ['통지','위임','지정','보정명령','조서'].some(k => r.name.includes(k))).length,
    '기일': records.filter(r => r.name.includes('기일') || r.name.includes('조서')).length,
    '보류': 0,
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>사건 정보를 불러오는 중...</div>
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', fontFamily:"'Malgun Gothic','맑은 고딕',sans-serif", fontSize:13 }}>
      {/* 상단 바 */}
      <div style={{ background:'linear-gradient(90deg,#1a1a2e,#3a3a5e)', color:'#fff', display:'flex', alignItems:'center', padding:'0 16px', height:44, flexShrink:0, gap:16 }}>
        <span style={{ fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ color:'#ff6b6b' }}>&#x25CF;</span> 사건기록열람
        </span>
        <span style={{ background:'rgba(255,255,255,.15)', padding:'3px 14px', borderRadius:3, fontSize:12, fontWeight:600 }}>
          &#x2022; {caseInfo.case_number} {caseInfo.case_name}
        </span>
        <div style={{ marginLeft:'auto', display:'flex', gap:20, fontSize:12 }}>
          <span><strong>원고측</strong> {caseInfo.plaintiff}</span><span style={{ opacity:.5 }}>|</span>
          <span><strong>피고측</strong> {caseInfo.defendant}</span><span style={{ opacity:.5 }}>|</span>
          <span><strong>재판부</strong> {caseInfo.division || '민사단독'}</span>
        </div>
      </div>

      {/* 툴바 */}
      <div style={{ background:'#f0f2f5', borderBottom:'1px solid #ccc', display:'flex', alignItems:'center', gap:4, padding:'4px 10px', flexShrink:0, flexWrap:'wrap' }}>
        {['\u2610 서증등록목록','\u2610 증인등록목록','\uD83D\uDCE5 기록다운로드','\uD83D\uDCCB 사건기록관리','\uD83D\uDDA8 각종목록출력','\u2699 프로그램설치'].map(btn => (
          <button key={btn} style={{ height:28, padding:'0 10px', background:'#fff', border:'1px solid #bbb', borderRadius:3, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>{btn}</button>
        ))}
      </div>

      {/* 3패널 */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* 좌측: 기록목록 */}
        <div style={{ width:280, borderRight:'1px solid #ccc', display:'flex', flexDirection:'column', background:'#fff', flexShrink:0 }}>
          <div style={{ padding:'8px 10px', fontWeight:700, fontSize:13, borderBottom:'1px solid #ddd', color:'#333' }}>기록목록</div>
          <div style={{ display:'flex', borderBottom:'1px solid #ddd' }}>
            {(['전체','실체','절차','기일','보류'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                flex:1, padding:'6px 0', fontSize:10, border:'none', cursor:'pointer', fontFamily:'inherit',
                borderBottom: activeTab === tab ? '2px solid #003366' : '2px solid transparent',
                background:'transparent', fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? '#003366' : '#666',
              }}>{tab}({tabCounts[tab]})</button>
            ))}
          </div>
          <div style={{ display:'flex', background:'#f5f7fa', padding:'4px 8px', borderBottom:'1px solid #ddd', fontSize:10, fontWeight:600, color:'#555' }}>
            <span style={{ width:70 }}>기준일자 &#x21C5;</span>
            <span style={{ flex:1 }}>문건명 &#x21C5;</span>
            <span style={{ width:32, textAlign:'center' }}>진행</span>
            <span style={{ width:38, textAlign:'center' }}>상세메뉴</span>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {filteredRecords.map((r, i) => (
              <div key={i} onClick={() => setSelectedRecord(i)} style={{
                display:'flex', padding:'6px 8px', borderBottom:'1px solid #eee', cursor:'pointer', alignItems:'center',
                background: selectedRecord === i ? '#fffde6' : '#fff',
              }}>
                <span style={{ width:70, fontSize:10, color: selectedRecord === i ? '#c00' : '#333', flexShrink:0 }}>{r.date}</span>
                <span style={{ flex:1, fontSize:11, color: selectedRecord === i ? '#c00' : '#0067c2', fontWeight: selectedRecord === i ? 700 : 400, lineHeight:1.3, wordBreak:'break-all' }}>{r.name}</span>
                <span style={{ width:32, textAlign:'center', flexShrink:0 }}>
                  {r.type && <span style={{ fontSize:8, background:'#0067c2', color:'#fff', padding:'1px 3px', borderRadius:2, fontWeight:700 }}>{r.type}</span>}
                </span>
                <span style={{ width:38, textAlign:'center', flexShrink:0 }}>
                  <button style={{ height:18, padding:'0 4px', border:'1px solid #bbb', background:'#fff', borderRadius:2, fontSize:9, cursor:'pointer', fontFamily:'inherit' }}>선택</button>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 중앙: 문서뷰어 */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#e8e8e8', minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', background:'#ddd', padding:'0 8px', height:28, gap:4, flexShrink:0 }}>
            <span style={{ fontSize:11, cursor:'pointer' }}>&#x2039;</span>
            <span style={{ background:'#fff', border:'1px solid #bbb', borderRadius:'3px 3px 0 0', padding:'2px 12px', fontSize:11, fontWeight:600 }}>
              {filteredRecords[selectedRecord]?.name || '소장'} &#x2715;
            </span>
            <span style={{ fontSize:11, cursor:'pointer' }}>&#x203A;</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, background:'#f5f5f5', padding:'3px 8px', borderBottom:'1px solid #ccc', flexShrink:0 }}>
            {['\uD83D\uDDA8','\uD83D\uDCBE','\uD83D\uDCCB','\u270B','\uD83D\uDCC4','\u21BA'].map((icon,i) => (
              <button key={i} style={{ width:24, height:24, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer', fontSize:12 }}>{icon}</button>
            ))}
            <span style={{ fontSize:11, color:'#555', margin:'0 4px' }}>&mdash;</span>
            <span style={{ fontSize:11, fontWeight:600 }}>{zoom} %</span>
            <button onClick={() => setZoom(z => Math.max(30, z-10))} style={{ width:24, height:24, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer', fontSize:13 }}>&minus;</button>
            <button onClick={() => setZoom(z => Math.min(200, z+10))} style={{ width:24, height:24, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer', fontSize:13 }}>+</button>
            <button style={{ width:24, height:24, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer', fontSize:12 }}>{'\uD83D\uDD0D'}</button>
          </div>
          <div style={{ flex:1, overflow:'auto', display:'flex', justifyContent:'center', padding:16, background:'#888' }}>
            <div style={{
              background:'#fff', width: 520, minHeight:750, padding:'40px 50px', boxShadow:'0 2px 16px rgba(0,0,0,.4)',
              fontSize:13, whiteSpace:'pre-wrap', lineHeight:1.9, fontFamily:"'Batang','바탕',serif",
              transform:`scale(${zoom/100})`, transformOrigin:'top center',
            }}>
              {complaintText}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'5px 0', background:'#f5f5f5', borderTop:'1px solid #ccc', flexShrink:0, fontSize:11 }}>
            <input type="text" defaultValue="1" style={{ width:28, height:22, textAlign:'center', border:'1px solid #bbb', borderRadius:2, fontSize:11 }} />
            <span>/ {records.length}</span>
            <button style={{ width:22, height:22, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer' }}>&#x2039;</button>
            <button style={{ width:22, height:22, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer' }}>&#x203A;</button>
            <button onClick={() => setZoom(z => Math.max(30, z-10))} style={{ width:22, height:22, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer' }}>&minus;</button>
            <button onClick={() => setZoom(z => Math.min(200, z+10))} style={{ width:22, height:22, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer' }}>+</button>
            <button style={{ width:22, height:22, border:'1px solid #bbb', background:'#fff', borderRadius:2, cursor:'pointer' }}>{'\uD83D\uDD0D'}</button>
            <span style={{ marginLeft:8, color:'#888' }}>1/{records.length}</span>
          </div>
        </div>

        {/* 우측: 서증목록 */}
        <div style={{ width:320, borderLeft:'1px solid #ccc', display:'flex', flexDirection:'column', background:'#fff', flexShrink:0 }}>
          <div style={{ display:'flex', borderBottom:'1px solid #ddd' }}>
            {(['서증목록','증인목록','첨부'] as const).map(tab => (
              <button key={tab} onClick={() => setEvidenceTab(tab)} style={{
                flex:1, padding:'7px 0', fontSize:12, border:'none', cursor:'pointer', fontFamily:'inherit',
                borderBottom: evidenceTab === tab ? '2px solid #003366' : '2px solid transparent',
                background:'transparent', fontWeight: evidenceTab === tab ? 700 : 400,
                color: evidenceTab === tab ? '#003366' : '#666',
              }}>{tab}</button>
            ))}
          </div>
          <div style={{ display:'flex', borderBottom:'1px solid #ddd', padding:'0 2px' }}>
            <span style={{ fontSize:10, color:'#888', cursor:'pointer', padding:'0 2px' }}>&#x2039;</span>
            {(['전체','원고','피고','독립','보류'] as const).map(f => (
              <button key={f} onClick={() => setEvidenceFilter(f)} style={{
                flex:1, padding:'5px 0', fontSize:10, border:'none', cursor:'pointer', fontFamily:'inherit',
                color: evidenceFilter === f ? '#003366' : '#666',
                fontWeight: evidenceFilter === f ? 700 : 400,
                textDecoration: evidenceFilter === f ? 'underline' : 'none',
                background:'transparent',
              }}>{f}({f === '전체' ? evidence.length : f === '원고' ? evidence.length : 0})</button>
            ))}
            <span style={{ fontSize:10, color:'#888', cursor:'pointer', padding:'0 2px' }}>&#x203A;</span>
          </div>
          <div style={{ display:'flex', background:'#f5f7fa', padding:'4px 8px', borderBottom:'1px solid #ddd', fontSize:10, fontWeight:600, color:'#555' }}>
            <span style={{ width:42 }}>번호 &#x21C5;</span>
            <span style={{ flex:1 }}>서증명</span>
            <span style={{ width:28, textAlign:'center' }}>비고</span>
            <span style={{ width:40, textAlign:'center' }}>상세메뉴</span>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {filteredEvidence.map((ev, i) => (
              <div key={i} style={{ display:'flex', padding:'5px 8px', borderBottom:'1px solid #eee', alignItems:'center' }}>
                <span style={{ width:42, fontSize:10, color:'#333', fontWeight:600, flexShrink:0 }}>{ev.num}</span>
                <span style={{ flex:1, fontSize:11, color:'#0067c2', cursor:'pointer', lineHeight:1.3 }}>{ev.name}</span>
                <span style={{ width:28, textAlign:'center', fontSize:9, color:'#555', flexShrink:0 }}>{ev.side}</span>
                <span style={{ width:40, textAlign:'center', display:'flex', gap:2, justifyContent:'center', flexShrink:0 }}>
                  {ev.hasOriginal && <span style={{ fontSize:8, background:'#0067c2', color:'#fff', padding:'1px 3px', borderRadius:2 }}>원본</span>}
                  <button style={{ height:16, padding:'0 3px', border:'1px solid #bbb', background:'#fff', borderRadius:2, fontSize:8, cursor:'pointer', fontFamily:'inherit' }}>선택</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CaseViewerPage() {
  return (
    <Suspense fallback={<div style={{ padding:40, textAlign:'center' }}>로딩 중...</div>}>
      <CaseViewerInner />
    </Suspense>
  )
}
