import type { ComplaintFormData, SampleCase } from '@/types'

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

export interface ScoreBreakdown { parties: number; claim: number; cause: number; evidence: number }
export interface ScoreResult { score: number; breakdown: ScoreBreakdown; issues: string[] }

// ─── 1차: 규칙 기반 채점 (API 호출 없음) ───
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ruleGrade(data: ComplaintFormData, answer?: SampleCase | null): ScoreResult {
  const bd: ScoreBreakdown = { parties: 0, claim: 0, cause: 0, evidence: 0 }
  const issues: string[] = []
  const isAnswer = data.doc_type === 'answer'
  const maxP = isAnswer ? 20 : 25, maxCl = isAnswer ? 30 : 25, maxCa = isAnswer ? 30 : 30, maxEv = 20

  // ── 당사자 ──
  const ps = data.parties || []
  const hasW = ps.some(p => p.role === '원고' && p.name?.trim())
  const hasD = ps.some(p => p.role === '피고' && p.name?.trim())
  const hasAddr = ps.some(p => p.addr?.trim())
  if (!hasW) issues.push('원고가 입력되지 않았습니다.')
  if (!hasD) issues.push('피고가 입력되지 않았습니다.')
  if (hasW) bd.parties += Math.floor(maxP * 0.4)
  if (hasD) bd.parties += Math.floor(maxP * 0.4)
  if (hasAddr) bd.parties += maxP - Math.floor(maxP * 0.4) * 2
  // 정답 이름 비교
  if (answer) {
    if (hasW && answer.plaintiff && !norm(ps.find(p => p.role === '원고')?.name || '').includes(norm(answer.plaintiff).split(' ')[0]))
      issues.push(`원고 이름이 정답(${answer.plaintiff})과 다릅니다.`)
    if (hasD && answer.defendant && !norm(ps.find(p => p.role === '피고')?.name || '').includes(norm(answer.defendant).split(' ')[0]))
      issues.push(`피고 이름이 정답(${answer.defendant})과 다릅니다.`)
  }

  // ── 청구취지 ──
  const cl = norm(data.claimPurpose || '')
  if (!cl) { issues.push('청구취지가 비어 있습니다.'); }
  else {
    if (answer?.claim_purpose) {
      const ansCl = norm(answer.claim_purpose)
      // 핵심 키워드 매칭
      const keywords = ansCl.match(/금\s*[\d,]+원|기각|소송비용|가집행|지급하라|부담한다/g) || []
      const matched = keywords.filter(k => cl.includes(norm(k)))
      const ratio = keywords.length > 0 ? matched.length / keywords.length : (cl.length >= 20 ? 0.7 : 0.3)
      bd.claim = Math.round(maxCl * Math.min(1, ratio))
      if (ratio < 0.5) issues.push('청구취지에 필수 항목(금액, 지급 명령, 소송비용 등)이 부족합니다.')
    } else {
      // 정답 없으면 길이 기반
      bd.claim = cl.length >= 50 ? maxCl : cl.length >= 20 ? Math.round(maxCl * 0.7) : Math.round(maxCl * 0.3)
    }
  }

  // ── 청구원인 ──
  const ca = norm(data.claimCause || '')
  if (!ca || ca.startsWith('[내용파일첨부]')) {
    // 파일첨부는 내용 확인 불가 → 기본 점수
    bd.cause = ca ? Math.round(maxCa * 0.6) : 0
    if (!ca) issues.push('청구원인이 비어 있습니다.')
  } else if (answer?.claim_reason) {
    const ansCa = norm(answer.claim_reason)
    const ansWords = ansCa.split(/[,.\s]+/).filter(w => w.length >= 2)
    const matched = ansWords.filter(w => ca.includes(w))
    const ratio = ansWords.length > 0 ? matched.length / ansWords.length : 0.5
    bd.cause = Math.round(maxCa * Math.min(1, ratio * 1.3)) // 약간 관대하게
    if (ratio < 0.3) issues.push('청구원인이 정답과 많이 다릅니다. 사실관계를 다시 확인하세요.')
  } else {
    bd.cause = ca.length >= 150 ? maxCa : ca.length >= 50 ? Math.round(maxCa * 0.7) : Math.round(maxCa * 0.3)
  }

  // ── 입증서류 ──
  const evs = data.evidences || []
  if (evs.length === 0) { issues.push('입증서류가 없습니다.') }
  else {
    const prefix = isAnswer ? '을' : '갑'
    // 서증부호 형식 확인: "갑 제N호증" 순서대로
    const correctFormat = evs.every((e: { number?: string }, i: number) =>
      norm(e.number || '').includes(`${prefix} 제${i + 1}호증`)
    )
    if (correctFormat) bd.evidence += 8; else { bd.evidence += 4; issues.push(`서증부호가 "${prefix} 제N호증" 순서와 다릅니다.`) }
    // 서류명 존재
    if (evs.every((e: { name?: string }) => e.name?.trim())) bd.evidence += 6; else issues.push('서류명이 비어있는 입증서류가 있습니다.')
    // 입증취지 존재
    if (evs.some((e: { purpose?: string }) => e.purpose?.trim())) bd.evidence += 6; else issues.push('입증취지를 작성해주세요.')
  }

  const score = Object.values(bd).reduce((a, b) => a + b, 0)
  return { score, breakdown: bd, issues }
}

// ─── 피드백 생성 ───
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
  if (r.issues.length) {
    lines.push('\n⚠️ 수정 필요:')
    r.issues.forEach(i => lines.push(`  - ${i}`))
  }
  return lines.join('\n')
}

// 하위 호환 (기존 코드에서 호출하는 부분)
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
