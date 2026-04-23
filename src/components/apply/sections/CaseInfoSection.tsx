'use client'
import { useState } from 'react'
import { TEAL, INP as _INP, SEL as _SEL, TH as _TH, TD as _TD, COURTS } from '@/lib/constants'
import SecHd from '../shared/SecHd'
import RegModal from '../shared/RegModal'

const INP: React.CSSProperties = { ..._INP, padding: '0 7px', boxSizing: 'border-box' }
const SEL: React.CSSProperties = { ...INP, cursor: 'pointer' }
const TH: React.CSSProperties = { ..._TH, width: 120, padding: '9px 12px', fontWeight: 600, color: '#333', verticalAlign: 'middle', borderRight: '1px solid #e8edf4' }
const TD: React.CSSProperties = { ..._TD, padding: '7px 12px' }

const CASE_NAMES = [
  '가등기말소','강제집행에 관한 소송','건물','건물등철거','건물인도','건축에관한 소송',
  '계금','공사대금','공유물분쟁','공탁금 출급청구권 확인','관리비','광고대금','구상금',
  '근로에관한 소송','근저당권말소','기타(금전)','대여금','매매대금','매매대금반환',
  '손해배상(건)','손해배상(국)','손해배상(기)','손해배상(산)','손해배상(연)',
  '손해배상(의)','손해배상(자)','손해배상(지)','손해배상(직)','손해배상(체)','손해배상(환)',
  '수표,어음금','수표금','시효중단을 위한 재판상 청구 확인의 소','신용카드이용대금',
  '약정금','양수금','어음금','예금','용역비','운송료','위자료','유익비','유체동산도',
  '유치권 부존재 확인','임금','임대차보증금','임목','저당권설정등기','전부금','제3자이의',
  '증권','증권관련집단소송','집행문부여에 대한 이의의 소','집행문부여의 소','집행판결',
  '재권조사확정재판에 대한 이의의 소','채무부존재확인','청구이의','추심금',
  '토지','토지인도','해고무효확인','회사에 관한 소송','기타',
]

interface CaseInfoSectionProps {
  variant: 'complaint' | 'existing'
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  readOnly?: boolean
}

export default function CaseInfoSection({ variant, data, onChange, readOnly }: CaseInfoSectionProps) {
  const [open, setOpen] = useState(true)
  const [showRegModal, setShowRegModal] = useState(false)

  const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }
  const row: React.CSSProperties = { borderBottom: '1px solid #e8edf4' }

  return (
    <div style={{ border: '1px solid #c8cdd6', borderRadius: 2, marginBottom: 10, background: '#fff' }}>
      <SecHd label="사건정보" open={open} toggle={() => setOpen(!open)} />
      {open && (
        <div style={{ padding: '14px 16px' }}>
          {variant === 'complaint' ? (
            <table style={tbl}>
              <tbody>
                <tr style={row}>
                  <td style={TH}>사건명 <span style={{ color: '#e8173e' }}>*</span></td>
                  <td style={TD}>
                    <select style={{ ...SEL, width: 260 }} value={(data.caseName as string) || ''} onChange={e => onChange({ caseName: e.target.value })} disabled={readOnly}>
                      <option value="">선택</option>
                      {CASE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                </tr>
                <tr style={row}>
                  <td style={TH}>법원 <span style={{ color: '#e8173e' }}>*</span></td>
                  <td style={TD}>
                    <select style={{ ...SEL, width: 260 }} value={(data.court as string) || ''} onChange={e => onChange({ court: e.target.value })} disabled={readOnly}>
                      <option value="">선택</option>
                      {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                </tr>
                <tr style={row}>
                  <td style={TH}>청구구분 <span style={{ color: '#e8173e' }}>*</span></td>
                  <td style={TD}>
                    <label style={{ fontSize: 12, marginRight: 16, cursor: 'pointer' }}>
                      <input type="radio" name="claimType" value="재산권" checked={(data.claimType as string) === '재산권'} onChange={e => onChange({ claimType: e.target.value })} disabled={readOnly} /> 재산권
                    </label>
                    <label style={{ fontSize: 12, cursor: 'pointer' }}>
                      <input type="radio" name="claimType" value="비재산권" checked={(data.claimType as string) === '비재산권'} onChange={e => onChange({ claimType: e.target.value })} disabled={readOnly} /> 비재산권
                    </label>
                  </td>
                </tr>
                <tr style={row}>
                  <td style={TH}>소가구분 <span style={{ color: '#e8173e' }}>*</span></td>
                  <td style={TD}>
                    {['금액', '토지', '불능'].map(v => (
                      <label key={v} style={{ fontSize: 12, marginRight: 16, cursor: 'pointer' }}>
                        <input type="radio" name="sogaType" value={v} checked={(data.sogaType as string) === v} onChange={e => onChange({ sogaType: e.target.value })} disabled={readOnly} /> {v}
                      </label>
                    ))}
                  </td>
                </tr>
                <tr style={row}>
                  <td style={TH}>소가</td>
                  <td style={TD}>
                    <input type="text" style={{ ...INP, width: 200, textAlign: 'right' }} value={(data.soga as string) || ''} onChange={e => onChange({ soga: e.target.value.replace(/[^0-9]/g, '') })} readOnly={readOnly} />
                    <span style={{ fontSize: 12, marginLeft: 4 }}>원</span>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table style={tbl}>
              <tbody>
                <tr style={row}>
                  <td style={TH}>사건번호 <span style={{ color: '#e8173e' }}>*</span></td>
                  <td style={TD}>
                    <input type="text" style={{ ...INP, width: 200 }} value={(data.caseNo as string) || ''} onChange={e => onChange({ caseNo: e.target.value })} readOnly={readOnly} placeholder="예: 2026가합12345" />
                  </td>
                </tr>
                <tr style={row}>
                  <td style={TH}>법원 <span style={{ color: '#e8173e' }}>*</span></td>
                  <td style={TD}>
                    <select style={{ ...SEL, width: 260 }} value={(data.court as string) || ''} onChange={e => onChange({ court: e.target.value })} disabled={readOnly}>
                      <option value="">선택</option>
                      {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                </tr>
                <tr style={row}>
                  <td style={TH}>재판부</td>
                  <td style={TD}>
                    <input type="text" style={{ ...INP, width: 200 }} value={(data.division as string) || ''} onChange={e => onChange({ division: e.target.value })} readOnly={readOnly} />
                  </td>
                </tr>
                <tr style={row}>
                  <td style={TH}>사건명</td>
                  <td style={TD}>
                    <input type="text" style={{ ...INP, width: 260 }} value={(data.caseName as string) || ''} onChange={e => onChange({ caseName: e.target.value })} readOnly={readOnly} />
                  </td>
                </tr>
                <tr style={row}>
                  <td style={TH}>원고</td>
                  <td style={TD}>
                    <input type="text" style={{ ...INP, width: 200 }} value={(data.plaintiff as string) || ''} onChange={e => onChange({ plaintiff: e.target.value })} readOnly={readOnly} />
                  </td>
                </tr>
                <tr style={row}>
                  <td style={TH}>피고</td>
                  <td style={TD}>
                    <input type="text" style={{ ...INP, width: 200 }} value={(data.defendant as string) || ''} onChange={e => onChange({ defendant: e.target.value })} readOnly={readOnly} />
                  </td>
                </tr>
              </tbody>
            </table>
          )}
          <div style={{ textAlign: 'right', marginTop: 10 }}>
            <button onClick={() => setShowRegModal(true)} style={{ height: 30, padding: '0 20px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>등록</button>
          </div>
        </div>
      )}
      {showRegModal && <RegModal onClose={() => setShowRegModal(false)} />}
    </div>
  )
}
