'use client'
import { TEAL, NAVY } from '@/lib/constants'

export default function RegModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: 340, borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.3)' }}>
        <div style={{ background: NAVY, color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>설명</div>
        <div style={{ padding: '30px 20px', textAlign: 'center', fontSize: 13, color: '#333' }}>등록되었습니다.</div>
        <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
          <button onClick={onClose} style={{ height: 32, padding: '0 32px', background: TEAL, color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>확인</button>
        </div>
      </div>
    </div>
  )
}
