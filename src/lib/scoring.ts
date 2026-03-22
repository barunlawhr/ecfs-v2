export interface ScoreBreakdown {
  parties: number
  claim: number
  cause: number
  evidence: number
}

export interface ScoreResult {
  score: number
  breakdown: ScoreBreakdown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateScore(complaintData: any): ScoreResult {
  const breakdown: ScoreBreakdown = { parties: 0, claim: 0, cause: 0, evidence: 0 }

  // 당사자 (25점)
  const parties = complaintData.parties || []
  const hasPlaintiff = parties.some((p: { role: string; name?: string }) => p.role === '원고' && (p.name?.trim() ?? '').length > 0)
  const hasDefendant = parties.some((p: { role: string; name?: string }) => p.role === '피고' && (p.name?.trim() ?? '').length > 0)
  if (hasPlaintiff) breakdown.parties += 10
  if (hasDefendant) breakdown.parties += 10
  if (parties.some((p: { addr?: string }) => (p.addr?.trim() ?? '').length > 0)) breakdown.parties += 5

  // 청구취지 (25점)
  const claim = complaintData.claimPurpose || ''
  if (claim.length >= 5) breakdown.claim += 8
  if (claim.length >= 20) breakdown.claim += 9
  if (claim.length >= 50) breakdown.claim += 8

  // 청구원인 (30점)
  const cause = complaintData.claimCause || ''
  if (cause.length >= 10) breakdown.cause += 10
  if (cause.length >= 50) breakdown.cause += 10
  if (cause.length >= 150) breakdown.cause += 10

  // 입증서류 (20점)
  const evidences = complaintData.evidences || []
  if (evidences.length >= 1) breakdown.evidence += 10
  if (evidences.length >= 2) breakdown.evidence += 5
  if (evidences.some((e: { purpose?: string }) => (e.purpose?.trim() ?? '').length > 0)) breakdown.evidence += 5

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0)
  return { score, breakdown }
}

export function generateFeedback(score: number, breakdown: ScoreBreakdown): string {
  const grade = score >= 90 ? '우수' : score >= 70 ? '양호' : score >= 50 ? '보통' : '미흡'
  const lines = [`[채점 결과: ${score}점 / ${grade}]\n`]
  lines.push(`• 당사자 정보: ${breakdown.parties}/25점`)
  lines.push(`• 청구취지: ${breakdown.claim}/25점`)
  lines.push(`• 청구원인: ${breakdown.cause}/30점`)
  lines.push(`• 입증서류: ${breakdown.evidence}/20점\n`)
  if (breakdown.parties < 20) lines.push('💡 당사자 정보에 주소를 더 자세히 입력하세요.')
  if (breakdown.claim < 20) lines.push('💡 청구취지를 더 구체적으로 작성하세요.')
  if (breakdown.cause < 20) lines.push('💡 청구원인에 사실관계를 더 상세히 기술하세요.')
  if (breakdown.evidence < 15) lines.push('💡 입증서류를 추가하고 입증 목적을 명시하세요.')
  if (score >= 70) lines.push('✅ 전반적으로 잘 작성되었습니다!')
  return lines.join('\n')
}
