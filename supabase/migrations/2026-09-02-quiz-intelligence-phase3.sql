-- Phase 3 Quiz Intelligence & Exam Blueprint Migration

-- 1. Course Blueprints Table
CREATE TABLE IF NOT EXISTS course_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic TEXT NOT NULL DEFAULT 'General',
  high_yield_concepts TEXT[] DEFAULT '{}',
  topic_weighting JSONB DEFAULT '{}'::jsonb,
  exam_emphasis TEXT,
  difficulty_patterns TEXT,
  reasoning_patterns TEXT,
  distractor_patterns TEXT,
  recurring_concepts TEXT[] DEFAULT '{}',
  format_styles JSONB DEFAULT '{}'::jsonb,
  sources_analyzed JSONB DEFAULT '[]'::jsonb,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT course_blueprints_course_topic_key UNIQUE (course_id, topic)
);

-- Index on course_blueprints
CREATE INDEX IF NOT EXISTS idx_course_blueprints_course_topic
  ON course_blueprints (course_id, topic);

-- 2. Question Bank Table
CREATE TABLE IF NOT EXISTS question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic TEXT NOT NULL DEFAULT 'General',
  subtopic TEXT,
  format TEXT NOT NULL DEFAULT 'MCQ',
  difficulty TEXT DEFAULT 'medium',
  high_yield_relevance TEXT,
  question_text TEXT NOT NULL,
  options TEXT[] DEFAULT '{}',
  correct_answer TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  tf_options JSONB,
  sub_questions JSONB,
  image_bank_id UUID REFERENCES quiz_image_bank(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'validated', 'active', 'rejected'
  blueprint_id UUID REFERENCES course_blueprints(id) ON DELETE SET NULL,
  question_hash TEXT UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for question_bank selection & admin filtering
CREATE INDEX IF NOT EXISTS idx_question_bank_selection
  ON question_bank (course_id, topic, format, status);

CREATE INDEX IF NOT EXISTS idx_question_bank_status
  ON question_bank (status);

CREATE INDEX IF NOT EXISTS idx_question_bank_hash
  ON question_bank (question_hash);

-- RLS Policies for course_blueprints and question_bank
ALTER TABLE course_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

-- Allow authenticated students to read active questions
CREATE POLICY "Allow authenticated users to read active question_bank"
  ON question_bank FOR SELECT
  TO authenticated
  USING (status = 'active' OR auth.role() = 'service_role');

-- Allow authenticated users to read course_blueprints
CREATE POLICY "Allow authenticated users to read course_blueprints"
  ON course_blueprints FOR SELECT
  TO authenticated
  USING (TRUE);

-- Service role bypasses RLS automatically for admin operations
