'use client'

import { useState } from 'react'

export interface CaseInfo {
  case_number: string
  case_name?: string
  court?: string
  division?: string
  plaintiff?: string
  defendant?: string
  court_phone?: string
  reception_date?: string
  plaintiff_amount?: number
  defendant_amount?: number
  reception_type?: string
  merger_type?: string
  stamp_amount?: number
  appeal_history?: { court: string; case_number: string; result: string }[]
  progress_history?: { date: string; event: string }[]
}

const TEAL = '#00897b'

const thC: React.CSSProperties = { background: '#f5f7fb', padding: '10px 12px', fontSize: 12, color: '#555', fontWeight: 600, borderRight: '1px solid #d0d8e4', borderBottom: '1px solid #d0d8e4', width: '15%', textAlign: 'left', whiteSpace: 'nowrap' }
const tdC: React.CSSProperties = { padding: '10px 12px', fontSize: 13, color: '#222', borderRight: '1px solid #d0d8e4', borderBottom: '1px solid #d0d8e4' }

export default function CaseDetailModal({ caseInfo, onClose }: { caseInfo: CaseInfo; onClose: () => void }) {
  const [tab, setTab] = useState<'general' | 'progress'>('general')
  const c = caseInfo

  const fmtAmt = (n?: number) => n != null && n > 0 ? n.toLocaleString('ko-KR') + '원' : ''

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', width: 900, maxWidth: '95vw', maxHeight: '85vh', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,.3)' }}>

        {/* 브라우저 윈도우 헤더 */}
        <div style={{ background: '#f0f2f5', padding: '6px 12px', borderBottom: '1px solid #d0d4dc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#444' }}>
            <span style={{ fontSize: 14 }}>&#128269;</span>
            <span>나의 사건검색 | {tab === 'general' ? '일반내용' : '진행내용'}</span>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            <button style={{ width: 28, height: 22, border: 'none', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#666' }}>&#9620;</button>
            <button style={{ width: 28, height: 22, border: 'none', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#666' }}>&#9723;</button>
            <button onClick={onClose} style={{ width: 28, height: 22, border: 'none', background: 'transparent', fontSize: 15, cursor: 'pointer', color: '#666' }}>&times;</button>
          </div>
        </div>

        {/* URL 박스 */}
        <div style={{ background: '#fff', padding: '5px 12px', borderBottom: '1px solid #e5e8ee', fontSize: 11, color: '#666', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#555' }}>&#128274;</span>
          <span>https://ssgo.scourt.go.kr/ssgo/srchCsDetail.on</span>
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#fff' }}>

          {/* 알림 박스 */}
          <div style={{ background: '#f0f9ff', border: '1px solid #b6d8f0', borderRadius: 4, padding: '12px 16px', marginBottom: 16, fontSize: 11, color: '#1a5276', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 12 }}>대법원 전자소송</div>
            <div>&#8226; 본 사이트에서 제공된 사건정보는 법적인 효력이 없으니, 참고자료로만 활용하시기 바랍니다.</div>
            <div>&#8226; 민사, 특허 등 전자소송으로 진행되는 사건에 대해서는 대한민국법원 전자소송포털을 이용하시면 판결문이나 사건기록을 모두 인터넷으로 보실 수 있습니다.</div>
          </div>

          {/* 탭 + 청사배치 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setTab('general')} style={{ height: 30, padding: '0 20px', borderRadius: 4, border: tab === 'general' ? 'none' : '1px solid #c8cdd6', background: tab === 'general' ? TEAL : '#fff', color: tab === 'general' ? '#fff' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {tab === 'general' ? '● ' : '○ '}일반내용
              </button>
              <button onClick={() => setTab('progress')} style={{ height: 30, padding: '0 20px', borderRadius: 4, border: tab === 'progress' ? 'none' : '1px solid #c8cdd6', background: tab === 'progress' ? TEAL : '#fff', color: tab === 'progress' ? '#fff' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {tab === 'progress' ? '● ' : '○ '}진행내용
              </button>
            </div>
            <button style={{ height: 28, padding: '0 12px', border: '1px solid #c8cdd6', borderRadius: 3, background: '#fff', fontSize: 11, cursor: 'pointer', color: '#555' }}>청사배치</button>
          </div>

          {tab === 'general' ? (
            <>
              {/* 기본내용 */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>&#9675; 기본내용 ({c.court || '-'})</span>
                  <button style={{ height: 24, padding: '0 10px', border: '1px solid #c8cdd6', borderRadius: 3, background: '#fff', fontSize: 11, cursor: 'pointer', color: '#555' }}>인쇄</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                  <tbody>
                    <tr>
                      <th style={thC}>사건번호</th>
                      <td style={tdC}>{c.case_number}</td>
                      <th style={thC}>사건명</th>
                      <td style={{ ...tdC, borderRight: 'none' }}>
                        {c.case_name && <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700, marginRight: 6 }}>전자</span>}
                        {c.case_name || '-'}
                      </td>
                    </tr>
                    <tr>
                      <th style={thC}>원고</th>
                      <td style={tdC}>{c.plaintiff || '-'}</td>
                      <th style={thC}>피고</th>
                      <td style={{ ...tdC, borderRight: 'none' }}>{c.defendant || '-'}</td>
                    </tr>
                    <tr>
                      <th style={thC}>재판부</th>
                      <td colSpan={3} style={{ ...tdC, borderRight: 'none' }}>{c.division || '-'}{c.court_phone ? ` (${c.court_phone})` : ''}</td>
                    </tr>
                    <tr>
                      <th style={thC}>접수일</th>
                      <td style={tdC}>{c.reception_date || '-'}</td>
                      <th style={thC}>종국결과</th>
                      <td style={{ ...tdC, borderRight: 'none' }}></td>
                    </tr>
                    <tr>
                      <th style={thC}>원고소가</th>
                      <td style={tdC}>{fmtAmt(c.plaintiff_amount)}</td>
                      <th style={thC}>피고소가</th>
                      <td style={{ ...tdC, borderRight: 'none' }}>{fmtAmt(c.defendant_amount)}</td>
                    </tr>
                    <tr>
                      <th style={thC}>수리구분</th>
                      <td style={tdC}>{c.reception_type || '제소'}</td>
                      <th style={thC}>병합구분</th>
                      <td style={{ ...tdC, borderRight: 'none' }}>{c.merger_type || '없음'}</td>
                    </tr>
                    <tr>
                      <th style={thC}>상소인</th>
                      <td style={tdC}></td>
                      <th style={thC}>상소일</th>
                      <td style={{ ...tdC, borderRight: 'none' }}></td>
                    </tr>
                    <tr>
                      <th style={thC}>상소각하일</th>
                      <td colSpan={3} style={{ ...tdC, borderRight: 'none' }}></td>
                    </tr>
                    <tr>
                      <th style={thC}>인지액</th>
                      <td colSpan={3} style={{ ...tdC, borderRight: 'none' }}>{fmtAmt(c.stamp_amount)}</td>
                    </tr>
                    <tr>
                      <th style={{ ...thC, lineHeight: 1.6 }}>송달료,보관금,<br/>종결에 따른<br/>잔액조회</th>
                      <td colSpan={3} style={{ ...tdC, borderRight: 'none', color: '#888', fontSize: 11, lineHeight: 1.7 }}>
                        사건이 종결되고 송달료 종결 혹은 보관금계좌가 종결된 경우에만 조회 가능합니다.
                      </td>
                    </tr>
                    <tr>
                      <th style={thC}>판결도달일</th>
                      <td style={tdC}></td>
                      <th style={thC}>확정일</th>
                      <td style={{ ...tdC, borderRight: 'none' }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 심급내용 */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 8 }}>&#9675; 심급내용</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                  <thead>
                    <tr style={{ background: '#f5f7fb' }}>
                      {['법원', '사건번호', '결과'].map(h => <th key={h} style={{ ...thC, textAlign: 'center' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(!c.appeal_history || c.appeal_history.length === 0) ? (
                      <tr><td colSpan={3} style={{ ...tdC, textAlign: 'center', color: '#999', padding: 16, borderRight: 'none' }}>심급내용 없음</td></tr>
                    ) : c.appeal_history.map((a, i) => (
                      <tr key={i}>
                        <td style={{ ...tdC, textAlign: 'center' }}>{a.court}</td>
                        <td style={{ ...tdC, textAlign: 'center', color: '#0067c2', textDecoration: 'underline', cursor: 'pointer' }}>{a.case_number}</td>
                        <td style={{ ...tdC, textAlign: 'center', borderRight: 'none' }}>{a.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* 진행내용 탭 */
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 8 }}>&#9675; 진행내용 ({c.court || '-'})</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4' }}>
                <thead>
                  <tr style={{ background: '#f5f7fb' }}>
                    <th style={{ ...thC, textAlign: 'center', width: '20%' }}>일자</th>
                    <th style={{ ...thC, textAlign: 'center', borderRight: 'none' }}>진행내용</th>
                  </tr>
                </thead>
                <tbody>
                  {(!c.progress_history || c.progress_history.length === 0) ? (
                    <tr><td colSpan={2} style={{ ...tdC, textAlign: 'center', color: '#999', padding: 16, borderRight: 'none' }}>진행내용이 없습니다</td></tr>
                  ) : c.progress_history.map((p, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfe' }}>
                      <td style={{ ...tdC, textAlign: 'center' }}>{p.date}</td>
                      <td style={{ ...tdC, borderRight: 'none' }}>{p.event}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
