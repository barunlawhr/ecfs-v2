export type UserRole = 'student' | 'admin'

export interface User {
  id: string
  name: string
  org: string
  role: UserRole
  barNum?: string       // 수임등록번호 앞자리
  barNum2?: string      // 수임등록번호 뒷자리
  zipCode?: string      // 우편번호
  addr?: string         // 도로명 주소
  addrDetail?: string   // 상세주소
  mobile?: string       // 휴대전화 (010-0000-0000)
  tel?: string          // 전화번호 (02-000-0000)
  fax?: string          // 팩스 (02-000-0000)
  email?: string
  subEmail?: string     // 보조이메일
}

export interface SampleCase {
  id: string
  title: string
  case_type: string
  court: string
  claim_amount?: number
  plaintiff: string
  defendant: string
  background?: string
  key_facts?: string
  evidence_hint?: string
  claim_purpose?: string
  claim_reason?: string
  difficulty?: string
  is_active?: boolean
  assigned_students?: string[]
  created_at: string
}

export interface Assignment {
  id: string
  case_id: string
  student_id: string
  assigned_at: string
  status?: string
  sample_cases?: SampleCase
}

export interface PracticeRecord {
  id: string
  student_id: string
  user_name?: string
  case_id?: string
  assignment_id?: string
  complaint_data?: ComplaintFormData
  doc_type?: 'complaint' | 'answer'
  score: number
  feedback?: string
  grade_breakdown?: GradeBreakdown
  case_type?: string
  court?: string
  plaintiff?: string
  defendant?: string
  has_agent?: boolean
  evidence_count?: number
  date_str?: string
  submitted_at?: string
  graded_at?: string
  created_at: string
}

export interface Party {
  id: string
  role: '원고' | '피고'
  name: string
  addr: string
  tel?: string
  isCompany?: boolean
}

export interface Evidence {
  id: string
  number: string
  name: string
  purpose: string
}

export interface ComplaintFormData {
  // 문서 유형
  doc_type?: 'complaint' | 'answer'
  // 사건기본정보
  caseCategory: string
  caseName: string
  court: string
  claimType: string
  sogaType: string
  soga: string
  // 당사자
  parties: Party[]
  // 소장/답변서 본문
  claimPurpose: string  // 소장: 청구취지 / 답변서: 답변 취지
  claimCause: string    // 소장: 청구원인 / 답변서: 답변 이유
  // 대리인
  hasAgent: boolean
  agentType?: string
  agentName?: string
  // 입증서류
  evidences: Evidence[]
}

export interface GradeBreakdown {
  parties: number
  claim: number
  cause: number
  evidence: number
}

export interface GradeResult {
  score: number
  feedback: string
  breakdown: GradeBreakdown
}

/** 통합 서류 작성 폼 데이터 (모든 서류 유형의 슈퍼셋) */
export interface DocumentFormData {
  // 사건기본정보 (공통)
  caseNo: string
  court: string
  division: string
  caseName: string
  caseCategory: string
  plaintiff: string
  defendant: string
  // 소장 전용
  claimType: string       // 재산권/비재산권
  sogaType: string        // 금액/토지/불능
  soga: string            // 소가
  // 당사자
  parties: Party[]
  // 대리인
  hasAgent: boolean
  agentType?: string
  agentName?: string
  // 청구취지/원인
  claimPurpose: string
  claimReason: string
  // 답변서
  answerPurpose: string
  answerReason: string
  // 준비서면
  content: string
  // 서류명의인
  docOwners: { id: string; type: string; name: string; userId: string }[]
  // 입증서류
  evidences: Evidence[]
  // 기일변경
  currentHearingDate: string
  currentHearingPlace: string
  changeReasonType: string
  changeReasonDetail: string
  preferredDate1: string
  preferredDate2: string
  // 보정서
  correctionOrderNo: string
  correctionOrderDate: string
  correctionDeadline: string
  correctionOrderContent: string
  correctionContent: string
  // 항소장
  originalCourt: string
  originalCaseNo: string
  judgmentDate: string
  judgmentContent: string
  appealPurpose: string
  appealReason: string
  // 청구취지변경
  previousClaimPurpose: string
  newClaimPurpose: string
  changeReason: string
}

/** DocumentFormData 초기값 */
export const EMPTY_DOC_FORM: DocumentFormData = {
  caseNo: '', court: '', division: '', caseName: '', caseCategory: '',
  plaintiff: '', defendant: '',
  claimType: '재산권', sogaType: '금액', soga: '',
  parties: [], hasAgent: false, agentType: undefined, agentName: undefined,
  claimPurpose: '', claimReason: '',
  answerPurpose: '', answerReason: '',
  content: '',
  docOwners: [],
  evidences: [],
  currentHearingDate: '', currentHearingPlace: '',
  changeReasonType: '', changeReasonDetail: '',
  preferredDate1: '', preferredDate2: '',
  correctionOrderNo: '', correctionOrderDate: '', correctionDeadline: '',
  correctionOrderContent: '', correctionContent: '',
  originalCourt: '', originalCaseNo: '', judgmentDate: '', judgmentContent: '',
  appealPurpose: '', appealReason: '',
  previousClaimPurpose: '', newClaimPurpose: '', changeReason: '',
}
