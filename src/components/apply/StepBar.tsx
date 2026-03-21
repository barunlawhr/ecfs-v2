'use client'

const STEPS = ['전자소송동의', '당사자정보', '소장작성', '입증서류', '납부/제출']

interface StepBarProps {
  step: number // 0-4
}

export default function StepBar({ step }: StepBarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0 32px' }}>
      {STEPS.map((label, i) => {
        const isDone = i < step
        const isActive = i === step
        const isPending = i > step

        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Step node */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  backgroundColor: isDone ? '#1e3a5f' : isActive ? '#fff' : '#e5e7eb',
                  color: isDone ? '#fff' : isActive ? '#1e3a5f' : '#9ca3af',
                  border: isActive ? '2px solid #1e3a5f' : isDone ? 'none' : '2px solid #d1d5db',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#1e3a5f' : isDone ? '#6b7280' : '#9ca3af',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 60,
                  height: 2,
                  backgroundColor: i < step ? '#1e3a5f' : '#e5e7eb',
                  marginBottom: 18,
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
