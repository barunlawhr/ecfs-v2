import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SB_URL = 'https://ecmeafiajoksyeuisreh.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbWVhZmlham9rc3lldWlzcmVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA3MjYzOCwiZXhwIjoyMDg5NjQ4NjM4fQ.leU8zdVO_gby-lhQ1GfgVcynGfkP2tHQjAGp9kxRNJA'

export async function POST(req: NextRequest) {
  try {
    const p = await req.json()
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SB_ANON
    const client = createClient(SB_URL, key)

    const record: Record<string, unknown> = {
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
    }
    const { error } = await client.from('practice_records').upsert(record, { onConflict: 'id' })

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
