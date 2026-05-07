import type { ComplaintFormData, SampleCase } from '@/types'

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

// ── 기존 인터페이스 (하위 호환) ──
export interface ScoreBreakdown { parties: number; claim: number; cause: number; evidence: number }
export interface ScoreResult { score: number; breakdown: ScoreBreakdown; issues: string[] }

// ── 신규 실습 채점 인터페이스 ──
export interface PracticeScoreItem {
  item: string
  score: number
  maxScore: number
  status: 'pass' | 'partial' | 'fail'
  message: string
}

export interface PracticeScoreResult {
  totalScore: number
  breakdown: PracticeScoreItem[]
  issues: string[]
  canCallAI: boolean
}

// ── 실습 제출 데이터 ──
export interface PracticeSubmission {
  docType: 'complaint' | 'answer' | 'brief'
  plaintiffName?: string
  plaintiffAddr?: string
  plaintiffRegNo?: string
  defendantName?: string
  defendantAddr?: string
  claimPurpose?: string
  claimReason?: string
  answerPurpose?: string
  answerReason?: string
  content?: string
  inputMode?: string
  fileName?: string
  evidence?: { name: string; purpose: string }[]
}

export interface PracticeCaseData {
  plaintiff: string
  defendant: string
  case_name?: string
  case_facts?: string
  sample_claim_purpose?: string
  sample_claim_reason?: string
  sample_answer_purpose?: string
  sample_answer_reason?: string
}

// ═══════════════════════════════════════════════════
//  신규: 실습 문항 채점 (소장/답변서/준비서면)
// ═══════════════════════════════════════════════════

export function practiceGrade(data: PracticeSubmission, caseData: PracticeCaseData): PracticeScoreResult {
  const breakdown: PracticeScoreItem[] = []
  const issues: string[] = []
  let total = 0

  function addItem(item: string, score: number, maxScore: number, message: string) {
    const pct = maxScore > 0 ? score / maxScore : 0
    const status = pct >= 0.8 ? 'pass' as const : pct >= 0.5 ? 'partial' as const : 'fail' as const
    breakdown.push({ item, score, maxScore, status, message })
    total += score
  }

  if (data.docType === 'complaint') {
    // ① 원고 정보 (15점)
    let pScore = 0
    if (!data.plaintiffName?.trim()) {
      issues.push('원고 이름을 입력해주세요.')
    } else {
      const nameMatch = norm(data.plaintiffName).includes(norm(caseData.plaintiff).split(' ')[0] || norm(caseData.plaintiff))
      const addrOk = (data.plaintiffAddr?.length || 0) > 5
      if (nameMatch && addrOk) pScore = 15
      else if (nameMatch || addrOk) { pScore = 8; issues.push('원고 정보를 정확히 확인해주세요.') }
      else { issues.push(`원고명이 사건의 원고(${caseData.plaintiff})와 다릅니다.`) }
    }
    addItem('원고 정보', pScore, 15, pScore === 15 ? '정확합니다.' : '확인 필요')

    // ② 피고 정보 (15점)
    let dScore = 0
    if (!data.defendantName?.trim()) {
      issues.push('피고 이름을 입력해주세요.')
    } else {
      const nameMatch = norm(data.defendantName).includes(norm(caseData.defendant).split(' ')[0] || norm(caseData.defendant))
      const addrOk = (data.defendantAddr?.length || 0) > 5
      if (nameMatch && addrOk) dScore = 15
      else if (nameMatch || addrOk) { dScore = 8; issues.push('피고 정보를 정확히 확인해주세요.') }
      else { issues.push(`피고명이 사건의 피고(${caseData.defendant})와 다릅니다.`) }
    }
    addItem('피고 정보', dScore, 15, dScore === 15 ? '정확합니다.' : '확인 필요')

    // ③ 청구취지 (20점)
    let cpScore = 0
    if (!data.claimPurpose || data.claimPurpose.length < 20) {
      issues.push('청구취지를 작성해주세요.')
    } else {
      const sub = norm(data.claimPurpose)
      const reqKw = ['지급하라', '소송비용', '가집행']
      const kwMatches = reqKw.filter(k => sub.includes(k))
      cpScore += Math.round((kwMatches.length / reqKw.length) * 12)
      // 금액 체크
      const sample = norm(caseData.sample_claim_purpose || '')
      const amtMatch = sample.match(/\d{1,3}(,\d{3})*/)
      if (amtMatch && sub.includes(amtMatch[0])) cpScore += 8
      else issues.push('청구취지에 정확한 청구금액을 기재해주세요.')
      if (kwMatches.length < reqKw.length) {
        const miss = reqKw.filter(k => !sub.includes(k))
        issues.push(`청구취지에 "${miss.join('", "')}" 표현이 누락되었습니다.`)
      }
    }
    addItem('청구취지', cpScore, 20, cpScore >= 16 ? '잘 작성되었습니다.' : '수정이 필요합니다.')

    // ④ 청구원인 (20점)
    let crScore = 0
    if (!data.claimReason || data.claimReason.length < 100) {
      issues.push('청구원인을 더 구체적으로 작성해주세요. (최소 100자)')
    } else {
      const sub = norm(data.claimReason)
      const secs = ['당사자', '계약', '청구']
      const secMatches = secs.filter(s => sub.includes(s))
      crScore += Math.round((secMatches.length / secs.length) * 12)
      crScore += sub.length >= 300 ? 8 : sub.length >= 200 ? 5 : 3
      if (secMatches.length < secs.length) {
        const miss = secs.filter(s => !sub.includes(s))
        issues.push(`청구원인에 "${miss.join('", "')}" 관련 내용을 추가해주세요.`)
      }
    }
    addItem('청구원인', crScore, 20, crScore >= 16 ? '잘 작성되었습니다.' : '보완이 필요합니다.')

    // ⑤ 증거목록 (30점)
    let evScore = 0
    if (!data.evidence || data.evidence.length === 0) {
      issues.push('증거 목록을 1개 이상 입력해주세요.')
    } else {
      data.evidence.forEach((ev) => {
        if (ev.name?.length > 0) evScore += 8
        if (ev.purpose?.length > 0) evScore += 7
      })
      evScore = Math.min(evScore, 30)
      if (data.evidence.some(e => !e.name?.trim())) issues.push('증거명이 비어있는 항목이 있습니다.')
      if (data.evidence.some(e => !e.purpose?.trim())) issues.push('입증취지를 작성해주세요.')
    }
    addItem('증거 목록', evScore, 30, evScore >= 24 ? '정확합니다.' : '증거 정보를 보완해주세요.')

  } else if (data.docType === 'answer') {
    // ① 답변취지 (20점)
    let apScore = 0
    if (!data.answerPurpose || data.answerPurpose.length < 10) {
      issues.push('답변취지를 작성해주세요.')
    } else {
      const sub = norm(data.answerPurpose)
      const kw = ['기각', '소송비용']
      const matches = kw.filter(k => sub.includes(k))
      apScore = Math.round((matches.length / kw.length) * 20)
      if (matches.length < kw.length) {
        const miss = kw.filter(k => !sub.includes(k))
        issues.push(`답변취지에 "${miss.join('", "')}" 표현을 포함해주세요.`)
      }
    }
    addItem('답변취지', apScore, 20, apScore === 20 ? '정확합니다.' : '형식을 확인해주세요.')

    // ② 답변이유 (60점)
    let arScore = 0
    if (!data.answerReason || data.answerReason.length < 100) {
      issues.push('답변이유를 더 구체적으로 작성해주세요. (최소 100자)')
    } else {
      const sub = norm(data.answerReason)
      const len = sub.length
      arScore += len >= 300 ? 30 : len >= 200 ? 20 : 10
      const secs = ['부인', '사실', '결론']
      const matches = secs.filter(s => sub.includes(s))
      arScore += Math.round((matches.length / secs.length) * 30)
    }
    addItem('답변이유', arScore, 60, '내용 품질은 AI가 추가 평가합니다.')

    // ③ 증거목록 을호증 (20점)
    let evScore = 0
    if (!data.evidence || data.evidence.length === 0) {
      issues.push('을호증 목록을 1개 이상 입력해주세요.')
    } else {
      data.evidence.forEach(ev => {
        if (ev.name?.length > 0) evScore += 5
        if (ev.purpose?.length > 0) evScore += 5
      })
      evScore = Math.min(evScore, 20)
    }
    addItem('증거 목록(을호증)', evScore, 20, evScore >= 16 ? '정확합니다.' : '증거 정보를 보완해주세요.')

  } else if (data.docType === 'brief') {
    // 준비서면: 내용 길이 기반 (100점)
    if (data.inputMode === 'file') {
      if (data.fileName) { addItem('파일 첨부', 100, 100, '파일이 첨부되었습니다.') }
      else { addItem('파일 첨부', 0, 100, '파일을 첨부해주세요.'); issues.push('파일을 업로드해주세요.') }
    } else {
      const len = (data.content || '').length
      const s = len >= 500 ? 100 : len >= 300 ? 80 : len >= 100 ? 60 : len > 0 ? 30 : 0
      addItem('변론내용', s, 100, s >= 80 ? '잘 작성되었습니다.' : '내용을 보완해주세요.')
      if (len < 100) issues.push('변론내용을 100자 이상 작성해주세요.')
    }
  }

  return { totalScore: Math.min(total, 100), breakdown, issues, canCallAI: total >= 40 }
}

// ═══════════════════════════════════════════════════
//  기존: 레거시 채점 (하위 호환)
// ═══════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ruleGrade(data: ComplaintFormData, answer?: SampleCase | null): ScoreResult {
  const bd: ScoreBreakdown = { parties: 0, claim: 0, cause: 0, evidence: 0 }
  const issues: string[] = []
  const isAnswer = data.doc_type === 'answer'
  const maxP = isAnswer ? 20 : 30, maxCl = isAnswer ? 30 : 20, maxCa = isAnswer ? 30 : 20, maxEv = 30

  const ps = data.parties || []
  const hasW = ps.some(p => p.role === '원고' && p.name?.trim())
  const hasD = ps.some(p => p.role === '피고' && p.name?.trim())
  const hasAddr = ps.some(p => p.addr?.trim())
  if (!hasW) issues.push('원고가 입력되지 않았습니다.')
  if (!hasD) issues.push('피고가 입력되지 않았습니다.')
  if (hasW) bd.parties += Math.floor(maxP * 0.4)
  if (hasD) bd.parties += Math.floor(maxP * 0.4)
  if (hasAddr) bd.parties += maxP - Math.floor(maxP * 0.4) * 2
  if (answer) {
    if (hasW && answer.plaintiff) {
      const expected = norm(answer.plaintiff).split(' ')[0] || norm(answer.plaintiff)
      if (!norm(ps.find(p => p.role === '원고')?.name || '').includes(expected))
        issues.push(`원고 이름이 정답(${answer.plaintiff})과 다릅니다.`)
    }
    if (hasD && answer.defendant) {
      const expected = norm(answer.defendant).split(' ')[0] || norm(answer.defendant)
      if (!norm(ps.find(p => p.role === '피고')?.name || '').includes(expected))
        issues.push(`피고 이름이 정답(${answer.defendant})과 다릅니다.`)
    }
  }

  const cl = norm(data.claimPurpose || '')
  if (!cl) { issues.push('청구취지가 비어 있습니다.') }
  else {
    if (answer?.claim_purpose) {
      const ansCl = norm(answer.claim_purpose)
      const keywords = ansCl.match(/금\s*[\d,]+원|기각|소송비용|가집행|지급하라|부담한다/g) || []
      const matched = keywords.filter(k => cl.includes(norm(k)))
      const ratio = keywords.length > 0 ? matched.length / keywords.length : (cl.length >= 20 ? 0.7 : 0.3)
      bd.claim = Math.round(maxCl * Math.min(1, ratio))
      if (ratio < 0.5) issues.push('청구취지에 필수 항목이 부족합니다.')
    } else {
      bd.claim = cl.length >= 50 ? maxCl : cl.length >= 20 ? Math.round(maxCl * 0.7) : Math.round(maxCl * 0.3)
    }
  }

  const ca = norm(data.claimCause || '')
  if (!ca || ca.startsWith('[내용파일첨부]')) {
    bd.cause = ca ? Math.round(maxCa * 0.6) : 0
    if (!ca) issues.push('청구원인이 비어 있습니다.')
  } else if (answer?.claim_reason) {
    const ansCa = norm(answer.claim_reason)
    const ansWords = ansCa.split(/[,.\s]+/).filter(w => w.length >= 2)
    const matched = ansWords.filter(w => ca.includes(w))
    const ratio = ansWords.length > 0 ? matched.length / ansWords.length : 0.5
    bd.cause = Math.round(maxCa * Math.min(1, ratio * 1.3))
    if (ratio < 0.3) issues.push('청구원인이 정답과 많이 다릅니다.')
  } else {
    bd.cause = ca.length >= 150 ? maxCa : ca.length >= 50 ? Math.round(maxCa * 0.7) : Math.round(maxCa * 0.3)
  }

  const evs = data.evidences || []
  if (evs.length === 0) { issues.push('입증서류가 없습니다.') }
  else {
    const prefix = isAnswer ? '을' : '갑'
    const correctFormat = evs.every((e: { number?: string }, i: number) => norm(e.number || '').includes(`${prefix} 제${i + 1}호증`))
    if (correctFormat) bd.evidence += 8; else { bd.evidence += 4; issues.push(`서증부호가 "${prefix} 제N호증" 순서와 다릅니다.`) }
    if (evs.every((e: { name?: string }) => e.name?.trim())) bd.evidence += 6; else issues.push('서류명이 비어있는 입증서류가 있습니다.')
    if (evs.some((e: { purpose?: string }) => e.purpose?.trim())) bd.evidence += 6; else issues.push('입증취지를 작성해주세요.')
  }

  const score = Object.values(bd).reduce((a, b) => a + b, 0)
  return { score, breakdown: bd, issues }
}

export function buildFeedback(r: ScoreResult, docType: 'complaint' | 'answer' = 'complaint'): string {
  const grade = r.score >= 90 ? '우수' : r.score >= 70 ? '양호' : r.score >= 50 ? '보통' : '미흡'
  const isA = docType === 'answer'
  const lines = [
    `[1차 규칙 채점: ${r.score}점 / ${grade}]\n`,
    `• 당사자: ${r.breakdown.parties}/${isA ? 20 : 25}점`,
    `• ${isA ? '청구취지 답변' : '청구취지'}: ${r.breakdown.claim}/${isA ? 30 : 25}점`,
    `• ${isA ? '청구원인 답변' : '청구원인'}: ${r.breakdown.cause}/30점`,
    `• 입증서류: ${r.breakdown.evidence}/20점`,
  ]
  if (r.issues.length) { lines.push('\n⚠️ 수정 필요:'); r.issues.forEach(i => lines.push(`  - ${i}`)) }
  return lines.join('\n')
}

// 하위 호환
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateScore(d: any): { score: number; breakdown: ScoreBreakdown } {
  const r = ruleGrade(d); return { score: r.score, breakdown: r.breakdown }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateAnswerScore(d: any): { score: number; breakdown: ScoreBreakdown } {
  const r = ruleGrade({ ...d, doc_type: 'answer' }); return { score: r.score, breakdown: r.breakdown }
}
export function generateFeedback(score: number, breakdown: ScoreBreakdown, docType: 'complaint' | 'answer' = 'complaint'): string {
  return buildFeedback({ score, breakdown, issues: [] }, docType)
}
