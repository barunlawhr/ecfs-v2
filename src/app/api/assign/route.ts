import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { case_id, student_ids } = await req.json()
    if (!case_id || !student_ids?.length) {
      return NextResponse.json({ error: 'case_id and student_ids required' }, { status: 400 })
    }
    const client = await pool.connect()
    try {
      const res = await client.query(
        `SELECT assigned_students FROM sample_cases WHERE id = $1`,
        [case_id]
      )
      const current: string[] = res.rows[0]?.assigned_students || []
      const merged = Array.from(new Set([...current, ...student_ids]))
      await client.query(
        `UPDATE sample_cases SET assigned_students = $1 WHERE id = $2`,
        [merged, case_id]
      )
    } finally {
      client.release()
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
