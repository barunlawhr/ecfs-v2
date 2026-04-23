-- 보정명령 테이블
CREATE TABLE IF NOT EXISTS correction_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid REFERENCES practice_cases(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  order_number text NOT NULL,
  order_date date NOT NULL,
  deadline date NOT NULL,
  order_content text NOT NULL,
  order_type text DEFAULT 'general',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE correction_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "correction_orders_policy" ON correction_orders;
CREATE POLICY "correction_orders_policy" ON correction_orders FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_correction_orders_case ON correction_orders (case_id);
CREATE INDEX IF NOT EXISTS idx_correction_orders_student ON correction_orders (student_id);
