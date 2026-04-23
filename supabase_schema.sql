-- ══════════════════════════════════════════════════════════════
--  ecfs-v2 Supabase 스키마
--  실행: Supabase SQL Editor에서 이 파일 내용을 붙여넣기
-- ══════════════════════════════════════════════════════════════

-- 기존 테이블이 있으면 삭제 (주의: 데이터 유실)
-- DROP TABLE IF EXISTS scores CASCADE;
-- DROP TABLE IF EXISTS submissions CASCADE;
-- DROP TABLE IF EXISTS case_assignments CASCADE;
-- DROP TABLE IF EXISTS practice_cases CASCADE;

-- ── 1. cases (실습 사건) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS practice_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL,                          -- 예: 2026가소226035
  case_type text NOT NULL DEFAULT 'civil',            -- civil | attachment | injunction | family
  case_name text NOT NULL DEFAULT '',                 -- 예: 손해배상(기)
  court text NOT NULL DEFAULT '',                     -- 법원명
  division text DEFAULT '',                           -- 재판부
  plaintiff text NOT NULL DEFAULT '',                 -- 원고
  defendant text NOT NULL DEFAULT '',                 -- 피고
  sample_complaint text DEFAULT '',                   -- 모범 소장 (채점 기준)
  sample_answer text DEFAULT '',                      -- 모범 답변서 (채점 기준)
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_practice_cases_active ON practice_cases (is_active);
CREATE INDEX IF NOT EXISTS idx_practice_cases_type ON practice_cases (case_type);

-- ── 2. case_assignments (사건 배정) ──────────────────────────
CREATE TABLE IF NOT EXISTS case_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES practice_cases(id) ON DELETE CASCADE,
  student_id text NOT NULL,                           -- 학생 로그인 ID (예: student01)
  role text NOT NULL DEFAULT 'plaintiff',             -- plaintiff | defendant
  assigned_at timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz,                               -- 마감일
  status text NOT NULL DEFAULT 'pending'              -- pending | in_progress | submitted | graded
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_case_assignments_student ON case_assignments (student_id);
CREATE INDEX IF NOT EXISTS idx_case_assignments_case ON case_assignments (case_id);
CREATE INDEX IF NOT EXISTS idx_case_assignments_status ON case_assignments (status);

-- 동일 사건+학생 중복 배정 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_case_assignments_unique ON case_assignments (case_id, student_id);

-- ── 3. submissions (서류 제출) ───────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES case_assignments(id) ON DELETE CASCADE,
  doc_type text NOT NULL,                             -- complaint | answer | brief | dateChange | correction | appeal
  content jsonb NOT NULL DEFAULT '{}',                -- 제출 내용 전체 (폼 데이터)
  submitted_at timestamptz NOT NULL DEFAULT now(),
  rule_score int,                                     -- 1차 규칙 채점 점수
  ai_score int,                                       -- 2차 AI 채점 점수
  final_score int,                                    -- 최종 점수
  feedback text DEFAULT '',                           -- 채점 피드백
  graded_at timestamptz
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_doc_type ON submissions (doc_type);

-- ── 4. scores (채점 상세) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  breakdown jsonb NOT NULL DEFAULT '{}',              -- 항목별 점수 내역
  issues jsonb NOT NULL DEFAULT '[]',                 -- 수정 필요 사항 목록
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scores_submission ON scores (submission_id);

    -- ── RLS (Row Level Security) ───────────────────────────────                                            
    ALTER TABLE practice_cases ENABLE ROW LEVEL SECURITY;                                                     
    ALTER TABLE case_assignments ENABLE ROW LEVEL SECURITY;                                                   
    ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE scores ENABLE ROW LEVEL SECURITY;                      
                                                                                                      
    -- 모든 사용자에게 전체 접근 허용 (실습용)                                                        
    DROP POLICY IF EXISTS "allow_all_practice_cases" ON practice_cases;    
    CREATE POLICY "allow_all_practice_cases" ON practice_cases FOR ALL USING (true) WITH CHECK (true);    
                                                                                                          
    DROP POLICY IF EXISTS "allow_all_case_assignments" ON case_assignments;
    CREATE POLICY "allow_all_case_assignments" ON case_assignments FOR ALL USING (true) WITH CHECK (true);
                                                                                                
    DROP POLICY IF EXISTS "allow_all_submissions" ON submissions;
    CREATE POLICY "allow_all_submissions" ON submissions FOR ALL USING (true) WITH CHECK (true);
                                                                                      
    DROP POLICY IF EXISTS "allow_all_scores" ON scores;                                    
    CREATE POLICY "allow_all_scores" ON scores FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════
--  샘플 데이터 (테스트용)
-- ══════════════════════════════════════════════════════════════
INSERT INTO practice_cases (case_number, case_type, case_name, court, division, plaintiff, defendant, is_active)
VALUES
  ('2026가소226035', 'civil', '손해배상(기)', '서울중앙지방법원', '민사10단독(소액)', '주식회사 바른커리어', '주식회사 위시켓 외 1명', true),
  ('2026가단118704', 'civil', '대여금', '서울동부지방법원', '민사5단독', '김도현', '박성준', true),
  ('2026가소330291', 'civil', '매매대금', '수원지방법원', '민사21단독(소액)', '이윤서', '주식회사 해오름유통', true),
  ('2026가단205837', 'civil', '임금', '인천지방법원', '민사3단독', '정유진 외 2명', '주식회사 블루스카이', true),
  ('2026가소417028', 'civil', '부당이득금', '서울남부지방법원', '민사7단독(소액)', '한세진', '오태민', true)
ON CONFLICT DO NOTHING;
