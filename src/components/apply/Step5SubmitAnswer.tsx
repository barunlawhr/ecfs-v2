'use client'

import { useState } from 'react'
import { ComplaintFormData, SampleCase } from '@/types'
import { supabase } from '@/lib/supabase'

interface Step5SubmitAnswerProps {
  data: ComplaintFormData
  onBack: () => void
  onSubmitComplete: (recordId: string) => void
  assignedCase?: SampleCase
  userId: string
  userName: string
}

const DELIVERY_FEE = 5200 * 3  // 답변서: 송달료만 (인지액 없음, 3회분)

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

export default function Step5SubmitAnswer({
  data, onBack, onSubmitComplete, assignedCase, userId, userName,
}: Step5SubmitAnswerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defendant = data.parties.find(p => p.role === '피고')?.name || '-'
  const plaintiff = data.parties.find(p => p.role === '원고')?.name || '-'

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const mockCase: SampleCase = {
        id: 'mock',
        title: data.caseName,
        case_type: data.caseCategory,
        court: data.court,
        plaintiff: data.parties.find(p => p.role === '원고')?.name || '원고',
        defendant: data.parties.find(p => p.role === '피고')?.name || '피고',
        created_at: new Date().toISOString(),
      }
      const effectiveCase = assignedCase || mockCase

      // Insert practice record
      const record = {
        student_id: userId,
        user_name: userName,
        doc_type: 'answer',
        case_type: data.caseCategory || data.caseName,
        court: data.court,
        plaintiff: data.parties.find(p => p.role === '원고')?.name || '',
        defendant: data.parties.find(p => p.role === '피고')?.name || '',
        has_agent: data.hasAgent,
        evidence_count: data.evidences.length,
        score: 0,
        feedback: '채점 중...',
        complaint_data: data,
        case_id: assignedCase?.id || null,
      }

      const { data: inserted, error: insertError } = await supabase
        .from('practice_records')
        .insert(record)
        .select('id')
        .single()

      if (insertError) throw new Error(insertError.message)
      if (!inserted?.id) throw new Error('제출 기록 생성에 실패했습니다.')
      const recordId: string = inserted.id

      // Call grading API
      const gradeRes = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: data, sampleCase: effectiveCase, doc_type: 'answer' }),
        signal: AbortSignal.timeout(30_000),
      })

      if (gradeRes.ok) {
        const gradeResult = await gradeRes.json()
        if (gradeResult.score != null && !gradeResult.isError) {
          await supabase
            .from('practice_records')
            .update({
              score: gradeResult.score,
              feedback: gradeResult.feedback ?? '',
              grade_breakdown: gradeResult.breakdown ?? null,
              graded_at: new Date().toISOString(),
            })
            .eq('id', recordId)
        }
      } else {
        await supabase
          .from('practice_records')
          .update({ feedback: '채점 처리 중 오류가 발생했습니다. 관리자에게 문의하세요.' })
          .eq('id', recordId)
      }

      onSubmitComplete(recordId)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '제출 중 오류가 발생했습니다.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: 14,
  }
  const labelStyle: React.CSSProperties = { color: '#6b7280', fontWeight: 500, minWidth: 120 }
  const valueStyle: React.CSSProperties = { color: '#111827', fontWeight: 600 }

  return (
    <div>
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-ttl">납부 및 최종 제출</span>
        </div>

        {/* Fee: 답변서는 송달료만 */}
        <div style={{
          backgroundColor: '#f8fafc', border: '1px solid #e5e7eb',
          borderRadius: 8, padding: '20px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e3a5f', marginBottom: 14 }}>
            송달료 계산
          </div>
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4,
            padding: '8px 12px', fontSize: 12, color: '#1e40af', marginBottom: 14,
          }}>
            ※ 답변서는 인지액이 없으며, 송달료(5,200원 × 3회)만 납부합니다.
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>인지액</span>
            <span style={{ ...valueStyle, color: '#9ca3af' }}>해당 없음</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>송달료 (5,200원 × 3회)</span>
            <span style={valueStyle}>{formatKRW(DELIVERY_FEE)}</span>
          </div>
          <div style={{ ...rowStyle, borderBottom: 'none', marginTop: 4, paddingTop: 14, borderTop: '2px solid #1e3a5f' }}>
            <span style={{ ...labelStyle, color: '#1e3a5f', fontWeight: 700 }}>합계</span>
            <span style={{ ...valueStyle, color: '#1e3a5f', fontSize: 18 }}>{formatKRW(DELIVERY_FEE)}</span>
          </div>
        </div>

        {/* Summary */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px', marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 14 }}>제출 내역 요약</div>
          <div style={rowStyle}>
            <span style={labelStyle}>문서 종류</span>
            <span style={{ ...valueStyle, color: '#1e3a5f' }}>답변서</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>사건명</span>
            <span style={valueStyle}>{data.caseCategory || data.caseName || '-'}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>법원</span>
            <span style={valueStyle}>{data.court || '-'}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>답변인 (피고)</span>
            <span style={valueStyle}>{defendant}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>상대방 (원고)</span>
            <span style={valueStyle}>{plaintiff}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>대리인 여부</span>
            <span style={valueStyle}>{data.hasAgent ? `있음 (${data.agentName || ''})` : '없음'}</span>
          </div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={labelStyle}>입증서류 수</span>
            <span style={valueStyle}>{data.evidences.length}건</span>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6,
            padding: '12px 16px', color: '#dc2626', fontSize: 14, marginBottom: 16,
          }}>
            오류: {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn-gray" onClick={onBack} disabled={loading}>이전</button>
          <button
            className="btn-navy"
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding: '12px 40px', fontSize: 16, fontWeight: 700, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? '⏳ 제출 중...' : '답변서 제출하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
