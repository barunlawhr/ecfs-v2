// ══════════════════════════════════════════════════════════════
//  서류 유형 정의 (Document Type Configuration)
// ══════════════════════════════════════════════════════════════

export interface DocumentSection {
  key: string
  label: string
  required: boolean
}

export interface DocumentType {
  key: string
  label: string
  labelShort: string
  sections: DocumentSection[]
  hasCost: boolean
  defaultEvidencePrefix: '갑' | '을' | '병'
  description: string
}

// ── 서류 유형별 섹션 정의 ──

const SEC_CASE_INFO: DocumentSection = { key: 'caseInfo', label: '사건기본정보', required: true }
const SEC_PARTIES: DocumentSection = { key: 'parties', label: '당사자', required: true }
const SEC_AGENT: DocumentSection = { key: 'agent', label: '대리인', required: false }
const SEC_DOC_OWNER: DocumentSection = { key: 'docOwner', label: '서류명의인', required: true }
const SEC_CLAIM_PURPOSE: DocumentSection = { key: 'claimPurpose', label: '청구취지', required: true }
const SEC_CLAIM_CAUSE: DocumentSection = { key: 'claimCause', label: '청구원인', required: true }
const SEC_ANSWER_PURPOSE: DocumentSection = { key: 'answerPurpose', label: '청구취지에 대한 답변', required: true }
const SEC_ANSWER_CAUSE: DocumentSection = { key: 'answerCause', label: '청구원인에 대한 답변', required: true }
const SEC_CONTENT: DocumentSection = { key: 'content', label: '내용', required: true }
const SEC_CHANGE_REASON: DocumentSection = { key: 'changeReason', label: '변경사유', required: true }
const SEC_CORRECTION: DocumentSection = { key: 'correction', label: '보정내용', required: true }
const SEC_APPEAL_PURPOSE: DocumentSection = { key: 'appealPurpose', label: '항소취지', required: true }
const SEC_APPEAL_REASON: DocumentSection = { key: 'appealReason', label: '항소이유', required: true }
const SEC_EVIDENCE: DocumentSection = { key: 'evidence', label: '입증서류', required: false }
const SEC_EVIDENCE_METHOD: DocumentSection = { key: 'evidenceMethod', label: '입증방법', required: false }
const SEC_ATTACHMENT: DocumentSection = { key: 'attachment', label: '첨부서류', required: false }

// ── 서류 유형 정의 ──

export const DOCUMENT_TYPES: Record<string, DocumentType> = {
  complaint: {
    key: 'complaint',
    label: '소장',
    labelShort: '소장',
    sections: [SEC_CASE_INFO, SEC_PARTIES, SEC_AGENT, SEC_CLAIM_PURPOSE, SEC_CLAIM_CAUSE, SEC_EVIDENCE, SEC_ATTACHMENT],
    hasCost: true,
    defaultEvidencePrefix: '갑',
    description: '민사소송을 제기하는 최초 서류',
  },
  answer: {
    key: 'answer',
    label: '답변서(청구취지/원인)',
    labelShort: '답변서',
    sections: [SEC_CASE_INFO, SEC_ANSWER_PURPOSE, SEC_ANSWER_CAUSE, SEC_DOC_OWNER, SEC_EVIDENCE_METHOD, SEC_ATTACHMENT],
    hasCost: false,
    defaultEvidencePrefix: '을',
    description: '소장에 대한 피고측 답변 서류',
  },
  brief: {
    key: 'brief',
    label: '준비서면',
    labelShort: '준비서면',
    sections: [SEC_CASE_INFO, SEC_DOC_OWNER, SEC_CONTENT, SEC_EVIDENCE_METHOD, SEC_ATTACHMENT],
    hasCost: false,
    defaultEvidencePrefix: '갑',
    description: '변론기일 전 주장과 증거를 정리하는 서류',
  },
  dateChange: {
    key: 'dateChange',
    label: '기일변경신청서',
    labelShort: '기일변경',
    sections: [SEC_CASE_INFO, SEC_DOC_OWNER, SEC_CHANGE_REASON, SEC_ATTACHMENT],
    hasCost: false,
    defaultEvidencePrefix: '갑',
    description: '변론기일 변경을 신청하는 서류',
  },
  correction: {
    key: 'correction',
    label: '보정서',
    labelShort: '보정서',
    sections: [SEC_CASE_INFO, SEC_DOC_OWNER, SEC_CORRECTION, SEC_ATTACHMENT],
    hasCost: false,
    defaultEvidencePrefix: '갑',
    description: '법원의 보정명령에 따라 제출하는 서류',
  },
  appeal: {
    key: 'appeal',
    label: '항소장',
    labelShort: '항소장',
    sections: [SEC_CASE_INFO, SEC_PARTIES, SEC_AGENT, SEC_APPEAL_PURPOSE, SEC_APPEAL_REASON, SEC_ATTACHMENT],
    hasCost: true,
    defaultEvidencePrefix: '갑',
    description: '1심 판결에 불복하여 항소하는 서류',
  },
}

/** 서류 유형 키 목록 */
export type DocTypeKey = keyof typeof DOCUMENT_TYPES

/** 서류 유형 목록 (배열) */
export const DOCUMENT_TYPE_LIST = Object.values(DOCUMENT_TYPES)

/** 서류 유형 키로 조회 */
export function getDocumentType(key: string): DocumentType | undefined {
  return DOCUMENT_TYPES[key]
}
