-- 송달문서 테이블
CREATE TABLE IF NOT EXISTS delivery_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id text NOT NULL,
  case_id uuid REFERENCES practice_cases(id) ON DELETE CASCADE,
  court text NOT NULL,
  division text NOT NULL,
  case_number text NOT NULL,
  document_name text NOT NULL,
  sent_at date NOT NULL,
  received_at date,
  is_auto_confirmed boolean DEFAULT false,
  doc_type text DEFAULT 'notice',
  has_publish boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS delivery_documents_policy ON delivery_documents;
CREATE POLICY delivery_documents_policy ON delivery_documents FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_delivery_docs_student ON delivery_documents (student_id);
CREATE INDEX IF NOT EXISTS idx_delivery_docs_case ON delivery_documents (case_id);
