import { NextRequest, NextResponse } from 'next/server'
import { gradeComplaint, gradeAnswer } from '@/lib/claude'
import type { ComplaintFormData, SampleCase } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { formData, sampleCase, doc_type }: { formData: ComplaintFormData; sampleCase: SampleCase; doc_type?: string } = body

    if (!formData || !sampleCase) {
      return NextResponse.json({ error: '필수 데이터 누락' }, { status: 400 })
    }

    const result = doc_type === 'answer'
      ? await gradeAnswer(formData, sampleCase)
      : await gradeComplaint(formData, sampleCase)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[Grade API]', err)
    return NextResponse.json({ error: '채점 중 오류 발생', score: 0, feedback: '시스템 오류로 채점할 수 없습니다.' }, { status: 500 })
  }
}
