-- MedHaven Quiz System Redesign Phase 2 Migration
-- Creates course_blueprints, question_bank, and user_question_history tables

-- 1. Course Blueprints Table
CREATE TABLE IF NOT EXISTS course_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  high_yield_concepts JSONB DEFAULT '[]'::jsonb,
  topic_weight NUMERIC DEFAULT 1.0,
  exam_emphasis TEXT,
  question_styles JSONB DEFAULT '{}'::jsonb,
  distractor_patterns JSONB DEFAULT '{}'::jsonb,
  format_styles JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_course_blueprints_course_topic UNIQUE (course_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_course_blueprints_course_id
  ON course_blueprints (course_id);

CREATE INDEX IF NOT EXISTS idx_course_blueprints_topic
  ON course_blueprints (lower(topic));

-- 2. Question Bank Table
CREATE TABLE IF NOT EXISTS question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  subtopic TEXT,
  format TEXT NOT NULL CHECK (format IN ('MCQ', 'SBA', 'OSCE', 'Short Answer')),
  question_text TEXT NOT NULL,
  options TEXT[] DEFAULT '{}'::text[],
  correct_answer TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  tf_options JSONB,
  sub_questions JSONB,
  image_bank_id UUID REFERENCES quiz_image_bank(id) ON DELETE SET NULL,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  high_yield_weight NUMERIC DEFAULT 1.0,
  provenance JSONB DEFAULT '{}'::jsonb,
  question_hash TEXT UNIQUE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_course_format_status
  ON question_bank (course_id, format, status);

CREATE INDEX IF NOT EXISTS idx_question_bank_topic
  ON question_bank (lower(topic));

CREATE INDEX IF NOT EXISTS idx_question_bank_hash
  ON question_bank (question_hash);

-- 3. User Question History Table
CREATE TABLE IF NOT EXISTS user_question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  quiz_attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE SET NULL,
  is_correct BOOLEAN,
  user_answer TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_question_history_user_question
  ON user_question_history (user_id, question_id);

CREATE INDEX IF NOT EXISTS idx_user_question_history_user_attempted
  ON user_question_history (user_id, attempted_at DESC);
