-- Migration for quiz no-repeat system, question bank persistence, and user history tracking

-- 1. Add question_bank_id column and index to quiz_questions
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS question_bank_id uuid REFERENCES public.question_bank(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_questions_question_bank_id
  ON public.quiz_questions(question_bank_id);

-- 2. Add unique partial index on question_bank(question_fingerprint) for non-empty fingerprints
CREATE UNIQUE INDEX IF NOT EXISTS uq_question_bank_nonempty_fingerprint
  ON public.question_bank(question_fingerprint)
  WHERE question_fingerprint IS NOT NULL AND question_fingerprint != '';

-- 3. Add user_question_history indexes & uniqueness protection
CREATE INDEX IF NOT EXISTS idx_user_question_history_user_attempted
  ON public.user_question_history (user_id, attempted_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_question_history_user_q_quiz
  ON public.user_question_history (user_id, question_id, quiz_id)
  WHERE question_id IS NOT NULL AND quiz_id IS NOT NULL;
