'use client'

export interface DeliveryHistoryDoc {
  id: string
  court: string
  division: string
  case_number: string
  document_name: string
  sent_at: string
  received_at: string | null
  is_auto_confirmed: boolean
}

interface Props {
  doc: DeliveryHistoryDoc
  userName: string
  onClose: () => void
}

const NAVY = '#003366'
const thS: React.CSSProperties = { padding: '8px 10px', fontWeight: 600, fontSize: 12, color: '#333', textAlign: 'center', background: '#f0f3f8', borderBottom: '2px solid #b8c8e0', whiteSpace: 'nowrap' }
const tdS: React.CSSProperties = { padding: '8px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'center', verticalAlign: 'middle' }
const labelS: React.CSSProperties = { padding: '8px 12px', background: '#f5f7fb', fontWeight: 600, fontSize: 12, color: '#444', borderRight: '1px solid #d0d8e4', borderBottom: '1px solid #d0d8e4', width: '18%', whiteSpace: 'nowrap' }
const valS: React.CSSProperties = { padding: '8px 12px', fontSize: 12, color: '#222', borderBottom: '1px solid #d0d8e4', width: '32%' }

export default function DeliveryHistoryModal({ doc, userName, onClose }: Props) {
  // Generate history
  const history: { seq: number; datetime: string; action: string; actor: string; note: string }[] = []

  history.push({ seq: 1, datetime: `${doc.sent_at.replace(/-/g, '.')} 09:00`, action: '발송', actor: doc.court, note: '전자문서 등재' })
  history.push({ seq: 2, datetime: `${doc.sent_at.replace(/-/g, '.')} 09:01`, action: '등재통지', actor: '시스템', note: '이메일/SMS 발송' })

  if (doc.received_at) {
    const time = doc.is_auto_confirmed ? '00:00' : '14:30'
    history.push({
      seq: 3,
      datetime: `${doc.received_at.replace(/-/g, '.')} ${time}`,
      action: '확인',
      actor: doc.is_auto_confirmed ? '시스템' : userName,
      note: doc.is_auto_confirmed ? '자동확인(7일경과)' : '직접확인',
    })
  }

  // Status
  const status = (() => {
    if (doc.received_at) {
      return doc.is_auto_confirmed
        ? { icon: '⏰', text: '자동확인 완료', color: '#888' }
        : { icon: '✅', text: '직접확인 완료', color: '#38a169' }
    }
    const daysLeft = Math.ceil(
      (new Date(doc.sent_at).getTime() + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)
    )
    return { icon: '⏰', text: `미확인 (D-${Math.max(0, daysLeft)})`, color: '#e53e3e' }
  })()

  // 송달간주 예정일
  const deemedDate = new Date(new Date(doc.sent_at).getTime() + 7 * 24 * 60 * 60 * 1000)
  const deemedStr = `${deemedDate.getFullYear()}.${String(deemedDate.getMonth() + 1).padStart(2, '0')}.${String(deemedDate.getDate()).padStart(2, '0')} 00:00`

  const actionColor = (action: string, isAuto: boolean) => {
    if (action === '발송') return '#0067c2'
    if (action === '등재통지') return '#888'
    if (action === '확인') return isAuto ? '#888' : '#38a169'
    return '#222'
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 7000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', width: 720, maxWidth: '95vw', maxHeight: '80vh', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,.3)' }}>

        {/* Header */}
        <div style={{ background: NAVY, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 14, fontWeight: 600 }}>
            <span>&#128269;</span>
            <span>송달내역 조회</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>&times;</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflow: 'auto', flex: 1 }}>

          {/* 사건정보 */}
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>&#9675; 사건정보</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', marginBottom: 20 }}>
            <tbody>
              <tr>
                <td style={labelS}>법원</td>
                <td style={valS}>{doc.court}</td>
                <td style={labelS}>사건번호</td>
                <td style={valS}>{doc.case_number}</td>
              </tr>
              <tr>
                <td style={labelS}>재판부</td>
                <td style={valS}>{doc.division}</td>
                <td style={labelS}>송달문서</td>
                <td style={valS}>{doc.document_name}</td>
              </tr>
            </tbody>
          </table>

          {/* 송달내역 */}
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>&#9675; 송달내역</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr>
                {['순서', '일시', '처리내용', '처리자', '비고'].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.seq}>
                  <td style={tdS}>{h.seq}</td>
                  <td style={tdS}>{h.datetime}</td>
                  <td style={{ ...tdS, color: actionColor(h.action, doc.is_auto_confirmed), fontWeight: h.action === '확인' ? 600 : 400 }}>{h.action}</td>
                  <td style={tdS}>{h.actor}</td>
                  <td style={tdS}>{h.note}</td>
                </tr>
              ))}
              {!doc.received_at && (
                <tr>
                  <td style={tdS}>3</td>
                  <td style={{ ...tdS, color: '#aaa' }}>-</td>
                  <td style={{ ...tdS, color: '#e53e3e' }}>미확인</td>
                  <td style={{ ...tdS, color: '#aaa' }}>-</td>
                  <td style={{ ...tdS, color: '#e53e3e', fontSize: 11 }}>확인 대기 중</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 송달간주 정보 */}
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>&#9675; 송달간주 정보</div>
          <div style={{ background: '#f8f9fb', border: '1px solid #e0e4ec', borderRadius: 4, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, lineHeight: 2 }}>
              <span style={{ fontWeight: 600 }}>송달간주 예정일:</span> {deemedStr}
            </div>
            <div style={{ fontSize: 12, lineHeight: 2 }}>
              <span style={{ fontWeight: 600 }}>현재 상태:</span>{' '}
              <span style={{ color: status.color, fontWeight: 600 }}>{status.icon} {status.text}</span>
            </div>
          </div>

          {/* 안내문 */}
          <div style={{ fontSize: 11, color: '#666', lineHeight: 1.8, padding: '8px 0', borderTop: '1px solid #eee' }}>
            ※ 전자문서를 확인한 때 또는 전자문서 등재사실을 통지한 날부터 1주가 지난 날에 송달된 것으로 봅니다.<br />
            (민사소송 등에서의 전자문서 이용 등에 관한 법률 제11조 제4항)
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: '#f5f7fa', padding: '10px 20px', borderTop: '1px solid #d0d8e4', display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button style={{ height: 32, padding: '0 20px', background: '#fff', border: '1px solid #c8cdd6', borderRadius: 3, fontSize: 12, cursor: 'pointer' }}>출력</button>
          <button onClick={onClose} style={{ height: 32, padding: '0 20px', background: '#e0e4ec', border: 'none', borderRadius: 3, fontSize: 12, cursor: 'pointer' }}>닫기</button>
        </div>
      </div>
    </div>
  )
}
