import { NextRequest, NextResponse } from 'next/server'
import { grade } from '@/lib/claude'
import type { ComplaintFormData, SampleCase } from '@/types'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || !apiKey.startsWith('sk-ant')) {
    // AI 없이 1차 규칙 채점만 수행
    const { ruleGrade, buildFeedback } = await import('@/lib/scoring')
    const { formData, sampleCase } = await req.json()
    const r = ruleGrade(formData, sampleCase)
    return NextResponse.json({ score: r.score, feedback: buildFeedback(r, formData.doc_type || 'complaint'), breakdown: r.breakdown })
  }
  try {
    const { formData, sampleCase }: { formData: ComplaintFormData; sampleCase: SampleCase } = await req.json()
    if (!formData) return NextResponse.json({ error: '필수 데이터 누락' }, { status: 400 })
    const result = await grade(formData, sampleCase || { id: '0', title: '', case_type: '', court: '', plaintiff: '', defendant: '', created_at: '' })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[Grade API]', err)
    return NextResponse.json({ error: String(err), score: null, feedback: null, isError: true }, { status: 500 })
  }
}
