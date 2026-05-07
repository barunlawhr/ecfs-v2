'use client'

import { useState } from 'react'

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
export interface DocViewerData {
  id: string
  court: string
  division: string
  case_number: string
  document_name: string
  sent_at: string
  received_at: string | null
  icon_color: string
  document_category: string
  template_data?: Record<string, unknown> | null
}

interface Props {
  doc: DocViewerData
  onClose: () => void
  onConfirmed?: () => void
}

const TEAL = '#00897b'
const NAVY = '#003366'

// ═══════════════════════════════════════════
// Document Templates
// ═══════════════════════════════════════════

function DocHeader({ court, title }: { court: string; title: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 8, marginBottom: 24 }}>{court}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
    </div>
  )
}

function CaseParties({ caseNumber, caseName, plaintiff, defendant, labelP, labelD }: {
  caseNumber: string; caseName?: string; plaintiff: string; defendant: string; labelP?: string; labelD?: string
}) {
  const lp = labelP || '원   고'
  const ld = labelD || '피   고'
  return (
    <div style={{ marginBottom: 30, lineHeight: 2.2, whiteSpace: 'pre-wrap' }}>
      <div>사   건    {caseNumber} {caseName || '손해배상(기)'}</div>
      <div>{lp}    {plaintiff}</div>
      <div>{ld}    {defendant}</div>
    </div>
  )
}

function OfficerSign({ date, officer, title }: { date?: string; officer?: string; title?: string }) {
  const d = date || new Date().toISOString().slice(0, 10)
  const [y, m, dd] = d.split('-')
  return (
    <div style={{ marginTop: 60, textAlign: 'right', lineHeight: 2.4 }}>
      <div>{y}. {parseInt(m)}. {parseInt(dd)}.</div>
      <div>{title || '법원주사'} {officer || '김법원'}</div>
    </div>
  )
}

function JudgeSign({ date, judge }: { date?: string; judge?: string }) {
  const d = date || new Date().toISOString().slice(0, 10)
  const [y, m, dd] = d.split('-')
  return (
    <div style={{ marginTop: 60, textAlign: 'right', lineHeight: 2.4 }}>
      <div>{y}. {parseInt(m)}. {parseInt(dd)}.</div>
      <div>판사 {judge || '박정의'}</div>
    </div>
  )
}

function SectionTitle({ text }: { text: string }) {
  return <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 16, margin: '30px 0 16px' }}>{text}</div>
}

// ── Templates ──

function SentencingNoticeTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="선고기일통지서" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <div style={{ lineHeight: 2.2, whiteSpace: 'pre-wrap' }}>
        위 사건의 선고기일이 다음과 같이 지정되었습니다.{'\n'}
        당사자는 선고기일에 출석할 수 있으며, 당사자가 출석하지{'\n'}
        아니하여도 판결을 선고할 수 있습니다.{'\n\n'}
        일시: {td.date || '2026. 6. 10.'} ({td.day || '화'}) {td.time || '10:00'}{'\n'}
        장소: {td.location || '제301호 법정'}
      </div>
      <OfficerSign date={td.sign_date} officer={td.officer} />
    </>
  )
}

function HearingNoticeTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="변론기일통지서" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <div style={{ lineHeight: 2.2, whiteSpace: 'pre-wrap' }}>
        위 사건의 변론기일이 다음과 같이 지정되었습니다.{'\n'}
        당사자는 변론기일에 출석하여 주시기 바랍니다.{'\n\n'}
        일시: {td.date || '2026. 5. 20.'} ({td.day || '목'}) {td.time || '14:00'}{'\n'}
        장소: {td.location || '제205호 법정'}
      </div>
      <OfficerSign date={td.sign_date} officer={td.officer} />
    </>
  )
}

function DateChangeNoticeTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="변경기일통지서" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <div style={{ lineHeight: 2.2, whiteSpace: 'pre-wrap' }}>
        위 사건의 기일이 다음과 같이 변경되었습니다.{'\n\n'}
        변경 전: {td.before_date || '2026. 5. 20.'} {td.before_time || '14:00'}{'\n'}
        변경 후: {td.after_date || '2026. 6. 3.'} {td.after_time || '10:30'}{'\n'}
        장소: {td.location || '제205호 법정'}{'\n\n'}
        변경사유: {td.reason || '재판부 사정'}
      </div>
      <OfficerSign date={td.sign_date} officer={td.officer} />
    </>
  )
}

function JudgmentTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="판 결" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <SectionTitle text="주    문" />
      <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap', marginBottom: 20 }}>
        {td.verdict || '1. 피고는 원고에게 금 50,000,000원 및 이에 대하여 2025. 3. 1.부터 이 사건 판결 선고일까지는 연 5%, 그 다음날부터 다 갚는 날까지는 연 12%의 각 비율로 계산한 돈을 지급하라.\n2. 소송비용은 피고가 부담한다.\n3. 제1항은 가집행할 수 있다.'}
      </div>
      <SectionTitle text="청구취지" />
      <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap', marginBottom: 20 }}>
        {td.claim_purpose || '주문과 같다.'}
      </div>
      <SectionTitle text="이    유" />
      <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap' }}>
        {td.reasoning || '1. 인정사실\n  가. 원고와 피고 사이에 2024. 12. 1. 금전소비대차계약이 체결된 사실\n  나. 피고가 변제기 도과 후에도 원금을 반환하지 않고 있는 사실\n\n이상의 사실은 당사자 사이에 다툼이 없거나, 갑 제1 내지 5호증의 각 기재에 의하여 인정된다.\n\n2. 판단\n위 인정사실에 의하면, 피고는 원고에게 대여금 50,000,000원 및 이에 대한 지연손해금을 지급할 의무가 있다.'}
      </div>
      <JudgeSign date={td.judgment_date} judge={td.judge} />
    </>
  )
}

function CostDeterminationTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="소송비용액확정결정" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" labelP="신청인" labelD="피신청인" />
      <div style={{ lineHeight: 2.2, marginBottom: 20 }}>
        위 당사자 사이의 위 사건의 소송비용액을 다음과 같이 확정한다.
      </div>
      <SectionTitle text="주    문" />
      <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap' }}>
        신청인이 피신청인으로부터 상환받을 소송비용액은{'\n'}
        금 {td.amount || '1,230,000'}원으로 확정한다.
      </div>
      <JudgeSign date={td.decision_date} judge={td.judge} />
    </>
  )
}

function AssetDisclosureTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="재산명시결정" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" labelP="채권자" labelD="채무자" />
      <SectionTitle text="주    문" />
      <div style={{ lineHeight: 2.2, whiteSpace: 'pre-wrap' }}>
        채무자는 이 결정 송달 후 {td.deadline_days || '14'}일 이내에{'\n'}
        재산목록을 제출하라.
      </div>
      <JudgeSign date={td.decision_date} judge={td.judge} />
    </>
  )
}

function SecurityOrderTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="담보제공명령" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <SectionTitle text="주    문" />
      <div style={{ lineHeight: 2.2, whiteSpace: 'pre-wrap' }}>
        원고는 이 명령 송달일로부터 {td.deadline_days || '7'}일 이내에{'\n'}
        금 {td.amount || '5,000,000'}원을 담보로 제공하라.
      </div>
      <JudgeSign date={td.decision_date} judge={td.judge} />
    </>
  )
}

function AddressCorrectionTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="주소보정명령" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <SectionTitle text="주    문" />
      <div style={{ lineHeight: 2.2, whiteSpace: 'pre-wrap' }}>
        원고는 이 명령 송달일로부터 {td.deadline_days || '7'}일 이내에{'\n'}
        피고의 주소를 보정하라.{'\n\n'}
        미보정 시 소장이 각하될 수 있습니다.
      </div>
      <OfficerSign date={td.sign_date} officer={td.officer} />
    </>
  )
}

function CorrectionRecommendationTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="보정권고" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <div style={{ lineHeight: 2.2, whiteSpace: 'pre-wrap' }}>
        위 사건에 관하여 다음 사항을 보정하시기 바랍니다.{'\n\n'}
        보정사항:{'\n'}
        {td.content || '1. 청구취지를 특정하여 주시기 바랍니다.\n2. 입증자료를 보충하여 주시기 바랍니다.'}{'\n\n'}
        보정기한: 이 서면 송달일로부터 {td.deadline_days || '14'}일 이내
      </div>
      <OfficerSign date={td.sign_date} officer={td.officer} />
    </>
  )
}

function BriefCopyTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="준비서면(부본)" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap' }}>
        {td.content || '위 사건에 관하여 피고(원고)의 소송대리인은 다음과 같이 준비서면을 제출합니다.\n\n1. 원고의 청구원인에 대한 답변\n\n  원고가 주장하는 대여금 채권은 이미 변제기 도래 전 전액 상환되었습니다.\n\n2. 증거\n  을 제1호증 송금확인서\n  을 제2호증 영수증'}
      </div>
    </>
  )
}

function ComplaintCopyTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="소장(부본)" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <SectionTitle text="청구취지" />
      <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap', marginBottom: 20 }}>
        {td.claim_purpose || '1. 피고는 원고에게 금 50,000,000원 및 이에 대하여 2025. 3. 1.부터 다 갚는 날까지 연 12%의 비율로 계산한 돈을 지급하라.\n2. 소송비용은 피고가 부담한다.\n3. 제1항은 가집행할 수 있다.\n라는 판결을 구합니다.'}
      </div>
      <SectionTitle text="청구원인" />
      <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap' }}>
        {td.claim_cause || '1. 원고는 2024. 12. 1. 피고에게 금 50,000,000원을 변제기 2025. 2. 28.로 정하여 대여하였습니다.\n2. 피고는 변제기가 도과하였음에도 불구하고 위 대여금을 반환하지 않고 있습니다.\n3. 이에 원고는 피고에 대하여 위 대여금 및 지연손해금의 지급을 구하기 위하여 이 사건 소를 제기합니다.'}
      </div>
    </>
  )
}

function AnswerCopyTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="답변서(부본)" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <SectionTitle text="청구취지에 대한 답변" />
      <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap', marginBottom: 20 }}>
        {td.claim_purpose || '1. 원고의 청구를 기각한다.\n2. 소송비용은 원고가 부담한다.\n라는 판결을 구합니다.'}
      </div>
      <SectionTitle text="청구원인에 대한 답변" />
      <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap' }}>
        {td.claim_cause || '1. 원고 주장의 대여 사실은 인정하나, 피고는 2025. 2. 25. 이미 전액을 변제하였습니다.\n2. 따라서 원고의 청구는 이유 없으므로 기각되어야 합니다.'}
      </div>
    </>
  )
}

function AppealCopyTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="항소장(부본)" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap' }}>
        {td.content || '항소취지\n\n1. 제1심 판결을 취소한다.\n2. 원고의 청구를 기각한다.\n3. 소송비용은 제1, 2심 모두 원고가 부담한다.\n라는 판결을 구합니다.\n\n항소이유\n\n항소이유서는 추후 제출하겠습니다.'}
      </div>
    </>
  )
}

function CounterclaimTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="반소장" />
      <CaseParties caseNumber={doc.case_number} plaintiff="주식회사 가나다라마" defendant="홍길동" labelP="반소원고" labelD="반소피고" />
      <SectionTitle text="반소청구취지" />
      <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap' }}>
        {td.content || '1. 반소피고는 반소원고에게 금 20,000,000원 및 이에 대한 지연손해금을 지급하라.\n2. 소송비용은 반소피고가 부담한다.\n라는 판결을 구합니다.'}
      </div>
    </>
  )
}

function MediationReferralTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="조정회부결정" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <SectionTitle text="주    문" />
      <div style={{ lineHeight: 2.2, whiteSpace: 'pre-wrap' }}>
        이 사건을 조정에 회부한다.{'\n\n'}
        조정기일: {td.mediation_date || '2026. 6. 15. 14:00'}{'\n'}
        장소: {td.location || '조정실 제2호'}
      </div>
      <JudgeSign date={td.decision_date} judge={td.judge} />
    </>
  )
}

function ForcedMediationTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="조정을 갈음하는 결정" />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <SectionTitle text="주    문" />
      <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap' }}>
        {td.content || '1. 피고는 원고에게 금 30,000,000원을 2026. 7. 31.까지 지급한다.\n2. 원고는 나머지 청구를 포기한다.\n3. 소송비용은 각자 부담한다.'}
      </div>
      <div style={{ marginTop: 20, lineHeight: 2, whiteSpace: 'pre-wrap', fontSize: 12, color: '#555' }}>
        ※ 이 결정에 대하여 결정서 송달일로부터 2주 이내에 이의신청을 하지 아니하면{'\n'}
        이 결정은 재판상 화해와 같은 효력이 있습니다.
      </div>
      <JudgeSign date={td.decision_date} judge={td.judge} />
    </>
  )
}

function HearingProtocolTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title="변론조서" />
      <div style={{ lineHeight: 2.2, whiteSpace: 'pre-wrap', marginBottom: 20 }}>
        사   건    {doc.case_number} 손해배상(기){'\n'}
        일   시    {td.date || '2026. 5. 20. 14:00'}{'\n'}
        장   소    {td.location || '제205호 법정'}{'\n'}
        판   사    {td.judge || '박정의'}{'\n'}
        원   고    {td.plaintiff_status || '출석'}{'\n'}
        피   고    {td.defendant_status || '출석'}
      </div>
      <SectionTitle text="조서내용" />
      <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap' }}>
        {td.content || '1. 원고 소송대리인 변론요지 진술\n2. 피고 소송대리인 변론요지 진술\n3. 증거조사\n   - 갑 제1호증 내지 제5호증 제출(인정)\n   - 을 제1호증 내지 제3호증 제출(부인)\n4. 다음 기일: 2026. 6. 10. 10:00 선고'}
      </div>
    </>
  )
}

function GenericNoticeTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title={doc.document_name.replace('등본', '').replace('부본', '')} />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <div style={{ lineHeight: 2.2, whiteSpace: 'pre-wrap' }}>
        {td.content || '위 사건에 관하여 다음과 같이 통지합니다.'}
      </div>
      <OfficerSign date={td.sign_date} officer={td.officer} />
    </>
  )
}

function DefaultTemplate({ doc }: { doc: DocViewerData }) {
  const td = (doc.template_data || {}) as Record<string, string>
  return (
    <>
      <DocHeader court={doc.court} title={doc.document_name} />
      <CaseParties caseNumber={doc.case_number} plaintiff="홍길동" defendant="주식회사 가나다라마" />
      <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap' }}>
        {td.content || '(문서 내용)'}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════
// Document Body Router
// ═══════════════════════════════════════════
function DocumentBody({ doc }: { doc: DocViewerData }) {
  const name = doc.document_name
  if (name.includes('선고기일통지서')) return <SentencingNoticeTemplate doc={doc} />
  if (name.includes('변론기일통지서')) return <HearingNoticeTemplate doc={doc} />
  if (name.includes('변경기일통지서')) return <DateChangeNoticeTemplate doc={doc} />
  if (name.includes('판결정본') || name.includes('판결')) return <JudgmentTemplate doc={doc} />
  if (name.includes('소송비용액확정결정')) return <CostDeterminationTemplate doc={doc} />
  if (name.includes('재산명시결정')) return <AssetDisclosureTemplate doc={doc} />
  if (name.includes('담보제공명령')) return <SecurityOrderTemplate doc={doc} />
  if (name.includes('주소보정명령')) return <AddressCorrectionTemplate doc={doc} />
  if (name.includes('보정권고') || name.includes('보정명령')) return <CorrectionRecommendationTemplate doc={doc} />
  if (name.includes('준비서면부본') || name.includes('준비서면')) return <BriefCopyTemplate doc={doc} />
  if (name.includes('소장부본') || name.includes('소장')) return <ComplaintCopyTemplate doc={doc} />
  if (name.includes('답변서부본') || name.includes('답변서')) return <AnswerCopyTemplate doc={doc} />
  if (name.includes('항소장부본') || name.includes('항소장')) return <AppealCopyTemplate doc={doc} />
  if (name.includes('반소장')) return <CounterclaimTemplate doc={doc} />
  if (name.includes('조정회부결정')) return <MediationReferralTemplate doc={doc} />
  if (name.includes('조정을갈음하는결정') || name.includes('조정을 갈음하는 결정')) return <ForcedMediationTemplate doc={doc} />
  if (name.includes('각종허가서') || name.includes('허가서')) return <GenericNoticeTemplate doc={doc} />
  if (name.includes('가지급금반환')) return <GenericNoticeTemplate doc={doc} />
  if (name.includes('변론조서')) return <HearingProtocolTemplate doc={doc} />
  if (name.includes('통지서')) return <GenericNoticeTemplate doc={doc} />
  return <DefaultTemplate doc={doc} />
}

// ═══════════════════════════════════════════
// Main Modal
// ═══════════════════════════════════════════
export default function DocumentViewerModal({ doc, onClose, onConfirmed }: Props) {
  const [zoom, setZoom] = useState(100)

  // 열람 처리는 부모에서 호출 전 수행
  void onConfirmed

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 7000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', width: 1100, maxWidth: '96vw', height: '90vh', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,.35)' }}>

        {/* Browser window header */}
        <div style={{ background: '#f0f2f5', padding: '6px 12px', borderBottom: '1px solid #d0d4dc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#444' }}>
            <span style={{ fontSize: 14 }}>&#127760;</span>
            <span>문서뷰어</span>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            <button style={{ width: 28, height: 22, border: 'none', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#666' }}>&#9620;</button>
            <button style={{ width: 28, height: 22, border: 'none', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#666' }}>&#9723;</button>
            <button onClick={onClose} style={{ width: 28, height: 22, border: 'none', background: 'transparent', fontSize: 15, cursor: 'pointer', color: '#666' }}>&times;</button>
          </div>
        </div>

        {/* URL bar */}
        <div style={{ background: '#fff', padding: '4px 12px', borderBottom: '1px solid #d0d8e4', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#666' }}>&#128274;</span>
          <span style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>https://ecfs.scourt.go.kr/sgvo/document/view/{doc.id}</span>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left panel */}
          <div style={{ width: 220, borderRight: '1px solid #d0d8e4', background: '#fafbfd', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            {/* Case info table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <tbody>
                {[
                  ['법원', doc.court],
                  ['재판부', doc.division],
                  ['사건번호', doc.case_number],
                  ['사건명', doc.document_category === 'decision' ? '채권가압류' : '손해배상(기)'],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td style={{ padding: '8px 8px', background: '#f0f3f8', fontWeight: 600, borderBottom: '1px solid #e0e4ec', width: 60, color: '#333' }}>{label}</td>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid #e0e4ec', color: '#222' }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Document list */}
            <div style={{ padding: '8px 0', borderTop: '1px solid #d0d8e4' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 4px', background: '#f0f3f8', borderBottom: '1px solid #d0d8e4', fontWeight: 600, color: '#555', width: 28 }}>no</th>
                    <th style={{ padding: '6px 4px', background: '#f0f3f8', borderBottom: '1px solid #d0d8e4', fontWeight: 600, color: '#555', textAlign: 'left' }}>문서명</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#e8f0fe' }}>
                    <td style={{ padding: '6px 4px', textAlign: 'center', borderBottom: '1px solid #e8ecf2' }}>1</td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #e8ecf2', fontWeight: 600, color: NAVY }}>{doc.document_name}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
            {/* Toolbar */}
            <div style={{ background: '#e8edf4', padding: '4px 12px', borderBottom: '1px solid #d0d8e4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#555', padding: '2px 6px', background: '#fff', border: '1px solid #ccc', borderRadius: 3 }}>{doc.document_name}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button style={{ width: 26, height: 24, border: '1px solid #bbb', background: '#fff', borderRadius: 3, fontSize: 12, cursor: 'pointer' }} title="인쇄">&#128424;</button>
                <button style={{ width: 26, height: 24, border: '1px solid #bbb', background: '#fff', borderRadius: 3, fontSize: 12, cursor: 'pointer' }} title="저장">&#128190;</button>
                <span style={{ width: 1, height: 16, background: '#ccc' }} />
                <button onClick={() => setZoom(z => Math.max(50, z - 10))} style={{ width: 26, height: 24, border: '1px solid #bbb', background: '#fff', borderRadius: 3, fontSize: 14, cursor: 'pointer' }}>-</button>
                <span style={{ fontSize: 11, minWidth: 36, textAlign: 'center' }}>{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(200, z + 10))} style={{ width: 26, height: 24, border: '1px solid #bbb', background: '#fff', borderRadius: 3, fontSize: 14, cursor: 'pointer' }}>+</button>
              </div>
            </div>

            {/* Document body */}
            <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', justifyContent: 'center' }}>
              <div style={{
                background: '#fff',
                width: 700,
                maxWidth: '100%',
                minHeight: 900,
                padding: '60px 80px',
                fontFamily: "'Batang', '바탕체', '맑은 고딕', serif",
                fontSize: 14,
                lineHeight: 1.8,
                boxShadow: '0 0 8px rgba(0,0,0,.15)',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
              }}>
                <DocumentBody doc={doc} />
              </div>
            </div>

            {/* Page control */}
            <div style={{ background: '#e8edf4', padding: '4px 12px', borderTop: '1px solid #d0d8e4', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#555' }}>1/1</span>
            </div>
          </div>
        </div>

        {/* Bottom button bar */}
        <div style={{ background: '#f5f7fa', padding: '10px 16px', borderTop: '1px solid #d0d8e4', display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button style={{ height: 32, padding: '0 16px', background: TEAL, color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>일괄출력</button>
          <button style={{ height: 32, padding: '0 16px', background: TEAL, color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>일괄저장</button>
          <button style={{ height: 32, padding: '0 16px', background: NAVY, color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>파일저장</button>
          <button style={{ height: 32, padding: '0 16px', background: '#e0e4ec', color: '#333', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>크게보기</button>
          <button onClick={onClose} style={{ height: 32, padding: '0 16px', background: '#e0e4ec', color: '#333', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>닫기</button>
        </div>
      </div>
    </div>
  )
}
