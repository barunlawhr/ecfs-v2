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
