'use client'
import RichTextSection from './RichTextSection'

interface CorrectionContentSectionProps {
  data: Record<string, unknown>
  onChange: (updates: Record<string, unknown>) => void
  readOnly?: boolean
}

export default function CorrectionContentSection({ data, onChange, readOnly }: CorrectionContentSectionProps) {
  return (
    <RichTextSection
      label="보정내용"
      fieldKey="correctionContent"
      data={data}
      onChange={onChange}
      placeholder="보정내용을 입력하세요."
      showFileAttach
      readOnly={readOnly}
    />
  )
}
