'use client'
import { useState } from 'react'
import { TEAL, TH as _TH, TD as _TD, INP } from '@/lib/constants'
import RegModal from '../shared/RegModal'

const TH: React.CSSProperties = { ..._TH, width: 120, padding: '9px 12px', fontWeight: 600, color: '#333', verticalAlign: 'middle', borderRight: '1px solid #e8edf4' }
const TD: React.CSSProperties = { ..._TD, padding: '7px 12px' }

interface AddressCorrectionContentSectionProps {
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  readOnly?: boolean
}

type DeliveryMethod = 'special' | 'public' | 'normal'
type SpecialSubMethod = 'delivery' | 'retention' | 'supplement' | 'mailbox'
type PublicResidentStatus = 'cancelled' | 'unknown' | 'other'

export default function AddressCorrectionContentSection({ data, onChange }: AddressCorrectionContentSectionProps) {
  const deliveryMethod = (data.deliveryMethod as DeliveryMethod) || 'special'
  const specialPlace = (data.specialPlace as string) || ''
  const specialSubMethod = (data.specialSubMethod as SpecialSubMethod) || 'delivery'
  const publicReason = (data.publicReason as string) || ''
  const publicResidentStatus = (data.publicResidentStatus as PublicResidentStatus) || 'cancelled'
  const changedAddress = (data.changedAddress as string) || ''

  const [showRegModal, setShowRegModal] = useState(false)

  const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d8e4', fontSize: 12 }
  const row: React.CSSProperties = { borderBottom: '1px solid #e8edf4' }

  const radio = (name: string, value: string, checked: boolean, label: string, field: string) => (
    <label key={value} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 16, fontSize: 12, cursor: 'pointer' }}>
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange({ [field]: value })} style={{ accentColor: TEAL }} />
      {label}
    </label>
  )

  return (
    <div>
      <table style={tbl}>
        <tbody>
          {/* 송달방법 선택 */}
          <tr style={row}>
            <th style={TH}>송달방법</th>
            <td style={TD}>
              {radio('deliveryMethod', 'special', deliveryMethod === 'special', '특별송달', 'deliveryMethod')}
              {radio('deliveryMethod', 'public', deliveryMethod === 'public', '공시송달', 'deliveryMethod')}
              {radio('deliveryMethod', 'normal', deliveryMethod === 'normal', '일반송달', 'deliveryMethod')}
            </td>
          </tr>

          {/* 특별송달 */}
          {deliveryMethod === 'special' && (
            <>
              <tr style={row}>
                <th style={TH}>송달장소</th>
                <td style={TD}>
                  <input
                    type="text"
                    value={specialPlace}
                    onChange={e => onChange({ specialPlace: e.target.value })}
                    placeholder="송달장소를 입력하세요"
                    style={{ ...INP, width: '100%' }}
                  />
                </td>
              </tr>
              <tr style={row}>
                <th style={TH}>송달방법</th>
                <td style={TD}>
                  {radio('specialSub', 'delivery', specialSubMethod === 'delivery', '교부송달', 'specialSubMethod')}
                  {radio('specialSub', 'retention', specialSubMethod === 'retention', '유치송달', 'specialSubMethod')}
                  {radio('specialSub', 'supplement', specialSubMethod === 'supplement', '보충송달', 'specialSubMethod')}
                  {radio('specialSub', 'mailbox', specialSubMethod === 'mailbox', '우편함투입', 'specialSubMethod')}
                </td>
              </tr>
            </>
          )}

          {/* 공시송달 */}
          {deliveryMethod === 'public' && (
            <>
              <tr style={row}>
                <th style={TH}>공시송달사유</th>
                <td style={TD}>
                  <textarea
                    value={publicReason}
                    onChange={e => onChange({ publicReason: e.target.value })}
                    placeholder="공시송달 사유를 입력하세요"
                    style={{ ...INP, height: 80, width: '100%', padding: '6px 8px', resize: 'vertical' }}
                  />
                </td>
              </tr>
              <tr style={row}>
                <th style={TH}>주민등록상태</th>
                <td style={TD}>
                  {radio('publicResident', 'cancelled', publicResidentStatus === 'cancelled', '말소', 'publicResidentStatus')}
                  {radio('publicResident', 'unknown', publicResidentStatus === 'unknown', '불명', 'publicResidentStatus')}
                  {radio('publicResident', 'other', publicResidentStatus === 'other', '기타', 'publicResidentStatus')}
                </td>
              </tr>
            </>
          )}

          {/* 일반송달 */}
          {deliveryMethod === 'normal' && (
            <tr style={row}>
              <th style={TH}>변경주소</th>
              <td style={TD}>
                <input
                  type="text"
                  value={changedAddress}
                  onChange={e => onChange({ changedAddress: e.target.value })}
                  placeholder="변경된 주소를 입력하세요"
                  style={{ ...INP, width: '100%' }}
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ textAlign: 'right', marginTop: 10 }}>
        <button onClick={() => setShowRegModal(true)} style={{ height: 30, padding: '0 20px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>등록</button>
      </div>
      {showRegModal && <RegModal onClose={() => setShowRegModal(false)} />}
    </div>
  )
}
