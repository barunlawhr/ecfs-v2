import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SB_URL = 'https://knpvayujykoqjncctxrr.supabase.co'
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtucHZheXVqeWtvcWpuY2N0eHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzA3NDUsImV4cCI6MjA4OTE0Njc0NX0.rXlo5IsOW6FS5N1X3vgqNM1RvzB84TYPqVhnYyc6FSg'
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    // service role key 있으면 사용 (RLS 우회), 없으면 anon key
    const client = createClient(SB_URL, SB_SERVICE || SB_KEY)

    const { error } = await client
      .from('practice_records')
      .upsert(payload, { onConflict: 'id' })

    if (error) {
      console.error('[practice/submit] upsert error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message, code: error.code, details: error.details, hint: error.hint }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[practice/submit] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
