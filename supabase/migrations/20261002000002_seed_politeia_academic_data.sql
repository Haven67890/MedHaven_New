-- Migration: 20261002000002_seed_politeia_academic_data.sql
-- Seed canonical Political Science academic data for POLITEIA

BEGIN;

DO $$
DECLARE
  v_ps_dept_id uuid := 'd81071d2-922f-4542-9e34-6c9bf33c37ce';
  v_soc_fac_id uuid := 'a179c508-cca6-45eb-a7fb-e529b13cb119';
  v_course_pos101 uuid;
  v_course_pos102 uuid;
  v_course_pos201 uuid;
  v_course_pos301 uuid;
  v_deck_id uuid;
  v_quiz_id uuid;
BEGIN
  -- 1. Insert Courses for Political Science
  INSERT INTO public.courses (id, faculty_id, department_id, level, code, title, description)
  VALUES
    (gen_random_uuid(), v_soc_fac_id, v_ps_dept_id, '100L', 'POS 101', 'Introduction to Political Science', 'Foundational concepts in political theory, governance, and state systems.')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_course_pos101;

  IF v_course_pos101 IS NULL THEN
    SELECT id INTO v_course_pos101 FROM public.courses WHERE code = 'POS 101' AND department_id = v_ps_dept_id;
  END IF;

  INSERT INTO public.courses (id, faculty_id, department_id, level, code, title, description)
  VALUES
    (gen_random_uuid(), v_soc_fac_id, v_ps_dept_id, '100L', 'POS 102', 'Nigerian Constitutional Development', 'Analysis of historical constitutional evolution in Nigeria from colonial era to present.')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_course_pos102;

  IF v_course_pos102 IS NULL THEN
    SELECT id INTO v_course_pos102 FROM public.courses WHERE code = 'POS 102' AND department_id = v_ps_dept_id;
  END IF;

  INSERT INTO public.courses (id, faculty_id, department_id, level, code, title, description)
  VALUES
    (gen_random_uuid(), v_soc_fac_id, v_ps_dept_id, '200L', 'POS 201', 'Political Thought: Ancient to Modern', 'Survey of political philosophers from Plato and Aristotle to Machiavelli and Locke.')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_course_pos201;

  IF v_course_pos201 IS NULL THEN
    SELECT id INTO v_course_pos201 FROM public.courses WHERE code = 'POS 201' AND department_id = v_ps_dept_id;
  END IF;

  INSERT INTO public.courses (id, faculty_id, department_id, level, code, title, description)
  VALUES
    (gen_random_uuid(), v_soc_fac_id, v_ps_dept_id, '300L', 'POS 301', 'International Relations & Diplomacy', 'Theories of global politics, state behavior, international organizations, and diplomacy.')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_course_pos301;

  IF v_course_pos301 IS NULL THEN
    SELECT id INTO v_course_pos301 FROM public.courses WHERE code = 'POS 301' AND department_id = v_ps_dept_id;
  END IF;

  -- 2. Insert Study Materials
  INSERT INTO public.materials (course_id, title, type, tier, description, status)
  VALUES
    (v_course_pos101, 'POS 101 Lecture Notes: Concepts of State and Sovereignty', 'lecture_slide', 'study', 'Core introductory material covering statehood, legitimacy, authority, and sovereignty.', 'published'),
    (v_course_pos102, '1999 Constitution of the Federal Republic of Nigeria (Annotated)', 'pdf', 'recommended', 'Full text of the 1999 Constitution with analytical footnotes.', 'published'),
    (v_course_pos201, 'Classical Political Thought: Plato''s Republic Summary', 'tutorial_note', 'study', 'In-depth analysis of the ideal state and justice in Greek philosophy.', 'published'),
    (v_course_pos301, 'Theories of Realism and Liberalism in IR', 'pdf', 'study', 'Comparative breakdown of major paradigms in international political relations.', 'published')
  ON CONFLICT DO NOTHING;

  -- 3. Insert Question Bank / Past Questions
  INSERT INTO public.question_bank (course_id, topic, question_text, options, correct_answer, explanation, difficulty, status)
  VALUES
    (v_course_pos101, 'State and Sovereignty', 'Which political thinker defined sovereignty as the absolute and perpetual power of a commonwealth?', '["a) Jean Bodin", "b) Thomas Hobbes", "c) John Locke", "d) Karl Marx"]'::jsonb, 'a) Jean Bodin', 'Jean Bodin in Six Books of the Commonwealth (1576) formulated the modern political definition of sovereignty.', 'medium', 'active'),
    (v_course_pos102, 'Constitutional History', 'The Richards Constitution of Nigeria was introduced in which year?', '["a) 1922", "b) 1946", "c) 1951", "d) 1954"]'::jsonb, 'b) 1946', 'The Richards Constitution was introduced in 1946, dividing Nigeria into Northern, Western, and Eastern regions.', 'easy', 'active'),
    (v_course_pos201, 'Political Philosophy', 'Who argued that life in the state of nature is "solitary, poor, nasty, brutish, and short"?', '["a) John Locke", "b) Jean-Jacques Rousseau", "c) Thomas Hobbes", "d) Baron de Montesquieu"]'::jsonb, 'c) Thomas Hobbes', 'Thomas Hobbes famously stated this in Leviathan (1651).', 'easy', 'active')
  ON CONFLICT DO NOTHING;

  -- 4. Insert Quizzes & Questions
  INSERT INTO public.quizzes (id, course_id, topic, format)
  VALUES
    (gen_random_uuid(), v_course_pos101, 'Introduction to Governance & Power', 'MCQ')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_quiz_id;

  IF v_quiz_id IS NOT NULL THEN
    INSERT INTO public.quiz_questions (quiz_id, question_text, options, correct_answer, explanation)
    VALUES
      (v_quiz_id, 'Power backed by legal authority and legitimacy is referred to as:', '["a) Influence", "b) Authority", "c) Coercion", "d) Force"]'::jsonb, 'b) Authority', 'Authority is legitimate power that is recognized and accepted by governed citizens.');
  END IF;

  -- 5. Insert Flashcards Decks & Flashcards
  INSERT INTO public.flashcard_decks (id, course_id, topic, source)
  VALUES
    (gen_random_uuid(), v_course_pos101, 'Key Political Science Terms', 'specimen_bank')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_deck_id;

  IF v_deck_id IS NOT NULL THEN
    INSERT INTO public.flashcards (deck_id, front, back)
    VALUES
      (v_deck_id, 'What is Sovereignty?', 'Supreme and independent authority over a geographic area or group of people.'),
      (v_deck_id, 'Define Federalism', 'A system of government where power is constitutionally divided between a central authority and constituent political units.');
  END IF;

  -- 6. Insert Political Dictionary Entries
  INSERT INTO public.political_dictionary_entries (department_id, term, definition, explanation, status)
  VALUES
    (v_ps_dept_id, 'Gerrymandering', 'The practice of establishing a political advantage for a particular party or group by manipulating district boundaries.', 'Originates from Elbridge Gerry in 1812, creating districts shaped like salamanders.', 'published'),
    (v_ps_dept_id, 'Bicameralism', 'A legislature with two distinct assemblies or houses.', 'In Nigeria, the National Assembly is bicameral, comprising the Senate and House of Representatives.', 'published')
  ON CONFLICT DO NOTHING;

  -- 7. Insert Staff Directory
  INSERT INTO public.staff (department_id, full_name, title, specialty, status)
  VALUES
    (v_ps_dept_id, 'Prof. A. B. Nuhu', 'Professor & Head of Department', 'Political Economy & Comparative Politics', 'active'),
    (v_ps_dept_id, 'Dr. Sarah Pam', 'Senior Lecturer', 'International Relations & Strategic Studies', 'active')
  ON CONFLICT DO NOTHING;

END $$;

COMMIT;
