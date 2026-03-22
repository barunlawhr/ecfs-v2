import { NextRequest, NextResponse } from 'next/server'
import { gradeComplaint, gradeAnswer } from '@/lib/claude'
import type { ComplaintFormData, SampleCase } from '@/types'

export async function POST(req: NextRequest) {
  console.log('[Grade API] POST called, ANTHROPIC_API_KEY set:', !!process.env.ANTHROPIC_API_KEY)
  try {
    const body = await req.json()
    const { formData, sampleCase, doc_type }: { formData: ComplaintFormData; sampleCase: SampleCase; doc_type?: string } = body

    if (!formData || !sampleCase) {
      return NextResponse.json({ error: '필수 데이터 누락' }, { status: 400 })
    }

    console.log('[Grade API] calling', doc_type === 'answer' ? 'gradeAnswer' : 'gradeComplaint')
    const result = doc_type === 'answer'
      ? await gradeAnswer(formData, sampleCase)
      : await gradeComplaint(formData, sampleCase)

    console.log('[Grade API] result score:', result.score)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[Grade API] error:', String(err))
    return NextResponse.json({ error: '채점 중 오류 발생', score: 0, feedback: `시스템 오류: ${String(err)}` }, { status: 500 })
  }
}
