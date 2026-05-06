import type { ComplaintFormData } from '@/types'

export interface ValidationError {
  field: string
  label: string
  message: string
}

/**
 * 소장 필수 필드 검증
 */
export function validateComplaint(data: ComplaintFormData): ValidationError[] {
  const errors: ValidationError[] = []

  if (!data.court?.trim())
    errors.push({ field: 'court', label: '법원', message: '법원을 선택해주세요.' })

  if (!data.parties || data.parties.length === 0)
    errors.push({ field: 'parties', label: '당사자', message: '최소 1명의 당사자를 추가해주세요.' })

  if (data.parties?.length > 0 && !data.parties.some(p => p.role === '원고'))
    errors.push({ field: 'plaintiff', label: '원고', message: '원고를 추가해주세요.' })

  if (data.parties?.length > 0 && !data.parties.some(p => p.role === '피고'))
    errors.push({ field: 'defendant', label: '피고', message: '피고를 추가해주세요.' })

  if (!data.claimPurpose?.trim())
    errors.push({ field: 'claimPurpose', label: '청구취지', message: '청구취지를 입력해주세요.' })

  if (!data.claimCause?.trim())
    errors.push({ field: 'claimCause', label: '청구원인', message: '청구원인을 입력해주세요.' })

  const soga = parseFloat(data.soga)
  if (!data.soga || isNaN(soga) || soga <= 0)
    errors.push({ field: 'soga', label: '소가', message: '소가를 0보다 큰 금액으로 입력해주세요.' })

  return errors
}

/**
 * 답변서 필수 필드 검증
 */
export function validateAnswer(data: ComplaintFormData): ValidationError[] {
  const errors: ValidationError[] = []

  if (!data.court?.trim())
    errors.push({ field: 'court', label: '법원', message: '법원을 선택해주세요.' })

  if (!data.claimPurpose?.trim())
    errors.push({ field: 'claimPurpose', label: '청구취지에 대한 답변', message: '청구취지에 대한 답변을 입력해주세요.' })

  if (!data.claimCause?.trim())
    errors.push({ field: 'claimCause', label: '청구원인에 대한 답변', message: '청구원인에 대한 답변을 입력해주세요.' })

  return errors
}

/**
 * 검증 에러를 사용자 메시지로 변환
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(e => `• ${e.label}: ${e.message}`).join('\n')
}

/**
 * 서버사이드 검증 (API route에서 사용)
 */
export function validateFormDataServer(data: Record<string, unknown>, docType: string): string | null {
  if (!data) return '폼 데이터가 없습니다.'

  if (docType === 'complaint') {
    if (!data.court) return '법원이 선택되지 않았습니다.'
    if (!data.claimPurpose) return '청구취지가 입력되지 않았습니다.'
    if (!data.claimCause) return '청구원인이 입력되지 않았습니다.'
    const parties = data.parties as { role: string }[] | undefined
    if (!parties?.length) return '당사자 정보가 없습니다.'
  }

  if (docType === 'answer') {
    if (!data.court) return '법원이 선택되지 않았습니다.'
    if (!data.claimPurpose) return '청구취지에 대한 답변이 입력되지 않았습니다.'
  }

  return null
}
