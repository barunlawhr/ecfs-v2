'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import DocumentViewerModal, { type DocViewerData } from '@/components/common/DocumentViewerModal'

const TEAL = '#00897b'
const NAVY = '#003366'
const labelS: React.CSSProperties = { padding: '10px 14px', background: '#f5f7fb', fontWeight: 600, fontSize: 12, color: '#444', borderRight: '1px solid #d0d8e4', borderBottom: '1px solid #d0d8e4', width: '15%', whiteSpace: 'nowrap' }
const valS: React.CSSProperties = { padding: '10px 14px', fontSize: 13, color: '#222', borderBottom: '1px solid #d0d8e4', width: '35%' }
const thS: React.CSSProperties = { padding: '8px 10px', fontWeight: 600, fontSize: 12, color: '#333', textAlign: 'center', background: '#f0f3f8', borderBottom: '2px solid #b8c8e0', whiteSpace: 'nowrap' }
const tdS: React.CSSProperties = { padding: '8px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'center', verticalAlign: 'middle' }

interface DeliveryDoc {
  id: string; court: string; division: string; case_number: string
  document_name: string; sent_at: string; received_at: string | null
  icon_color: string; document_category: string; template_data?: Record<string, unknown> | null
}

interface IssueRecord {
  id: string; issued_at: string; issuer_name: string; issue_number: string; is_reissue: boolean
}

interface ReissueRequest {
  id: string; requested_at: string; requester_name: string; reason: string; status: string; rejection_reason: string | null
}

export default function DocumentIssuePage() {
  const [doc, setDoc] = useState<DeliveryDoc | null>(null)
  const [issues, setIssues] = useState<IssueRecord[]>([])
  const [reissues, setReissues] = useState<ReissueRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')
  const [docId, setDocId] = useState('')
  const [showReissueModal, setShowReissueModal] = useState(false)
  const [reissueReason, setReissueReason] = useState('')
  const [reissueCustom, setReissueCustom] = useState('')
  const [docViewer, setDocViewer] = useState<DocViewerData | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('docId') || ''
    setDocId(id)
  }, [])

  const loadData = useCallback(async () => {
    if (!docId) return
    setLoading(true)

    // Get user
    const { data: accounts } = await supabase.from('accounts').select('id,name')
    const stored = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('ecfs_user') || '{}') : {}
    const uid = stored.id || ''
    const uname = stored.name || '학생'
    setUserId(uid)
    setUserName(uname)
    void accounts

    // Get document
    const { data: docData } = await supabase.from('delivery_documents').select('*').eq('id', docId).single()
    if (docData) setDoc(docData as DeliveryDoc)

    // Get issues
    const { data: issueData } = await supabase.from('document_issues')
      .select('*').eq('delivery_doc_id', docId).order('issued_at', { ascending: false })
    setIssues((issueData || []) as IssueRecord[])

    // Get reissue requests
    const issueIds = (issueData || []).map((i: { id: string }) => i.id)
    if (issueIds.length > 0) {
      const { data: reissueData } = await supabase.from('reissue_requests')
        .select('*').in('document_issue_id', issueIds).order('requested_at', { ascending: false })
      setReissues((reissueData || []) as ReissueRequest[])
    }

    setLoading(false)
  }, [docId])

  useEffect(() => { loadData() }, [loadData])

  function generateIssueNumber() {
    const d = new Date()
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `ISS-${date}-${rand}`
  }

  async function handleIssue() {
    if (!doc) return

    if (issues.length > 0) {
      alert('이미 발급된 문서입니다. 재발급은 [재발급요청]을 이용하세요.')
      setShowReissueModal(true)
      return
    }

    const issueNumber = generateIssueNumber()
    await supabase.from('document_issues').insert({
      delivery_doc_id: doc.id,
      student_id: userId || null,
      issued_at: new Date().toISOString(),
      issuer_name: userName,
      issue_number: issueNumber,
      is_reissue: false,
    })

    // Mark delivery as confirmed
    if (!doc.received_at) {
      const today = new Date().toISOString().slice(0, 10)
      await supabase.from('delivery_documents').update({ received_at: today }).eq('id', doc.id)
      setDoc(prev => prev ? { ...prev, received_at: today } : prev)
    }

    await loadData()
    alert(`발급되었습니다.\n발급번호: ${issueNumber}\n(열람용 워터마크 포함)`)

    // Open document viewer
    setDocViewer(doc as DocViewerData)
  }

  async function handleReissueRequest() {
    if (!reissueReason) { alert('요���사유를 선택해주세요.'); return }
    const reason = reissueReason === '기타' ? reissueCustom : reissueReason
    if (!reason) { alert('사유를 입력해주세요.'); return }

    const latestIssue = issues[0]
    if (!latestIssue) return

    await supabase.from('reissue_requests').insert({
      document_issue_id: latestIssue.id,
      student_id: userId || null,
      requester_name: userName,
      reason,
      status: 'pending',
    })

    setShowReissueModal(false)
    setReissueReason('')
    setReissueCustom('')
    await loadData()
    alert('재발급 요청이 접수되었습니다.\n처리까지 영업일 기준 1~2일 소요됩니다.')
  }

  function handlePrinterTest() {
    alert('프린터 연결을 확인하고 있습니다...\n\n✅ 정상\n\n연결된 프린터가 확인되었습니다.')
  }

  function handlePrinterCheck() {
    alert('현재 사용 가능한 프린터:\n\n• Microsoft Print to PDF\n• OneNote (Desktop)\n• Fax')
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>불러오는 중...</div>
  if (!doc) return <div style={{ padding: 60, textAlign: 'center', color: '#e53e3e' }}>문서를 찾을 수 없습니다.</div>

  const caseName = doc.document_category === 'decision' ? '채권가압류' : '손해배상(기)'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', fontFamily: "'Malgun Gothic', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '2px solid ' + NAVY, paddingBottom: 10 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>문서발급/조회</h2>
        <button onClick={() => window.print()} style={{ height: 30, padding: '0 14px', background: '#fff', border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, cursor: 'pointer' }}>🖨 출력</button>
      </div>

      {/* 사건기본정보 */}
      <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>&#9675; 사건기본정보</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', marginBottom: 24 }}>
        <tbody>
          <tr>
            <td style={labelS}>법원</td><td style={valS}>{doc.court}</td>
            <td style={labelS}>사건번호</td><td style={valS}>{doc.case_number}</td>
          </tr>
          <tr>
            <td style={labelS}>재판부</td><td style={valS}>{doc.division}</td>
            <td style={labelS}>사건명</td><td style={valS}>{caseName}</td>
          </tr>
          <tr>
            <td style={labelS}>원고</td><td style={valS}>홍길동</td>
            <td style={labelS}>피고</td><td style={valS}>주식회사 가나다라마</td>
          </tr>
        </tbody>
      </table>

      {/* 문서발급 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>&#9675; 문서발급</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handlePrinterTest} style={{ height: 26, padding: '0 10px', background: '#fff', border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 11, cursor: 'pointer' }}>발급테스트</button>
          <button onClick={handlePrinterCheck} style={{ height: 26, padding: '0 10px', background: '#fff', border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 11, cursor: 'pointer' }}>발급가능 프린터 확인하기</button>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <thead>
          <tr>
            <th style={{ ...thS, textAlign: 'left', paddingLeft: 14 }}>발급문서</th>
            <th style={{ ...thS, width: 100 }}>발급</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...tdS, textAlign: 'left', paddingLeft: 14, fontWeight: 500 }}>{doc.document_name}</td>
            <td style={tdS}>
              <button onClick={handleIssue} style={{ height: 26, padding: '0 14px', background: TEAL, color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>발급</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
        ※ 판결(판결에 갈음하는 결정, 조서 포함) 정(등)본은 발급횟수를 1회로 제한하고 있으니 발급 전 발급테스트를 하시기 바랍니다.
      </div>

      {/* 발급이력 */}
      <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>&#9675; 발급이력</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr>
            {['발급일자', '발급문서', '발급자', '발급번호', '재발급'].map(h => (
              <th key={h} style={thS}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {issues.length === 0 ? (
            <tr><td colSpan={5} style={{ ...tdS, padding: 24, color: '#aaa' }}>조회된 결과가 없습니다.</td></tr>
          ) : issues.map(issue => (
            <tr key={issue.id}>
              <td style={tdS}>{new Date(issue.issued_at).toLocaleDateString('ko-KR')}</td>
              <td style={tdS}>{doc.document_name}</td>
              <td style={tdS}>{issue.issuer_name}</td>
              <td style={{ ...tdS, fontFamily: 'monospace', fontSize: 11 }}>{issue.issue_number}</td>
              <td style={tdS}>
                {issue.is_reissue
                  ? <span style={{ color: '#38a169', fontSize: 11 }}>재발급</span>
                  : <button onClick={() => setShowReissueModal(true)} style={{ height: 22, padding: '0 8px', background: '#fff', border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 11, cursor: 'pointer', color: NAVY }}>재발급요청</button>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 재발급요청이력 */}
      <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>&#9675; 재발급요청이력</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr>
            {['요청일자', '발급문서', '요청자', '요청사유', '처리상태', '승인거부사유'].map(h => (
              <th key={h} style={thS}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reissues.length === 0 ? (
            <tr><td colSpan={6} style={{ ...tdS, padding: 24, color: '#aaa' }}>조회된 결과가 없습니다.</td></tr>
          ) : reissues.map(r => (
            <tr key={r.id}>
              <td style={tdS}>{new Date(r.requested_at).toLocaleDateString('ko-KR')}</td>
              <td style={tdS}>{doc.document_name}</td>
              <td style={tdS}>{r.requester_name}</td>
              <td style={tdS}>{r.reason}</td>
              <td style={tdS}>
                <span style={{ color: r.status === 'pending' ? '#d69e2e' : r.status === 'approved' ? '#38a169' : '#e53e3e', fontWeight: 600, fontSize: 11 }}>
                  {r.status === 'pending' ? '처리중' : r.status === 'approved' ? '승인' : '거부'}
                </span>
              </td>
              <td style={tdS}>{r.rejection_reason || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 참고하세요 */}
      <div style={{ background: '#f8f9fb', border: '1px solid #d8dce8', borderRadius: 4, padding: '20px 24px', marginTop: 24, display: 'flex', gap: 20 }}>
        <div style={{ fontSize: 48, color: '#8fa0b8', flexShrink: 0, lineHeight: 1 }}>&#128433;</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#222', marginBottom: 12 }}>참고하세요</div>

          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginTop: 12, marginBottom: 4 }}>• 발급</div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.8, marginLeft: 12 }}>
            &apos;발급&apos; 버튼을 이용하여 발급하여야 &apos;열람용&apos;이라는 문구가 기재되지 않은 등본을 출력할 수 있고, 그렇지 않은 경우는 &apos;열람용&apos;이라는 문구가 포함되어 출력되는 점에 유의하시기 바랍니다.<br />
            <span style={{ color: '#e53e3e', fontWeight: 600 }}>판결(판결에 갈음하는 결정, 조서 포함) 정(등)본은 발급횟수를 1회로 제한하고 그 외의 정(등)본 문서는 제한 없이 발급 가능합니다.</span><br />
            발급문서는 문서위조변조방지 기술이 적용된 것으로 원본과 동일하므로 그 발급 문서를 법원이나 필요로 하는 관청에 제출할 수 있습니다.
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginTop: 12, marginBottom: 4 }}>• 발급테스트</div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.8, marginLeft: 12 }}>
            발급하시기 전에 먼저 발급테스트를 눌러 문서위조변조방지 기술이 적용된 QR 코드가 표시된 테스트페이지가 출력되는지를 확인하시기 바랍니다.
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginTop: 12, marginBottom: 4 }}>• 발급가능 프린트</div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.8, marginLeft: 12 }}>
            프린터 발급가능 프린터 확인하기를 선택하여 발급 가능한 프린터가 연결되어 있는지 확인하시기 바랍니다.<br />
            프린터는 기본값이 <span style={{ color: '#e53e3e', fontWeight: 600 }}>600dpi급 이상</span>으로 설정되어야 정상적인 발급서비스를 받으실 수 있습니다.
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginTop: 12, marginBottom: 4 }}>• 재발급요청</div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.8, marginLeft: 12 }}>
            전자소송시스템의 장애 등 사용자에게 책임이 없는 사유로 인하여 발급이 정상적으로 완료되지 아니한 경우에는 그 사유를 소명하여 재발급을 신청할 수 있습니다.
          </div>

          <div style={{ fontSize: 12, color: '#e53e3e', fontWeight: 600, lineHeight: 1.8, marginTop: 12, marginLeft: 12 }}>
            - 보존일로부터 1년이 경과된 사건의 경우 (재)발급이 불가합니다.
          </div>
        </div>
      </div>

      {/* 뒤로가기 */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={() => window.history.back()} style={{ height: 34, padding: '0 32px', background: '#e0e4ec', border: 'none', borderRadius: 3, fontSize: 13, cursor: 'pointer' }}>뒤로가기</button>
      </div>

      {/* 재발급요청 모달 */}
      {showReissueModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 7000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowReissueModal(false) }}>
          <div style={{ background: '#fff', width: 440, borderRadius: 6, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,.3)' }}>
            <div style={{ background: NAVY, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>재발급 요청</span>
              <button onClick={() => setShowReissueModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>발급문서: <strong>{doc.document_name}</strong></div>
              {issues[0] && <div style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>기존 발급일자: <strong>{new Date(issues[0].issued_at).toLocaleDateString('ko-KR')}</strong></div>}

              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>요청사유 *</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {['출력 오류', '분실', '재제출 필요', '기타'].map(r => (
                  <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                    <input type="radio" name="reissueReason" value={r} checked={reissueReason === r} onChange={() => setReissueReason(r)} style={{ accentColor: TEAL }} />
                    {r}
                  </label>
                ))}
              </div>
              {reissueReason === '기타' && (
                <input value={reissueCustom} onChange={e => setReissueCustom(e.target.value)} placeholder="사유를 입력해주세요" style={{ width: '100%', height: 32, border: '1px solid #c8cdd6', borderRadius: 3, padding: '0 10px', fontSize: 12, marginBottom: 16 }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                <button onClick={() => setShowReissueModal(false)} style={{ height: 32, padding: '0 20px', background: '#e0e4ec', border: 'none', borderRadius: 3, fontSize: 12, cursor: 'pointer' }}>취소</button>
                <button onClick={handleReissueRequest} style={{ height: 32, padding: '0 20px', background: TEAL, color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>요청하기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer (after issue) */}
      {docViewer && <DocumentViewerModal doc={docViewer} onClose={() => setDocViewer(null)} />}
    </div>
  )
}
