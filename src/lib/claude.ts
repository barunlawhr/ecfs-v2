import Anthropic from '@anthropic-ai/sdk'
import type { ComplaintFormData, GradeResult, SampleCase } from '@/types'
import { ruleGrade, buildFeedback, practiceGrade, type PracticeSubmission, type PracticeCaseData, type PracticeScoreResult } from './scoring'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ═══════════════════════════════════════════════════
//  신규: 실습 문항 AI 채점
// ═══════════════════════════════════════════════════

export async function gradeWithAI(
  data: PracticeSubmission,
  caseData: PracticeCaseData,
  ruleResult: PracticeScoreResult
): Promise<{ finalScore: number; feedback: string; detailFeedback: string[] }> {

  if (!ruleResult.canCallAI) {
    return {
      finalScore: ruleResult.totalScore,
      feedback: '기본 항목을 먼저 채워주세요. 필수 항목이 충족되면 AI 품질 평가가 진행됩니다.',
      detailFeedback: ruleResult.issues
    }
  }

  const isComplaint = data.docType === 'complaint'
  const isAnswer = data.docType === 'answer'

  const prompt = isComplaint ? `
사건: ${caseData.case_name || ''} | 원고: ${caseData.plaintiff} | 피고: ${caseData.defendant}
사건개요: ${caseData.case_facts || ''}

모범 청구취지: ${caseData.sample_claim_purpose || '(없음)'}
모범 청구원인: ${caseData.sample_claim_reason || '(없음)'}

학생 제출 청구취지: ${data.claimPurpose || '(미입력)'}
학생 제출 청구원인: ${data.claimReason || '(미입력)'}
학생 증거목록: ${(data.evidence || []).map((e, i) => `갑${i + 1}: ${e.name} (${e.purpose})`).join(', ') || '없음'}

1차 규칙 점수: ${ruleResult.totalScore}점 (±15점 범위 내 조정)

평가: 1) 청구취지 법률 형식 2) 청구원인 논리성 3) 모범답안 핵심 포함 여부 4) 법률 용어 적절성
` : isAnswer ? `
사건: ${caseData.case_name || ''} | 원고(청구인): ${caseData.plaintiff} | 피고(학생측): ${caseData.defendant}
사건개요: ${caseData.case_facts || ''}

모범 답변취지: ${caseData.sample_answer_purpose || '(없음)'}
모범 답변이유: ${caseData.sample_answer_reason || '(없음)'}

학생 제출 답변취지: ${data.answerPurpose || '(미입력)'}
학생 제출 답변이유: ${data.answerReason || '(미입력)'}

1차 규칙 점수: ${ruleResult.totalScore}점 (±15점 범위 내 조정)

평가: 1) 답변취지 형식 2) 청구원인 반박 구체성 3) 항변 사실 논리성 4) 법률 용어
` : `
준비서면 내용: ${data.content || '(미입력)'}
1차 규칙 점수: ${ruleResult.totalScore}점 (±15점 범위 내 조정)
평가: 변론내용의 논리성과 법률적 적절성
`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20241022',
      max_tokens: 512,
      system: `당신은 법원 전자소송 실습 교육의 채점 AI입니다.
반드시 JSON 형식으로만 응답하세요: {"score":<정수>,"feedback":"<2-3문장 종합 피드백>","detailFeedback":["<항목별 피드백1>","<항목별 피드백2>"]}
score는 반드시 ${ruleResult.totalScore - 15}~${ruleResult.totalScore + 15} 범위 내 정수.
한국어로 작성. JSON 외 텍스트 금지.`,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) throw new Error('No JSON')
    const parsed = JSON.parse(m[0])
    const clamped = Math.max(ruleResult.totalScore - 15, Math.min(ruleResult.totalScore + 15, parsed.score || 0))

    return {
      finalScore: Math.min(Math.max(clamped, 0), 100),
      feedback: parsed.feedback || '',
      detailFeedback: parsed.detailFeedback || []
    }
  } catch (e) {
    console.error('[gradeWithAI] AI failed:', e)
    return {
      finalScore: ruleResult.totalScore,
      feedback: 'AI 피드백 생성에 실패했습니다. 규칙 채점 결과만 표시됩니다.',
      detailFeedback: []
    }
  }
}

// ═══════════════════════════════════════════════════
//  기존: 레거시 AI 채점 (하위 호환)
// ═══════════════════════════════════════════════════

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

export async function grade(data: ComplaintFormData, sc: SampleCase): Promise<GradeResult> {
  const rule = ruleGrade(data, sc)
  const ruleFeedback = buildFeedback(rule, (data.doc_type || 'complaint') as 'complaint' | 'answer')

  if (rule.score < 40) {
    return { score: rule.score, feedback: ruleFeedback + '\n\n⚠️ 기본 항목을 먼저 채워주세요.', breakdown: rule.breakdown }
  }

  try {
    const ai = await callAI(buildPrompt(data, sc, rule.score))
    const finalScore = Math.min(100, Math.max(0, Math.min(rule.score + 15, Math.max(rule.score - 15, ai.score))))
    return { score: finalScore, feedback: ruleFeedback + `\n\n🤖 AI 피드백:\n${ai.feedback}`, breakdown: rule.breakdown }
  } catch (e) {
    console.error('[grade] AI failed:', e)
    return { score: rule.score, feedback: ruleFeedback + '\n\n(AI 피드백 생성 실패)', breakdown: rule.breakdown }
  }
}

export async function gradeComplaint(data: ComplaintFormData, sc: SampleCase): Promise<GradeResult> { return grade(data, sc) }
export async function gradeAnswer(data: ComplaintFormData, sc: SampleCase): Promise<GradeResult> { return grade({ ...data, doc_type: 'answer' }, sc) }
