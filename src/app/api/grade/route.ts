import { NextRequest, NextResponse } from 'next/server'
import { grade } from '@/lib/claude'
import type { ComplaintFormData, SampleCase } from '@/types'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const body = await req.json()

  // ── 신규 실습 채점 모드 ──
  if (body.mode === 'practice') {
    const { practiceGrade } = await import('@/lib/scoring')
    const { submissionData, caseData } = body
    const ruleResult = practiceGrade(submissionData, caseData)

    // AI 채점 시도 (API 키가 있고 40점 이상일 때)
    if (apiKey && apiKey.startsWith('sk-ant') && ruleResult.canCallAI) {
      try {
        const { gradeWithAI } = await import('@/lib/claude')
        const aiResult = await gradeWithAI(submissionData, caseData, ruleResult)
        return NextResponse.json({
          score: aiResult.finalScore,
          feedback: aiResult.feedback,
          breakdown: ruleResult.breakdown,
          issues: ruleResult.issues,
          detailFeedback: aiResult.detailFeedback,
        })
      } catch (err) {
        console.error('[Grade API] AI failed:', err)
      }
    }

    // AI 실패 또는 불가 → 규칙 채점만
    const feedbackLines = ruleResult.breakdown.map(b => {
      const icon = b.status === 'pass' ? '✅' : b.status === 'partial' ? '⚠️' : '❌'
      return `${icon} ${b.item}: ${b.score}/${b.maxScore}점 — ${b.message}`
    })
    return NextResponse.json({
      score: ruleResult.totalScore,
      feedback: feedbackLines.join('\n'),
      breakdown: ruleResult.breakdown,
      issues: ruleResult.issues,
    })
  }

  // ── 서버사이드 검증 (이중 방어) ──
  const { validateFormDataServer } = await import('@/lib/validation')
  const docType = body.doc_type || body.formData?.doc_type || 'complaint'
  const serverErr = validateFormDataServer(body.formData || body.submissionData || {}, docType)
  if (serverErr) {
    console.warn('[Grade API] 서버 검증 실패:', serverErr)
    return NextResponse.json({ error: serverErr, score: 0, feedback: `서버 검증 실패: ${serverErr}`, isError: true }, { status: 400 })
  }

  // ── 기존 레거시 채점 모드 ──
  if (!apiKey || !apiKey.startsWith('sk-ant')) {
    const { ruleGrade, buildFeedback } = await import('@/lib/scoring')
    const { formData, sampleCase } = body
    const r = ruleGrade(formData, sampleCase)
    return NextResponse.json({ score: r.score, feedback: buildFeedback(r, formData.doc_type || 'complaint'), breakdown: r.breakdown })
  }

  try {
    const { formData, sampleCase }: { formData: ComplaintFormData; sampleCase: SampleCase } = body
    if (!formData) return NextResponse.json({ error: '필수 데이터 누락' }, { status: 400 })
    const result = await grade(formData, sampleCase || { id: '0', title: '', case_type: '', court: '', plaintiff: '', defendant: '', created_at: '' })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[Grade API]', err)
    return NextResponse.json({ error: String(err), score: null, feedback: null, isError: true }, { status: 500 })
  }
}
