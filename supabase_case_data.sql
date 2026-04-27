-- ═══════════════════════════════════════════
-- practice_cases 컬럼 추가
-- ═══════════════════════════════════════════
ALTER TABLE practice_cases ADD COLUMN IF NOT EXISTS assignment_type text DEFAULT 'both';
ALTER TABLE practice_cases ADD COLUMN IF NOT EXISTS sample_claim_purpose text DEFAULT '';
ALTER TABLE practice_cases ADD COLUMN IF NOT EXISTS sample_claim_reason text DEFAULT '';
ALTER TABLE practice_cases ADD COLUMN IF NOT EXISTS sample_answer_purpose text DEFAULT '';
ALTER TABLE practice_cases ADD COLUMN IF NOT EXISTS sample_answer_reason text DEFAULT '';
ALTER TABLE practice_cases ADD COLUMN IF NOT EXISTS case_facts text DEFAULT '';
ALTER TABLE practice_cases ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'basic';

-- case_assignments 컬럼 추가
ALTER TABLE case_assignments ADD COLUMN IF NOT EXISTS doc_type text DEFAULT 'complaint';

-- ═══════════════════════════════════════════
-- 실습 사건 5건 삽입
-- ═══════════════════════════════════════════

-- ① 소장 작성용 (대여금)
INSERT INTO practice_cases (
  case_number, case_type, case_name, court, division,
  plaintiff, defendant, assignment_type, difficulty,
  case_facts, sample_claim_purpose, sample_claim_reason, is_active
) VALUES (
  '2026가소100001', 'civil', '대여금', '서울중앙지방법원', '민사단독',
  '김한국', '이민준', 'complaint_only', 'basic',
  '의뢰인 김한국은 2024. 3. 1. 지인 이민준에게 금 3,000만 원을 변제기 2024. 9. 1., 이자 월 1%로 정하여 대여하였습니다. 이민준은 변제기가 지났음에도 원금 및 이자를 지급하지 않고 있으며, 수차례 독촉에도 불응하고 있습니다. 이에 대여금 및 이자 지급을 구하는 소를 제기하고자 합니다.',
  '1. 피고는 원고에게 금 30,000,000원 및 이에 대하여 2024. 9. 2.부터 이 사건 소장 부본 송달일까지는 연 12%의, 그 다음날부터 다 갚는 날까지는 연 12%의 각 비율에 의한 금원을 지급하라.
2. 소송비용은 피고가 부담한다.
3. 제1항은 가집행할 수 있다.
라는 판결을 구합니다.',
  '1. 당사자 관계
원고 김한국과 피고 이민준은 대학교 동기 사이입니다.

2. 대여 사실
원고는 2024. 3. 1. 피고에게 아래와 같은 조건으로 금 30,000,000원을 대여하였습니다.
- 대여금액: 금 30,000,000원
- 변제기: 2024. 9. 1.
- 이자: 월 1% (연 12%)
- 위 대여 사실은 갑 제1호증(차용증)으로 확인됩니다.

3. 변제 요구 및 불이행
피고는 변제기인 2024. 9. 1.이 도과하였음에도 현재까지 원금 및 이자를 전혀 지급하지 아니하고 있습니다. 원고는 2024. 10. 15. 피고에게 내용증명을 발송하였으나(갑 제2호증), 피고는 이에 응하지 아니하였습니다.

4. 결론
이에 원고는 피고에 대하여 대여금 30,000,000원 및 이에 대한 지연손해금의 지급을 구하기 위하여 이 사건 청구에 이르렀습니다.',
  true
);

-- ② 소장 작성용 (손해배상 - 교통사고)
INSERT INTO practice_cases (
  case_number, case_type, case_name, court, division,
  plaintiff, defendant, assignment_type, difficulty,
  case_facts, sample_claim_purpose, sample_claim_reason, is_active
) VALUES (
  '2026가단100002', 'civil', '손해배상(자)', '수원지방법원', '민사단독',
  '박지현', '최성훈', 'complaint_only', 'intermediate',
  '의뢰인 박지현은 2024. 5. 20. 수원시 영통구 소재 교차로에서 신호 대기 중, 피고 최성훈이 운전하는 차량이 추돌하여 경추 염좌 및 요추 염좌(전치 6주)를 입었습니다. 치료비 580만 원, 휴업손해 320만 원, 위자료 500만 원 합계 1,400만 원의 손해배상을 청구하고자 합니다.',
  '1. 피고는 원고에게 금 14,000,000원 및 이에 대하여 2024. 5. 20.부터 이 사건 소장 부본 송달일까지는 연 5%의, 그 다음날부터 다 갚는 날까지는 연 12%의 각 비율에 의한 금원을 지급하라.
2. 소송비용은 피고가 부담한다.
3. 제1항은 가집행할 수 있다.
라는 판결을 구합니다.',
  '1. 당사자 관계
원고 박지현은 이 사건 교통사고의 피해자이고, 피고 최성훈은 가해 차량의 운전자입니다.

2. 사고 발생 경위
원고는 2024. 5. 20. 14:30경 수원시 영통구 영통로 123 소재 교차로에서 신호 대기 중이었는데, 피고가 운전하는 차량이 전방주시의무를 태만히 하여 원고 차량을 추돌하였습니다(갑 제1호증 교통사고 사실확인원).

3. 손해액
가. 치료비: 금 5,800,000원 (갑 제2호증 진료비 영수증)
나. 휴업손해: 금 3,200,000원
다. 위자료: 금 5,000,000원

4. 결론
피고는 원고에게 합계 금 14,000,000원 및 이에 대한 지연손해금을 배상할 의무가 있습니다.',
  true
);

-- ③ 답변서 작성용 (대여금 - 피고 측)
INSERT INTO practice_cases (
  case_number, case_type, case_name, court, division,
  plaintiff, defendant, assignment_type, difficulty,
  case_facts, sample_answer_purpose, sample_answer_reason, is_active
) VALUES (
  '2026가소100003', 'civil', '대여금', '인천지방법원', '민사소액',
  '정수연', '강민호', 'answer_only', 'basic',
  '의뢰인 강민호는 원고 정수연으로부터 소장 부본을 송달받았습니다. 원고는 2024. 2. 1. 피고에게 금 500만 원을 이자 월 2%, 변제기 2024. 8. 1.로 대여하였다고 주장하나, 실제로는 위 금원은 투자금 명목으로 받은 것이며 차용증 작성 사실이 없습니다. 이에 청구 기각을 구하는 답변서를 작성하고자 합니다.',
  '1. 원고의 청구를 기각한다.
2. 소송비용은 원고가 부담한다.
라는 판결을 구합니다.',
  '1. 청구원인에 대한 답변
원고는 피고가 2024. 2. 1. 금 5,000,000원을 차용하였다고 주장하나, 이는 사실과 다릅니다.

2. 금원 수령 경위
피고는 2024. 2. 1. 원고로부터 금 5,000,000원을 수령한 사실은 있으나, 이는 원·피고가 공동으로 추진하던 온라인 쇼핑몰 사업의 투자금 명목으로 받은 것입니다(을 제1호증 카카오톡 대화내역). 차용증을 작성한 사실이 없습니다.

3. 차용증의 진정성립 부인
원고가 제출한 차용증(갑 제1호증)은 피고가 작성한 것이 아니며, 피고의 서명 또는 날인이 없는 문서입니다.

4. 결론
원고의 청구는 이유 없으므로 기각되어야 합니다.',
  true
);

-- ④ 소장+답변서 모두 (임금체불)
INSERT INTO practice_cases (
  case_number, case_type, case_name, court, division,
  plaintiff, defendant, assignment_type, difficulty,
  case_facts, sample_claim_purpose, sample_claim_reason, is_active
) VALUES (
  '2026가단100004', 'civil', '손해배상(기)', '서울남부지방법원', '민사단독',
  '홍길순', '주식회사 나라상사', 'both', 'intermediate',
  '[소장 작성 학생용]
의뢰인 홍길순은 주식회사 나라상사에서 2022. 3. 1.부터 2024. 2. 28.까지 근무하였습니다. 퇴직 시 미지급 임금 350만 원, 퇴직금 480만 원, 합계 830만 원이 미지급 상태입니다.

[답변서 작성 학생용]
의뢰인 주식회사 나라상사는 원고 홍길순의 소장 부본을 송달받았습니다. 원고가 청구하는 미지급 임금 350만 원은 원고의 무단결근으로 인한 공제액이며, 퇴직금은 원고가 자진퇴사하였으므로 지급 의무가 없다는 입장입니다.',
  '1. 피고는 원고에게 금 8,300,000원 및 이에 대하여 2024. 3. 1.부터 이 사건 소장 부본 송달일까지는 연 5%의, 그 다음날부터 다 갚는 날까지는 연 20%의 각 비율에 의한 금원을 지급하라.
2. 소송비용은 피고가 부담한다.
3. 제1항은 가집행할 수 있다.
라는 판결을 구합니다.',
  '1. 당사자 관계
원고 홍길순은 피고 주식회사 나라상사에 2022. 3. 1.부터 2024. 2. 28.까지 사무직으로 근무한 자입니다.

2. 미지급 임금
피고는 2024. 1. 및 2024. 2.분 임금 합계 금 3,500,000원을 지급하지 아니하였습니다(갑 제1호증 임금명세서).

3. 미지급 퇴직금
퇴직금: 2,400,000원 × 2년 = 4,800,000원 (갑 제2호증 근로계약서)

4. 결론
피고는 원고에게 합계 8,300,000원 및 이에 대한 지연손해금을 지급할 의무가 있습니다.',
  true
);

-- ⑤ 소장 작성용 (건물명도)
INSERT INTO practice_cases (
  case_number, case_type, case_name, court, division,
  plaintiff, defendant, assignment_type, difficulty,
  case_facts, sample_claim_purpose, sample_claim_reason, is_active
) VALUES (
  '2026가단100005', 'civil', '건물명도', '서울동부지방법원', '민사단독',
  '임건물', '세입자김', 'complaint_only', 'advanced',
  '의뢰인 임건물은 서울시 광진구 소재 건물의 소유자입니다. 세입자 김이름은 임대차 계약 만료일(2024. 6. 30.) 이후에도 건물을 인도하지 않고 점유하고 있으며, 2024. 7.분부터 차임도 지급하지 않고 있습니다. 이에 건물명도 및 연체차임 지급을 구하는 소를 제기하고자 합니다.',
  '1. 피고는 원고에게 별지 목록 기재 건물을 인도하라.
2. 피고는 원고에게 2024. 7. 1.부터 위 건물 인도 완료일까지 월 금 800,000원의 비율에 의한 금원을 지급하라.
3. 소송비용은 피고가 부담한다.
4. 제1, 2항은 가집행할 수 있다.
라는 판결을 구합니다.',
  '1. 원고는 이 사건 건물의 소유자입니다(갑 제1호증 등기사항전부증명서).

2. 임대차 계약 및 만료
원고와 피고는 2022. 7. 1. 이 사건 건물에 관하여 보증금 5,000만 원, 월 차임 800,000원, 임대차 기간 2년(2022. 7. 1. ~ 2024. 6. 30.)으로 임대차 계약을 체결하였습니다(갑 제2호증 임대차계약서).

3. 계약 만료 후 점유
임대차 기간이 2024. 6. 30. 만료되었음에도 피고는 이 사건 건물을 인도하지 아니하고 계속 점유하고 있으며, 2024. 7.분부터 차임도 지급하지 아니하고 있습니다.

4. 결론
피고는 원고에게 이 사건 건물을 인도하고, 2024. 7. 1.부터 인도 완료일까지 월 800,000원의 비율에 의한 차임 상당 부당이득을 반환할 의무가 있습니다.',
  true
);

-- ═══════════════════════════════════════════
-- 학생 배정 (student01에게)
-- ═══════════════════════════════════════════
INSERT INTO case_assignments (case_id, student_id, role, doc_type, status, due_date)
SELECT id, 'student01', 'plaintiff', 'complaint', 'pending', CURRENT_DATE + 14
FROM practice_cases WHERE case_number = '2026가소100001';

INSERT INTO case_assignments (case_id, student_id, role, doc_type, status, due_date)
SELECT id, 'student01', 'defendant', 'answer', 'pending', CURRENT_DATE + 14
FROM practice_cases WHERE case_number = '2026가소100003';

INSERT INTO case_assignments (case_id, student_id, role, doc_type, status, due_date)
SELECT id, 'student01', 'plaintiff', 'complaint', 'pending', CURRENT_DATE + 21
FROM practice_cases WHERE case_number = '2026가단100004';
