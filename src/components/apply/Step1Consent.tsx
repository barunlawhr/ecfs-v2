'use client'

import { useState } from 'react'

interface Step1ConsentProps {
  onNext: () => void
  onCancel: () => void
}

export default function Step1Consent({ onNext, onCancel }: Step1ConsentProps) {
  const [agreed, setAgreed] = useState(false)

  return (
    <div>
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-ttl">전자소송 동의</span>
        </div>

        {/* Info box */}
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            padding: '20px 24px',
            marginBottom: 24,
            lineHeight: 1.8,
          }}
        >
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#1e40af' }}>
            <strong>전자소송시스템 이용 동의에 관한 안내</strong>
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 14, color: '#1e3a8a' }}>
            전자소송시스템을 통해 소장을 제출하면, 해당 사건의 모든 소송서류는 전자적 방법으로 제출·송달됩니다.
            전자소송에 동의하신 경우 법원으로부터의 각종 서류는 전자적 방법(이메일 등)으로 송달되며, 종이
            서류는 별도로 발송되지 않습니다.
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 14, color: '#1e3a8a' }}>
            전자소송시스템 이용에 동의하신 후에도 법원의 허가를 받아 동의를 철회하거나 종이 서류 제출로
            전환할 수 있습니다. 단, 이미 전자적으로 처리된 절차는 소급하여 변경되지 않습니다.
          </p>
          <p style={{ margin: 0, fontSize: 14, color: '#1e3a8a' }}>
            전자소송에 동의하지 않으시더라도 이 화면에서 소장 작성을 계속할 수 있으나, 최종 제출 시 출력 후
            법원에 직접 제출하는 방식으로 안내됩니다. 전자소송 이용 여부를 신중히 결정하시기 바랍니다.
          </p>
        </div>

        {/* Checkbox */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 20px',
            border: `1.5px solid ${agreed ? '#1e3a5f' : '#d1d5db'}`,
            borderRadius: 8,
            cursor: 'pointer',
            backgroundColor: agreed ? '#f0f4f9' : '#fff',
            transition: 'all 0.15s',
            marginBottom: 32,
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: '#1e3a5f', cursor: 'pointer', flexShrink: 0 }}
          />
          <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
            이 사건에 관하여 전자소송시스템을 이용한 진행에 동의합니다.
          </span>
        </label>

        {/* Button row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-gray" onClick={onCancel}>
            취소
          </button>
          <button
            className="btn-gray"
            onClick={() => alert('서식파일 업로드 기능은 준비 중입니다.')}
            style={{ marginLeft: 'auto' }}
          >
            서식파일 업로드
          </button>
          <button
            className="btn-gray"
            onClick={() => alert('대리인 작성 기능은 준비 중입니다.')}
          >
            대리인작성
          </button>
          <button
            className="btn-navy"
            onClick={onNext}
            disabled={!agreed}
            style={{ opacity: agreed ? 1 : 0.4, cursor: agreed ? 'pointer' : 'not-allowed' }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
