import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const student_id = searchParams.get('student_id')
    const client = await pool.connect()
    try {
      let rows
      if (student_id) {
        const res = await client.query(
          `SELECT * FROM sample_cases WHERE $1 = ANY(assigned_students) ORDER BY created_at DESC`,
          [student_id]
        )
        rows = res.rows
      } else {
        const res = await client.query(
          `SELECT * FROM sample_cases WHERE assigned_students IS NOT NULL AND array_length(assigned_students, 1) > 0 ORDER BY created_at DESC`
        )
        rows = res.rows
      }
      return NextResponse.json(rows)
    } finally {
      client.release()
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
