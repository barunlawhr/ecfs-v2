import Anthropic from '@anthropic-ai/sdk'
import type { ComplaintFormData, GradeResult, SampleCase } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export function buildAnswerGradingPrompt(formData: ComplaintFormData, sampleCase: SampleCase): string {
  const partiesText = formData.parties.map(p =>
    `[${p.role}] ${p.name} / 주소: ${p.addr || '미입력'}${p.tel ? ' / 전화: ' + p.tel : ''}`
  ).join('\n')

  return `당신은 법원 실습 교육 채점자입니다. 학생이 작성한 답변서를 아래 루브릭에 따라 채점하고, 한국어로 상세한 피드백을 제공하세요.

=== 사건 정보 (출제 기준) ===
사건명: ${sampleCase.title}
사건유형: ${sampleCase.case_type}
법원: ${sampleCase.court}
원고: ${sampleCase.plaintiff}
피고(답변인): ${sampleCase.defendant}
${sampleCase.description ? `사건개요: ${sampleCase.description}` : ''}
${sampleCase.facts ? `원고 주장 사실관계: ${sampleCase.facts}` : ''}

=== 학생 제출 답변서 ===
【사건기본정보】
사건명: ${formData.caseName || formData.caseCategory}
법원: ${formData.court}
사건번호: ${formData.sogaType || '미입력'}

【당사자 정보】
${partiesText || '미입력'}

【답변 취지】
${formData.claimPurpose || '미입력'}

【답변 이유】
${formData.claimCause || '미입력'}

【입증서류】
${formData.evidences.length > 0 ? formData.evidences.map(e => `${e.number}. ${e.name} (${e.purpose})`).join('\n') : '없음'}

=== 채점 루브릭 (총 100점) ===
1. 당사자 정보 (25점): 원고/피고 역할 정확성, 답변인(피고) 정보 완성도
2. 답변 취지 (25점): "원고의 청구 기각" 명시, 소송비용 부담 표시, 법적 형식 준수
3. 답변 이유 (35점): 원고 주장에 대한 반박 충실도, 구체적 사실 서술, 논리적 구성
4. 입증서류 (15점): 을호증 번호 부여, 서류 적절성, 반박 근거와의 연관성

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "score": <0-100 정수>,
  "breakdown": {
    "parties": <0-25>,
    "claim": <0-25>,
    "cause": <0-35>,
    "evidence": <0-15>
  },
  "feedback": "<학생에게 전달할 상세 피드백. 잘한 점, 부족한 점, 개선 방향을 구체적으로. 마크다운 **볼드** 사용 가능. 최소 200자>"
}`
}

export async function gradeAnswer(formData: ComplaintFormData, sampleCase: SampleCase): Promise<GradeResult> {
  const prompt = buildAnswerGradingPrompt(formData, sampleCase)

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    const parsed = JSON.parse(jsonMatch[0])
    return {
      score: Math.min(100, Math.max(0, parsed.score ?? 0)),
      feedback: parsed.feedback ?? '피드백을 생성할 수 없습니다.',
      breakdown: {
        parties: parsed.breakdown?.parties ?? 0,
        claim: parsed.breakdown?.claim ?? 0,
        cause: parsed.breakdown?.cause ?? 0,
        evidence: parsed.breakdown?.evidence ?? 0,
      },
    }
  } catch {
    return { score: 0, feedback: '채점 중 오류가 발생했습니다.', breakdown: { parties: 0, claim: 0, cause: 0, evidence: 0 } }
  }
}

export function buildGradingPrompt(formData: ComplaintFormData, sampleCase: SampleCase): string {
  const partiesText = formData.parties.map(p =>
    `[${p.role}] ${p.name} / 주소: ${p.addr || '미입력'}${p.tel ? ' / 전화: ' + p.tel : ''}`
  ).join('\n')

  return `당신은 법원 실습 교육 채점자입니다. 학생이 작성한 소장을 아래 루브릭에 따라 채점하고, 한국어로 상세한 피드백을 제공하세요.

=== 사건 정보 (출제 기준) ===
사건명: ${sampleCase.title}
사건유형: ${sampleCase.case_type}
법원: ${sampleCase.court}
원고: ${sampleCase.plaintiff}
피고: ${sampleCase.defendant}
${sampleCase.claim_amount ? `청구금액: ${sampleCase.claim_amount.toLocaleString()}원` : ''}
${sampleCase.description ? `사건개요: ${sampleCase.description}` : ''}
${sampleCase.expected_cause ? `모범 청구원인: ${sampleCase.expected_cause}` : ''}

=== 학생 제출 소장 ===
【사건기본정보】
사건명: ${formData.caseName || formData.caseCategory}
법원: ${formData.court}
소가: ${formData.soga || '미입력'}원

【당사자 정보】
${partiesText || '미입력'}

【청구취지】
${formData.claimPurpose || '미입력'}

【청구원인】
${formData.claimCause || '미입력'}

【입증서류】
${formData.evidences.length > 0 ? formData.evidences.map(e => `${e.number}. ${e.name} (${e.purpose})`).join('\n') : '없음'}

=== 채점 루브릭 (총 100점) ===
1. 당사자 정보 (25점): 원고/피고 존재 여부, 이름·주소 완성도, 역할 정확성
2. 청구취지 (25점): 구체적 금액 명시, 청구 내용 명확성, 법적 형식
3. 청구원인 (35점): 사실관계 서술 충실도, 법리 적용, 논리적 구성, 출제 기준과의 부합도
4. 입증서류 (15점): 서류 종류 적절성, 서증 번호 부여, 충분성

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "score": <0-100 정수>,
  "breakdown": {
    "parties": <0-25>,
    "claim": <0-25>,
    "cause": <0-35>,
    "evidence": <0-15>
  },
  "feedback": "<학생에게 전달할 상세 피드백. 잘한 점, 부족한 점, 개선 방향을 구체적으로. 마크다운 **볼드** 사용 가능. 최소 200자>"
}`
}

export async function gradeComplaint(formData: ComplaintFormData, sampleCase: SampleCase): Promise<GradeResult> {
  const prompt = buildGradingPrompt(formData, sampleCase)

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    const parsed = JSON.parse(jsonMatch[0])
    return {
      score: Math.min(100, Math.max(0, parsed.score ?? 0)),
      feedback: parsed.feedback ?? '피드백을 생성할 수 없습니다.',
      breakdown: {
        parties: parsed.breakdown?.parties ?? 0,
        claim: parsed.breakdown?.claim ?? 0,
        cause: parsed.breakdown?.cause ?? 0,
        evidence: parsed.breakdown?.evidence ?? 0,
      },
    }
  } catch {
    return { score: 0, feedback: '채점 중 오류가 발생했습니다.', breakdown: { parties: 0, claim: 0, cause: 0, evidence: 0 } }
  }
}
