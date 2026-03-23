import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

export async function POST(req: NextRequest) {
  try {
    const p = await req.json()

    // 테이블 없으면 자동 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.practice_records (
        id text PRIMARY KEY,
        created_at timestamptz DEFAULT now(),
        student_id text NOT NULL,
        user_name text,
        case_type text,
        court text,
        plaintiff text,
        defendant text,
        has_agent boolean DEFAULT false,
        evidence_count integer DEFAULT 0,
        score integer DEFAULT 0,
        feedback text,
        grade_breakdown jsonb,
        complaint_data jsonb,
        case_id bigint,
        submitted_at timestamptz
      )
    `)

    await pool.query(`
      INSERT INTO public.practice_records
        (id, student_id, user_name, case_type, court, plaintiff, defendant,
         has_agent, evidence_count, score, feedback, grade_breakdown,
         complaint_data, case_id, submitted_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (id) DO UPDATE SET
        score = EXCLUDED.score,
        feedback = EXCLUDED.feedback,
        grade_breakdown = EXCLUDED.grade_breakdown,
        complaint_data = EXCLUDED.complaint_data
    `, [
      p.id,
      p.student_id,
      p.user_name || null,
      p.case_type || null,
      p.court || null,
      p.plaintiff || null,
      p.defendant || null,
      p.has_agent ?? false,
      p.evidence_count ?? 0,
      p.score ?? 0,
      p.feedback || null,
      p.grade_breakdown ? JSON.stringify(p.grade_breakdown) : null,
      p.complaint_data ? JSON.stringify(p.complaint_data) : null,
      p.case_id || null,
      p.submitted_at || null,
    ])

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[practice/submit] pg error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
