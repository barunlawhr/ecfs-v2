'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface DeliveryDoc {
  id: string; court: string; division: string; case_number: string
  document_name: string; sent_at: string; received_at: string | null
  is_auto_confirmed: boolean; has_publish: boolean
  icon_color: string; document_category: string; has_submit_button: boolean
  student_id: string | null
}

const TEAL = '#00897b'
const NAVY = '#003366'
const COLOR_MAP: Record<string, string> = { red: '#e53e3e', blue: '#0067c2', none: '#222' }

function DocNameCell({ doc }: { doc: DeliveryDoc }) {
  const color = COLOR_MAP[doc.icon_color] || '#222'
  return (
    <span style={{ color, cursor: 'pointer', textDecoration: 'underline', fontWeight: doc.icon_color !== 'none' ? 600 : 400 }}>
      {doc.icon_color !== 'none' && <span style={{ marginRight: 4, fontWeight: 700, color }}>(!)</span>}
      {doc.document_name}
    </span>
  )
}

function CaseNoLink({ caseNo }: { caseNo: string }) {
  return <span style={{ color: '#0067c2', textDecoration: 'underline', cursor: 'pointer' }}>{caseNo}</span>
}

const thS: React.CSSProperties = { padding: '8px 8px', fontWeight: 600, fontSize: 11, color: '#333', textAlign: 'center', whiteSpace: 'nowrap', background: '#f0f3f8', borderBottom: '2px solid #b8c8e0' }
const tdS: React.CSSProperties = { padding: '8px 8px', fontSize: 12, borderBottom: '1px solid #eee', verticalAlign: 'middle', textAlign: 'center' }

// ════════════════════════════════════════════
// 미확인송달문서
// ════════════════════════════════════════════
export function UnconfirmedDeliveryContent({
  userId, onCountChange, PageHd, ActBtn
}: {
  userId: string
  onCountChange: (n: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PageHd: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ActBtn: any
}) {
  const [docs, setDocs] = useState<DeliveryDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const perPage = 10

  const loadDocs = useCallback(async () => {
    setLoading(true)
    // 자동확인 처리
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    await supabase.from('delivery_documents')
      .update({ is_auto_confirmed: true, received_at: sevenDaysAgo })
      .is('received_at', null)
      .lte('sent_at', sevenDaysAgo)
      .or(`student_id.eq.${userId},student_id.is.null`)

    // 미확인 조회 (본인 + 공통)
    const { data } = await supabase.from('delivery_documents')
      .select('*')
      .is('received_at', null)
      .or(`student_id.eq.${userId},student_id.is.null`)
      .order('sent_at', { ascending: false })

    // seed: 공통 문서 0건이면 생성
    if (!data || data.length === 0) {
      const { count } = await supabase.from('delivery_documents')
        .select('id', { count: 'exact', head: true })
        .or(`student_id.eq.${userId},student_id.is.null`)
      if (count === 0 || count === null) {
        const now = new Date()
        const d = (n: number) => new Date(now.getTime() - n * 86400000).toISOString().slice(0, 10)
        await supabase.from('delivery_documents').insert([
          { student_id: userId, court: '서울중앙지방법원', division: '민사10단독(소액)', case_number: '2026가소226035', document_name: '소장부본', sent_at: d(5), has_publish: true, icon_color: 'red', document_category: 'copy' },
          { student_id: userId, court: '수원지방법원', division: '민사2단독', case_number: '2026가단22345', document_name: '답변서부본', sent_at: d(3), icon_color: 'blue', document_category: 'copy' },
          { student_id: userId, court: '인천지방법원', division: '민사5단독', case_number: '2025가단33456', document_name: '보정명령등본', sent_at: d(2), has_publish: true, icon_color: 'red', document_category: 'decision', has_submit_button: true },
          { student_id: userId, court: '서울동부지방법원', division: '민사1단독', case_number: '2026가단44567', document_name: '준비서면부본', sent_at: d(1), icon_color: 'blue', document_category: 'copy' },
        ])
        const { data: seeded } = await supabase.from('delivery_documents')
          .select('*').is('received_at', null).or(`student_id.eq.${userId},student_id.is.null`)
          .order('sent_at', { ascending: false })
        setDocs((seeded || []) as DeliveryDoc[])
        onCountChange(seeded?.length || 0)
        setLoading(false)
        return
      }
    }
    setDocs((data || []) as DeliveryDoc[])
    onCountChange(data?.length || 0)
    setLoading(false)
  }, [userId, onCountChange])

  useEffect(() => { loadDocs() }, [loadDocs])

  function toggleCheck(id: string) { setChecked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleAll() { setChecked(p => p.size === paged.length ? new Set() : new Set(paged.map(d => d.id))) }

  async function confirmDoc(id: string) {
    await supabase.from('delivery_documents').update({ received_at: new Date().toISOString().slice(0, 10) }).eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
    onCountChange(docs.length - 1)
    setChecked(p => { const n = new Set(p); n.delete(id); return n })
  }

  async function batchConfirm() {
    if (checked.size === 0) { alert('확인할 문서를 선택해주세요.'); return }
    if (!confirm(`선택한 ${checked.size}건의 송달문서를 확인 처리하시겠습니까?`)) return
    await supabase.from('delivery_documents').update({ received_at: new Date().toISOString().slice(0, 10) }).in('id', [...checked])
    setDocs(prev => prev.filter(d => !checked.has(d.id)))
    onCountChange(docs.length - checked.size)
    setChecked(new Set())
  }

  async function excelDownload() {
    const xlsx = await import('xlsx')
    const rows = docs.map(d => ({ 법원: d.court, 재판부: d.division, 사건번호: d.case_number, 송달문서: d.document_name, 발송일자: d.sent_at }))
    const ws = xlsx.utils.json_to_sheet(rows)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, '미확인송달문서')
    xlsx.writeFile(wb, `미확인송달문서_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const total = docs.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const paged = docs.slice((page - 1) * perPage, page * perPage)

  return (
    <div>
      <PageHd title="미확인송달문서" actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />

      {/* 필터 (decorative) */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#555', minWidth: 52 }}>소송유형</span>
          <select style={{ height: 30, border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, padding: '0 8px' }}><option>전체</option></select>
          <select style={{ height: 30, border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, padding: '0 8px' }}><option>전체</option></select>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#555', marginLeft: 16 }}>법원</span>
          <select style={{ height: 30, border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, padding: '0 8px' }}><option>전체</option></select>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><input type="checkbox" /> 사건번호</label>
          <select style={{ height: 28, border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, padding: '0 6px' }}><option>2026</option><option>2025</option></select>
          <select style={{ height: 28, border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, padding: '0 6px' }}><option>가단</option><option>가합</option><option>가소</option></select>
          <input style={{ height: 28, width: 100, border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, padding: '0 8px' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, marginLeft: 16 }}><input type="checkbox" /> 사건구분 가나다순 정렬</label>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#555', minWidth: 52 }}>정렬순서</span>
          <select style={{ height: 28, border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, padding: '0 6px' }}><option>발송일자↓</option></select>
          <select style={{ height: 28, border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, padding: '0 6px' }}><option>법원↑</option></select>
          <select style={{ height: 28, border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, padding: '0 6px' }}><option>사건번호↓</option></select>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><input type="checkbox" /> 결과내재검색</label>
          <input style={{ height: 28, width: 240, border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, padding: '0 8px' }} />
        </div>
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <button style={{ height: 34, padding: '0 48px', background: TEAL, color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>조 회</button>
        </div>
      </div>

      {/* 안내문 */}
      <div style={{ background: '#fffbe6', borderBottom: '1px solid #ffe082', padding: '8px 14px', fontSize: 11, color: '#7a6000', lineHeight: 1.8 }}>
        ※ &apos;발급/조회&apos; 버튼을 이용하여 발급하여야 &apos;열람용&apos;이라는 문구가 기재되지 않은 등본을 출력할 수 있고, 그렇지 않은 경우에는 &apos;열람용&apos;이라는 문구가 포함되어 출력되는 점에 유의하시기 바랍니다.
      </div>

      {/* 도구 버튼 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dde0e8', padding: '6px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={batchConfirm} style={{ height: 28, padding: '0 14px', background: '#fff', border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 11, cursor: 'pointer' }}>일괄확인 &gt;</button>
        <button onClick={excelDownload} style={{ height: 28, padding: '0 14px', background: '#1a7a3a', color: '#fff', border: 'none', borderRadius: 3, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>📗 엑셀로 저장</button>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#aaa', background: '#fff' }}>⏳ 불러오는 중...</div>
      ) : (
        <div style={{ background: '#fff', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...thS, width: 28 }}><input type="checkbox" checked={checked.size === paged.length && paged.length > 0} onChange={toggleAll} /></th>
                {['법원', '재판부', '사건번호', '송달문서', '발송일자', '문서발급', '송달내역', '관련서류'].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={9} style={{ ...tdS, padding: 40, color: '#aaa' }}>미확인 송달문서가 없습니다.</td></tr>
              ) : paged.map((doc, i) => (
                <tr key={doc.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfe' }}>
                  <td style={tdS}><input type="checkbox" checked={checked.has(doc.id)} onChange={() => toggleCheck(doc.id)} /></td>
                  <td style={tdS}>{doc.court.replace('지방법원', '지법').replace('고등법원', '고법')}</td>
                  <td style={tdS}>{doc.division}</td>
                  <td style={tdS}><CaseNoLink caseNo={doc.case_number} /></td>
                  <td style={{ ...tdS, textAlign: 'left' }}><DocNameCell doc={doc} /></td>
                  <td style={tdS}>{doc.sent_at.replace(/-/g, '.')}</td>
                  <td style={tdS}>{doc.has_publish && <button onClick={() => confirmDoc(doc.id)} style={{ height: 22, padding: '0 8px', background: '#fff', border: '1px solid #8899bb', borderRadius: 3, fontSize: 11, cursor: 'pointer', color: NAVY }}>발급/조회</button>}</td>
                  <td style={tdS}><button onClick={() => confirmDoc(doc.id)} style={{ height: 22, padding: '0 8px', background: '#fff', border: '1px solid #8899bb', borderRadius: 3, fontSize: 11, cursor: 'pointer', color: NAVY }}>조회</button></td>
                  <td style={tdS}>{doc.has_submit_button && <button style={{ height: 22, padding: '0 8px', background: '#fff', border: '1px solid #8899bb', borderRadius: 3, fontSize: 11, cursor: 'pointer', color: NAVY }}>제출</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      <div style={{ background: '#fff', borderTop: '1px solid #e8edf0', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#555' }}>총 <strong>{total}</strong>건</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setPage(1)} disabled={page === 1} style={{ width: 26, height: 26, border: '1px solid #ccc', background: '#fff', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}>«</button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 26, height: 26, border: '1px solid #ccc', background: '#fff', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{ width: 26, height: 26, border: `1px solid ${p === page ? NAVY : '#ccc'}`, background: p === page ? NAVY : '#fff', color: p === page ? '#fff' : '#555', borderRadius: 3, cursor: 'pointer', fontSize: 12, fontWeight: p === page ? 700 : 400 }}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 26, height: 26, border: '1px solid #ccc', background: '#fff', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}>›</button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ width: 26, height: 26, border: '1px solid #ccc', background: '#fff', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}>»</button>
        </div>
        <select defaultValue="10" style={{ height: 26, border: '1px solid #ccc', borderRadius: 3, fontSize: 11, padding: '0 4px' }}>
          {['10', '20', '30'].map(n => <option key={n}>{n}개씩 보기</option>)}
        </select>
      </div>

      {/* 참고 박스 */}
      <div style={{ background: '#f8f9fb', border: '1px solid #d8dce8', borderRadius: 4, padding: 16, marginTop: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 48, height: 48, background: '#e8edf4', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 8 }}>참고하세요</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#555', lineHeight: 1.9 }}>
            <li><span style={{ color: '#e53e3e', fontWeight: 700 }}>(!)</span> 송달문서를 반드시 확인해 주세요. 송달문서에 대한 불복문서를 제출하고자 하는 경우 제출기간 도과에 따른 불이익이 발생하지 않도록 주의하시기 바랍니다.</li>
            <li><span style={{ color: '#e53e3e', fontWeight: 700 }}>(!)</span> 송달문서를 확인해 주세요. 제출기한이 있는 송달문서의 경우 기한 내에 해당 서류가 법원에 접수될 수 있도록 유의하시기 바랍니다.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════
// 전체송달문서
// ════════════════════════════════════════════
export function AllDeliveryContent({
  userId, onCountChange, PageHd, ActBtn
}: {
  userId: string
  onCountChange: (n: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PageHd: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ActBtn: any
}) {
  const [docs, setDocs] = useState<DeliveryDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('전체')
  const perPage = 10

  const loadDocs = useCallback(async () => {
    setLoading(true)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    await supabase.from('delivery_documents')
      .update({ is_auto_confirmed: true, received_at: sevenDaysAgo })
      .is('received_at', null).lte('sent_at', sevenDaysAgo)
      .or(`student_id.eq.${userId},student_id.is.null`)

    const { data } = await supabase.from('delivery_documents')
      .select('*')
      .or(`student_id.eq.${userId},student_id.is.null`)
      .order('sent_at', { ascending: false })
    setDocs((data || []) as DeliveryDoc[])
    const unconfirmed = (data || []).filter(d => !d.received_at).length
    onCountChange(unconfirmed)
    setLoading(false)
  }, [userId, onCountChange])

  useEffect(() => { loadDocs() }, [loadDocs])

  async function excelDownload() {
    const xlsx = await import('xlsx')
    const rows = docs.map(d => ({ 법원: d.court, 재판부: d.division, 사건번호: d.case_number, 송달문서: d.document_name, 발송일자: d.sent_at, 수신일자: d.received_at || '미확인' }))
    const ws = xlsx.utils.json_to_sheet(rows)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, '전체송달문서')
    xlsx.writeFile(wb, `전체송달문서_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const filtered = docs.filter(d => {
    if (statusFilter === '미확인') return !d.received_at
    if (statusFilter === '확인') return d.received_at && !d.is_auto_confirmed
    if (statusFilter === '자동확인') return d.is_auto_confirmed
    return true
  })
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  function recvDisplay(doc: DeliveryDoc): React.ReactNode {
    if (!doc.received_at) return <span style={{ color: '#e53e3e', fontWeight: 600, fontSize: 11 }}>미확인</span>
    const dt = doc.received_at.replace(/-/g, '.')
    if (doc.is_auto_confirmed) return <span style={{ color: '#888', fontSize: 11 }}>{dt}(자동확인)</span>
    return <span style={{ fontSize: 11 }}>{dt}</span>
  }

  return (
    <div>
      <PageHd title="전체송달문서" actions={<><ActBtn label="📌 나의 메뉴 추가" /><ActBtn label="🖨 출력" /></>} />

      {/* 필터 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#555', minWidth: 52 }}>소송유형</span>
          <select style={{ height: 30, border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, padding: '0 8px' }}><option>전체</option></select>
          <select style={{ height: 30, border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, padding: '0 8px' }}><option>전체</option></select>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#555', marginLeft: 16 }}>법원</span>
          <select style={{ height: 30, border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, padding: '0 8px' }}><option>전체</option></select>
        </div>
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <button style={{ height: 34, padding: '0 48px', background: TEAL, color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>조 회</button>
        </div>
      </div>

      <div style={{ background: '#fffbe6', borderBottom: '1px solid #ffe082', padding: '8px 14px', fontSize: 11, color: '#7a6000', lineHeight: 1.8 }}>
        ※ &apos;발급/조회&apos; 버튼을 이용하여 발급하여야 &apos;열람용&apos;이라는 문구가 기재되지 않은 등본을 출력할 수 있고, 그렇지 않은 경우에는 &apos;열람용&apos;이라는 문구가 포함되어 출력되는 점에 유의하시기 바랍니다.
      </div>

      {/* 도구 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dde0e8', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={{ height: 26, border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 11, padding: '0 4px' }}>
          {['전체', '미확인', '확인', '자동확인'].map(t => <option key={t}>{t}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ height: 26, padding: '0 12px', background: '#fff', border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 11, cursor: 'pointer' }}>일괄확인 &gt;</button>
          <button onClick={excelDownload} style={{ height: 26, padding: '0 12px', background: '#1a7a3a', color: '#fff', border: 'none', borderRadius: 3, fontSize: 11, cursor: 'pointer' }}>📗 엑셀로 저장</button>
        </div>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#aaa', background: '#fff' }}>⏳ 불러오는 중...</div>
      ) : (
        <div style={{ background: '#fff', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...thS, width: 28 }}><input type="checkbox" /></th>
                {['법원', '재판부', '사건번호', '송달문서', '발송일자', '수신일자', '문서발급', '송달내역', '관련서류'].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={10} style={{ ...tdS, padding: 40, color: '#aaa' }}>송달문서가 없습니다.</td></tr>
              ) : paged.map((doc, i) => (
                <tr key={doc.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfe' }}>
                  <td style={tdS}><input type="checkbox" /></td>
                  <td style={tdS}>{doc.court.replace('지방법원', '지법').replace('고등법원', '고법')}</td>
                  <td style={tdS}>{doc.division}</td>
                  <td style={tdS}><CaseNoLink caseNo={doc.case_number} /></td>
                  <td style={{ ...tdS, textAlign: 'left' }}><DocNameCell doc={doc} /></td>
                  <td style={tdS}>{doc.sent_at.replace(/-/g, '.')}</td>
                  <td style={tdS}>{recvDisplay(doc)}</td>
                  <td style={tdS}>{doc.has_publish && <button style={{ height: 22, padding: '0 8px', background: '#fff', border: '1px solid #8899bb', borderRadius: 3, fontSize: 11, cursor: 'pointer', color: NAVY }}>발급/조회</button>}</td>
                  <td style={tdS}><button style={{ height: 22, padding: '0 8px', background: '#fff', border: '1px solid #8899bb', borderRadius: 3, fontSize: 11, cursor: 'pointer', color: NAVY }}>조회</button></td>
                  <td style={tdS}>{doc.has_submit_button && <button style={{ height: 22, padding: '0 8px', background: '#fff', border: '1px solid #8899bb', borderRadius: 3, fontSize: 11, cursor: 'pointer', color: NAVY }}>제출</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      <div style={{ background: '#fff', borderTop: '1px solid #e8edf0', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#555' }}>총 <strong>{total}</strong>건</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{ width: 26, height: 26, border: `1px solid ${p === page ? NAVY : '#ccc'}`, background: p === page ? NAVY : '#fff', color: p === page ? '#fff' : '#555', borderRadius: 3, cursor: 'pointer', fontSize: 12, fontWeight: p === page ? 700 : 400 }}>{p}</button>
          ))}
        </div>
        <select defaultValue="10" style={{ height: 26, border: '1px solid #ccc', borderRadius: 3, fontSize: 11, padding: '0 4px' }}>
          {['10', '20', '30'].map(n => <option key={n}>{n}개씩 보기</option>)}
        </select>
      </div>

      {/* 참고 박스 */}
      <div style={{ background: '#f8f9fb', border: '1px solid #d8dce8', borderRadius: 4, padding: 16, marginTop: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 48, height: 48, background: '#e8edf4', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 8 }}>참고하세요</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#555', lineHeight: 1.9 }}>
            <li><span style={{ color: '#e53e3e', fontWeight: 700 }}>(!)</span> 송달문서를 반드시 확인해 주세요. 송달문서에 대한 불복문서를 제출하고자 하는 경우 제출기간 도과에 따른 불이익이 발생하지 않도록 주의하시기 바랍니다.</li>
            <li><span style={{ color: '#e53e3e', fontWeight: 700 }}>(!)</span> 송달문서를 확인해 주세요. 제출기한이 있는 송달문서의 경우 기한 내에 해당 서류가 법원에 접수될 수 있도록 유의하시기 바랍니다.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
