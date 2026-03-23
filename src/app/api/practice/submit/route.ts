import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SB_URL = 'https://knpvayujykoqjncctxrr.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtucHZheXVqeWtvcWpuY2N0eHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzA3NDUsImV4cCI6MjA4OTE0Njc0NX0.rXlo5IsOW6FS5N1X3vgqNM1RvzB84TYPqVhnYyc6FSg'

export async function POST(req: NextRequest) {
  try {
    const p = await req.json()
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SB_ANON
    const client = createClient(SB_URL, key)

    const { error } = await client.from('practice_records').upsert({
      id: p.id,
      student_id: p.student_id,
      user_name: p.user_name || null,
      case_type: p.case_type || null,
      court: p.court || null,
      plaintiff: p.plaintiff || null,
      defendant: p.defendant || null,
      has_agent: p.has_agent ?? false,
      evidence_count: p.evidence_count ?? 0,
      score: p.score ?? 0,
      feedback: p.feedback || null,
      grade_breakdown: p.grade_breakdown || null,
      complaint_data: p.complaint_data || null,
      case_id: p.case_id || null,
      submitted_at: p.submitted_at || null,
    }, { onConflict: 'id' })

    if (error) {
      console.error('[practice/submit] error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[practice/submit] exception:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
