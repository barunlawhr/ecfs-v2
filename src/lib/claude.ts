import Anthropic from '@anthropic-ai/sdk'
import type { ComplaintFormData, GradeResult, SampleCase } from '@/types'
import { ruleGrade, buildFeedback } from './scoring'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── 2차: AI 품질 피드백 (1차 통과 시에만 호출) ───
// 1차 규칙 점수를 기반으로, AI는 법률적 적절성·표현 품질만 평가
const SYSTEM = `당신은 법원 전자소송 실습 교육의 채점 AI입니다.
반드시 JSON 형식으로만 응답하세요: {"score":<정수>,"feedback":"..."}
feedback은 한국어로, 구체적인 수정 방향을 2-3문장으로 작성하세요.
JSON 외 다른 텍스트는 절대 포함하지 마세요.`

function buildPrompt(data: ComplaintFormData, sc: SampleCase, ruleScore: number): string {
  const isAnswer = data.doc_type === 'answer'
  const parties = data.parties.map(p => `[${p.role}] ${p.name}`).join(', ')
  const evList = data.evidences.map(e => `${e.number} ${e.name}`).join(', ') || '없음'

  return `[1차 규칙점수: ${ruleScore}점] ${isAnswer ? '답변서' : '소장'} 평가 (±15점 조정)

출제: ${sc.title}|${sc.court}|원고:${sc.plaintiff}|피고:${sc.defendant}
${sc.claim_purpose ? `모범취지: ${sc.claim_purpose}` : ''}
${sc.claim_reason ? `모범원인: ${sc.claim_reason}` : ''}

제출: 당사자:${parties}
${isAnswer ? '답변취지' : '청구취지'}: ${data.claimPurpose || '미입력'}
${isAnswer ? '답변이유' : '청구원인'}: ${data.claimCause || '미입력'}
입증서류: ${evList}`
}

async function callAI(prompt: string): Promise<{ score: number; feedback: string }> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20241022',
    max_tokens: 512,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('No JSON')
  const p = JSON.parse(m[0])
  return { score: Math.min(100, Math.max(0, p.score ?? 0)), feedback: p.feedback ?? '' }
}

// ─── 통합 채점: 1차 규칙 → (조건부) 2차 AI ───
export async function grade(data: ComplaintFormData, sc: SampleCase): Promise<GradeResult> {
  // 1차 규칙 채점
  const rule = ruleGrade(data, sc)
  const ruleFeedback = buildFeedback(rule, (data.doc_type || 'complaint') as 'complaint' | 'answer')

  // 1차에서 40점 미만이면 AI 호출 안 함 (기본적인 것도 안 채움)
  if (rule.score < 40) {
    return { score: rule.score, feedback: ruleFeedback + '\n\n⚠️ 기본 항목을 먼저 채워주세요. (AI 채점은 40점 이상부터 제공)', breakdown: rule.breakdown }
  }

  // 2차 AI 품질 피드백
  try {
    const ai = await callAI(buildPrompt(data, sc, rule.score))
    // AI 점수는 규칙 점수 ±15 범위로 제한
    const finalScore = Math.min(100, Math.max(0, Math.min(rule.score + 15, Math.max(rule.score - 15, ai.score))))
    return {
      score: finalScore,
      feedback: ruleFeedback + `\n\n🤖 AI 피드백:\n${ai.feedback}`,
      breakdown: rule.breakdown,
    }
  } catch (e) {
    console.error('[grade] AI failed:', e)
    return { score: rule.score, feedback: ruleFeedback + '\n\n(AI 피드백 생성 실패 — 규칙 채점 결과만 표시)', breakdown: rule.breakdown }
  }
}

// 하위 호환
export async function gradeComplaint(data: ComplaintFormData, sc: SampleCase): Promise<GradeResult> { return grade(data, sc) }
export async function gradeAnswer(data: ComplaintFormData, sc: SampleCase): Promise<GradeResult> { return grade({ ...data, doc_type: 'answer' }, sc) }
