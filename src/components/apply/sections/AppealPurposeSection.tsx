'use client'
import RichTextSection from './RichTextSection'

interface AppealPurposeSectionProps {
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  readOnly?: boolean
}

export default function AppealPurposeSection({ data, onChange, readOnly }: AppealPurposeSectionProps) {
  return (
    <RichTextSection
      label="항소취지"
      fieldKey="appealPurpose"
      data={data}
      onChange={onChange}
      placeholder="항소취지를 입력하세요."
      showFileAttach
      readOnly={readOnly}
    />
  )
}
