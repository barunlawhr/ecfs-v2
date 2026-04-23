// ══════════════════════════════════════════════════════════════
//  민사 서류 7종 Config
// ══════════════════════════════════════════════════════════════

export type SectionType =
  | 'caseInfo'          // 사건기본정보
  | 'parties'           // 당사자
  | 'representative'    // 대리인
  | 'claimPurpose'      // 청구취지
  | 'claimReason'       // 청구원인
  | 'answerPurpose'     // 청구취지에 대한 답변
  | 'answerReason'      // 청구원인에 대한 답변
  | 'signatory'         // 서류명의인
  | 'content'           // 내용 (준비서면용)
  | 'evidence'          // 입증서류/입증방법
  | 'dateInfo'          // 기일정보 (기일변경용)
  | 'changeReason'      // 변경사유
  | 'correctionOrder'   // 보정명령내용
  | 'correctionContent' // 보정내용
  | 'appealPurpose'     // 항소취지
  | 'appealReason'      // 항소이유
  | 'originalJudgment'  // 원심판결정보
  | 'changePurpose'     // 변경 청구취지
  | 'addressCorrectionContent' // 주소보정 전용
  | 'attachments'       // 첨부서류

export interface DocumentConfig {
  title: string
  subtitle: string
  sections: SectionType[]
  hasCost: boolean
  hasEvidence: boolean
  /** 기본 서증 부호 */
  defaultPrefix: '갑' | '을' | '병'
  /** 사이드바 섹션 라벨 (sections 순서에 매칭) */
  sectionLabels: string[]
}

/** 섹션 타입 → 사이드바 표시 라벨 기본값 */
export const SECTION_LABELS: Record<SectionType, string> = {
  caseInfo: '사건기본정보',
  parties: '당사자',
  representative: '대리인',
  claimPurpose: '청구취지',
  claimReason: '청구원인',
  answerPurpose: '청구취지에 대한 답변',
  answerReason: '청구원인에 대한 답변',
  signatory: '서류명의인',
  content: '내용',
  evidence: '입증서류',
  dateInfo: '기일정보',
  changeReason: '변경사유',
  correctionOrder: '보정명령내용',
  correctionContent: '보정내용',
  appealPurpose: '항소취지',
  appealReason: '항소이유',
  originalJudgment: '원심판결정보',
  changePurpose: '변경 청구취지',
  addressCorrectionContent: '주소보정내용',
  attachments: '첨부서류',
}

export const DOCUMENT_CONFIGS: Record<string, DocumentConfig> = {
  complaint: {
    title: '소장',
    subtitle: '소장',
    sections: ['caseInfo', 'parties', 'representative', 'claimPurpose', 'claimReason', 'evidence', 'attachments'],
    sectionLabels: ['사건기본정보', '당사자', '대리인', '청구취지', '청구원인', '입증서류', '첨부서류'],
    hasCost: true,
    hasEvidence: true,
    defaultPrefix: '갑',
  },
  answer: {
    title: '답변서',
    subtitle: '답변서(청구취지/원인)',
    sections: ['caseInfo', 'answerPurpose', 'answerReason', 'signatory', 'evidence', 'attachments'],
    sectionLabels: ['사건기본정보', '청구취지에 대한 답변', '청구원인에 대한 답변', '서류명의인', '입증방법', '첨부서류'],
    hasCost: false,
    hasEvidence: true,
    defaultPrefix: '을',
  },
  brief: {
    title: '준비서면',
    subtitle: '준비서면',
    sections: ['caseInfo', 'signatory', 'content', 'evidence', 'attachments'],
    sectionLabels: ['사건기본정보', '서류명의인', '내용', '입증방법', '첨부서류'],
    hasCost: false,
    hasEvidence: true,
    defaultPrefix: '갑',
  },
  dateChange: {
    title: '기일변경신청서',
    subtitle: '기일변경신청서',
    sections: ['caseInfo', 'signatory', 'dateInfo', 'changeReason', 'attachments'],
    sectionLabels: ['사건기본정보', '서류명의인', '기일정보', '변경사유', '첨부서류'],
    hasCost: false,
    hasEvidence: false,
    defaultPrefix: '갑',
  },
  correction: {
    title: '보정서',
    subtitle: '보정서',
    sections: ['caseInfo', 'signatory', 'correctionOrder', 'correctionContent', 'evidence', 'attachments'],
    sectionLabels: ['사건기본정보', '서류명의인', '보정명령내용', '보정내용', '입증방법', '첨부서류'],
    hasCost: false,
    hasEvidence: true,
    defaultPrefix: '갑',
  },
  addressCorrection: {
    title: '주소보정서',
    subtitle: '주소보정서(특별송달,공시송달,일반송달신청)',
    sections: ['caseInfo', 'signatory', 'correctionOrder', 'addressCorrectionContent', 'attachments'],
    sectionLabels: ['사건기본정보', '서류명의인', '보정명령내용', '주소보정내용', '첨부서류'],
    hasCost: false,
    hasEvidence: false,
    defaultPrefix: '갑',
  },
  appeal: {
    title: '항소장',
    subtitle: '항소장',
    sections: ['caseInfo', 'parties', 'representative', 'originalJudgment', 'appealPurpose', 'appealReason', 'evidence', 'attachments'],
    sectionLabels: ['사건기본정보', '당사자', '대리인', '원심판결정보', '항소취지', '항소이유', '입증서류', '첨부서류'],
    hasCost: true,
    hasEvidence: true,
    defaultPrefix: '갑',
  },
  claimChange: {
    title: '청구취지 및 청구원인 변경신청서',
    subtitle: '청구취지 및 청구원인 변경신청서',
    sections: ['caseInfo', 'signatory', 'claimPurpose', 'changePurpose', 'changeReason', 'attachments'],
    sectionLabels: ['사건기본정보', '서류명의인', '기존 청구취지', '변경 청구취지', '변경이유', '첨부서류'],
    hasCost: false,
    hasEvidence: false,
    defaultPrefix: '갑',
  },
}

export type DocTypeKey = keyof typeof DOCUMENT_CONFIGS

export function getDocConfig(key: string): DocumentConfig | undefined {
  return DOCUMENT_CONFIGS[key]
}

export const DOC_TYPE_LIST = Object.entries(DOCUMENT_CONFIGS).map(([key, config]) => ({ key, ...config }))
