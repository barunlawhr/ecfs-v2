import Anthropic from '@anthropic-ai/sdk'
import type { ComplaintFormData, GradeResult, SampleCase } from '@/types'
import { ruleGrade, buildFeedback } from './scoring'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── 2차: AI 품질 피드백 (1차 통과 시에만 호출) ───
// 1차 규칙 점수를 기반으로, AI는 법률적 적절성·표현 품질만 평가
function buildPrompt(data: ComplaintFormData, sc: SampleCase, ruleScore: number): string {
  const isAnswer = data.doc_type === 'answer'
  const parties = data.parties.map(p => `[${p.role}] ${p.name} / ${p.addr || '주소 미입력'}`).join('\n')
  const evList = data.evidences.length > 0
    ? data.evidences.map(e => `${e.number}. ${e.name} (${e.purpose})`).join('\n')
    : '없음'

  return `법원 실습 교육 채점자입니다. 학생이 작성한 ${isAnswer ? '답변서' : '소장'}의 법률적 품질을 평가하세요.

규칙 기반 1차 채점에서 ${ruleScore}점을 받았습니다. 당신은 내용의 법률적 적절성과 표현 품질만 평가하세요.

=== 출제 기준 ===
사건: ${sc.title} (${sc.case_type}) | 법원: ${sc.court}
원고: ${sc.plaintiff} | 피고: ${sc.defendant}
${sc.claim_purpose ? `모범 청구취지: ${sc.claim_purpose}` : ''}
${sc.claim_reason ? `모범 청구원인: ${sc.claim_reason}` : ''}

=== 학생 제출 ===
【당사자】${parties || '미입력'}
【${isAnswer ? '답변취지' : '청구취지'}】${data.claimPurpose || '미입력'}
【${isAnswer ? '답변이유' : '청구원인'}】${data.claimCause || '미입력'}
【입증서류】${evList}

=== 평가 기준 ===
1. 규칙점수(${ruleScore}점)에서 ±15점 범위 내에서 최종 점수 조정
2. 법률 용어 사용의 적절성
3. 논리 구성과 사실관계 기술의 충실도
4. 실무적 형식 준수 여부

JSON만 응답:
{"score":<정수>,"feedback":"<150자 이상 한국어 피드백. 잘한 점, 부족한 점, 개선 방향>"}`
}

async function callAI(prompt: string): Promise<{ score: number; feedback: string }> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
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
