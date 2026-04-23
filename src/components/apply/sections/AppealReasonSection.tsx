'use client'
import RichTextSection from './RichTextSection'

interface AppealReasonSectionProps {
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  readOnly?: boolean
}

export default function AppealReasonSection({ data, onChange, readOnly }: AppealReasonSectionProps) {
  return (
    <RichTextSection
      label="항소이유"
      fieldKey="appealReason"
      data={data}
      onChange={onChange}
      placeholder="항소이유를 입력하세요."
      showFileAttach
      readOnly={readOnly}
    />
  )
}
