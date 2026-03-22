import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://knpvayujykoqjncctxrr.supabase.co'

export async function GET() {
  // Service role key bypasses RLS — only used server-side
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtucHZheXVqeWtvcWpuY2N0eHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzA3NDUsImV4cCI6MjA4OTE0Njc0NX0.rXlo5IsOW6FS5N1X3vgqNM1RvzB84TYPqVhnYyc6FSg'

  // Use service role key if available, otherwise anon key
  const key = serviceKey || anonKey
  const usingServiceKey = !!serviceKey

  const client = createClient(SB_URL, key)
  const { data, error } = await client
    .from('practice_records')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin/records] Supabase error:', error)
    return NextResponse.json({ error: error.message, usingServiceKey, hint: 'RLS may be blocking reads. Add SUPABASE_SERVICE_ROLE_KEY env var.' }, { status: 500 })
  }

  return NextResponse.json({ data: data || [], usingServiceKey })
}
