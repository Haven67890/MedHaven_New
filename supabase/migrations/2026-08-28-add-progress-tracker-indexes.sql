-- Add indexes to optimize progress tracker aggregation queries

CREATE INDEX IF NOT EXISTS idx_material_activity_user_id_created_at
  ON material_activity (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_material_activity_material_id
  ON material_activity (material_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id_completed_at
  ON quiz_attempts (user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id
  ON quiz_attempts (quiz_id);

CREATE INDEX IF NOT EXISTS idx_flashcard_progress_user_id
  ON flashcard_progress (user_id);

CREATE INDEX IF NOT EXISTS idx_flashcard_progress_flashcard_id
  ON flashcard_progress (flashcard_id);
