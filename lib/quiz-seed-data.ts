import { generateQuestionHash } from "./quiz-selection"

export interface SeedQuestionInput {
  courseCode: string
  topic: string
  subtopic?: string
  format: "MCQ" | "SBA" | "OSCE" | "Short Answer"
  question_text: string
  options?: string[]
  correct_answer: string
  explanation: string
  tf_options?: { statement: string; answer: boolean }[]
  sub_questions?: { question: string; expected_answer: string; explanation?: string }[]
  difficulty?: "easy" | "medium" | "hard"
  high_yield_weight?: number
  provenance?: Record<string, any>
}

export const SEED_QUESTIONS: SeedQuestionInput[] = [
  // -------------------------------------------------------------
  // LOWER GIT RADIOLOGY / ANATOMY (SBA & MCQ)
  // -------------------------------------------------------------
  {
    courseCode: "RAD 401",
    topic: "Lower GIT Radiology",
    subtopic: "Colorectal Imaging & Obstruction",
    format: "SBA",
    question_text: "A 65-year-old male presents with absolute constipation, marked abdominal distension, and severe colicky abdominal pain. An erect abdominal plain radiograph demonstrates a hugely distended, coffee-bean shaped loop of bowel arising from the pelvis and extending towards the upper right quadrant. What is the most likely diagnosis?",
    options: [
      "Sigmoid volvulus",
      "Cecal volvulus",
      "Intussusception",
      "Acute appendicitis"
    ],
    correct_answer: "Sigmoid volvulus",
    explanation: "The 'coffee-bean' sign (also known as the bent inner-tube sign) on a plain abdominal radiograph is classic for a sigmoid volvulus, which typically arises from the pelvis and points toward the right upper quadrant.",
    difficulty: "medium",
    high_yield_weight: 1.5,
    provenance: { source: "UNIJOS Past Questions 2022", year: 2022 }
  },
  {
    courseCode: "RAD 401",
    topic: "Lower GIT Radiology",
    subtopic: "Inflammatory Bowel Disease Imaging",
    format: "SBA",
    question_text: "A 28-year-old female undergoes a double-contrast barium enema for chronic diarrhea, right lower quadrant abdominal pain, and weight loss. The fluoroscopic spot film reveals transmural inflammation with deep mucosal ulcerations ('rose-thorn' ulcers), skip lesions, and a narrowed, rigid terminal ileum ('string sign of Kantor'). What is the primary diagnosis?",
    options: [
      "Crohn's disease",
      "Ulcerative colitis",
      "Tuberculous enteritis",
      "Ischemic colitis"
    ],
    correct_answer: "Crohn's disease",
    explanation: "Skip lesions, transmural involvement, deep rose-thorn mucosal ulcerations, and narrowing of the terminal ileum (string sign of Kantor) are characteristic radiologic hallmarks of Crohn's disease.",
    difficulty: "medium",
    high_yield_weight: 1.4,
    provenance: { source: "MBBS Finals Radiology Revision", year: 2023 }
  },
  {
    courseCode: "RAD 401",
    topic: "Lower GIT Radiology",
    subtopic: "Large Bowel Obstruction Signs",
    format: "MCQ",
    question_text: "Regarding plain abdominal radiographic features of lower gastrointestinal tract pathology:",
    tf_options: [
      { statement: "Haustra in the distended colon extend completely across the entire width of the bowel lumen.", answer: false },
      { statement: "Cecal volvulus typically points toward the left upper quadrant on abdominal X-ray.", answer: true },
      { statement: "Pneumoperitoneum is best visualized under the diaphragmatic domes on an erect chest X-ray.", answer: true },
      { statement: "The 'apple-core' lesion on a barium enema is indicative of annular colorectal carcinoma.", answer: true }
    ],
    correct_answer: "A-False, B-True, C-True, D-True",
    explanation: "Haustral folds do not cross the entire luminal width (unlike valvulae conniventes of the small bowel). Cecal volvulus rotates into the left upper quadrant. Free intra-abdominal air collects under the diaphragm on erect CXR.",
    difficulty: "medium",
    high_yield_weight: 1.3
  },
  {
    courseCode: "RAD 401",
    topic: "Lower GIT Radiology",
    subtopic: "Barium Studies & Neoplasms",
    format: "Short Answer",
    question_text: "State two classic barium enema fluoroscopic features of annular colorectal carcinoma. (2 marks)",
    options: [],
    correct_answer: "Apple-core lesion (or napkin-ring sign) and mucosal destruction with overhanging mucosal borders (shelfing).",
    explanation: "Annular adenocarcinoma of the colon causes concentric luminal narrowing with overhanging margins (apple-core / napkin-ring appearance) and loss of normal mucosal fold architecture.",
    difficulty: "easy",
    high_yield_weight: 1.2
  },
  {
    courseCode: "RAD 401",
    topic: "Lower GIT Radiology",
    subtopic: "Acute Abdomen Radiology Station",
    format: "OSCE",
    question_text: "You are shown an abdominal X-ray of a 72-year-old male with severe acute abdominal distension and obstipation showing a massive dilated bowel loop extending from the left lower quadrant upwards to the diaphragm.",
    sub_questions: [
      {
        question: "Identify the radiologic sign demonstrated.",
        expected_answer: "Coffee-bean sign / Bent inner-tube sign",
        explanation: "Reflects a closed-loop obstruction of the sigmoid colon filled with gas."
      },
      {
        question: "What is the single most likely clinical diagnosis?",
        expected_answer: "Sigmoid volvulus",
        explanation: "Twisting of the sigmoid colon around its mesenteric axis."
      },
      {
        question: "Outline two initial non-surgical therapeutic steps.",
        expected_answer: "Rigid/flexible sigmoidoscopy for flatus tube insertion (decompression) and IV fluid resuscitation.",
        explanation: "Endoscopic decompression with a rectal tube is first-line management unless bowel ischemia or perforation is suspected."
      }
    ],
    correct_answer: "OSCE Station Evaluation Key",
    explanation: "Recognize sigmoid volvulus on plain film and state flatus tube decompression as initial management.",
    difficulty: "hard",
    high_yield_weight: 1.6
  },

  // -------------------------------------------------------------
  // CARDIOVASCULAR PHYSIOLOGY (PHS 301)
  // -------------------------------------------------------------
  {
    courseCode: "PHS 301",
    topic: "Cardiovascular Physiology",
    subtopic: "Cardiac Cycle & Hemodynamics",
    format: "SBA",
    question_text: "During which phase of the cardiac cycle is ventricular pressure rising rapidly while both the atrioventricular (AV) valves and semilunar valves remain completely closed?",
    options: [
      "Isovolumetric contraction",
      "Isovolumetric relaxation",
      "Rapid ventricular ejection",
      "Ventricular filling"
    ],
    correct_answer: "Isovolumetric contraction",
    explanation: "Isovolumetric contraction begins with AV valve closure (S1) and ends with aortic valve opening. Ventricular pressure spikes without any volume change because all valves are closed.",
    difficulty: "easy",
    high_yield_weight: 1.3
  },
  {
    courseCode: "PHS 301",
    topic: "Cardiovascular Physiology",
    subtopic: "Cardiac Output Regulation",
    format: "MCQ",
    question_text: "Concerning the Frank-Starling law of the heart and myocardial contractility:",
    tf_options: [
      { statement: "Increasing end-diastolic volume increases cardiac stroke volume up to an optimal physiological limit.", answer: true },
      { statement: "Positive inotropic agents like digoxin increase intracellular calcium levels in cardiomyocytes.", answer: true },
      { statement: "Parasympathetic stimulation significantly increases ventricular muscle contractile force.", answer: false },
      { statement: "Afterload is directly proportional to mean arterial pressure.", answer: true }
    ],
    correct_answer: "A-True, B-True, C-False, D-True",
    explanation: "The Frank-Starling mechanism states that initial length (preload/EDV) increases stroke volume. Parasympathetic vagal innervation acts predominantly on the SA and AV nodes, with negligible direct effect on ventricular contractility.",
    difficulty: "medium",
    high_yield_weight: 1.4
  },
  {
    courseCode: "PHS 301",
    topic: "Cardiovascular Physiology",
    subtopic: "ECG Waves & Intervals",
    format: "Short Answer",
    question_text: "What electrical event in the heart does the QRS complex on a standard electrocardiogram represent? (2 marks)",
    options: [],
    correct_answer: "Ventricular depolarization.",
    explanation: "The QRS complex corresponds to rapid electrical depolarization of the right and left ventricles prior to mechanical contraction.",
    difficulty: "easy",
    high_yield_weight: 1.0
  },

  // -------------------------------------------------------------
  // ANTIBIOTIC MECHANISMS / PHARMACOLOGY (PHA 401)
  // -------------------------------------------------------------
  {
    courseCode: "PHA 401",
    topic: "Antibiotic Mechanisms",
    subtopic: "Cell Wall Inhibitors",
    format: "SBA",
    question_text: "A 34-year-old pregnant female at 24 weeks gestation develops acute pyelonephritis. Which of the following antimicrobial agents exerts its bactericidal effect by binding to penicillin-binding proteins (PBPs) to inhibit bacterial cell wall peptidoglycan synthesis, and is safe in pregnancy?",
    options: [
      "Ampicillin",
      "Ciprofloxacin",
      "Doxycycline",
      "Gentamicin"
    ],
    correct_answer: "Ampicillin",
    explanation: "Ampicillin (a beta-lactam) inhibits PBPs to block transpeptidation in peptidoglycan synthesis and is safe during pregnancy. Fluoroquinolones and tetracyclines are contraindicated.",
    difficulty: "medium",
    high_yield_weight: 1.5
  },
  {
    courseCode: "PHA 401",
    topic: "Antibiotic Mechanisms",
    subtopic: "Protein Synthesis Inhibitors",
    format: "MCQ",
    question_text: "Regarding bacterial protein synthesis inhibitor antibiotics:",
    tf_options: [
      { statement: "Aminoglycosides bind irreversibly to the 30S ribosomal subunit causing mRNA misreading.", answer: true },
      { statement: "Chloramphenicol inhibits peptidyl transferase activity at the 50S ribosomal subunit.", answer: true },
      { statement: "Tetracyclines inhibit the 50S ribosomal subunit to block peptide bond formation.", answer: false },
      { statement: "Macrolides (e.g. Erythromycin) block translocation along the 50S ribosome.", answer: true }
    ],
    correct_answer: "A-True, B-True, C-False, D-True",
    explanation: "Tetracyclines bind to the 30S subunit (not 50S) to prevent aminoacyl-tRNA attachment.",
    difficulty: "medium",
    high_yield_weight: 1.2
  }
]

export async function seedQuestionBank(supabase: any) {
  try {
    const { data: courses } = await supabase.from("courses").select("id, code")
    if (!courses || courses.length === 0) return

    const courseMap = new Map<string, string>()
    for (const c of courses) {
      if (c.code) courseMap.set(c.code.trim().toUpperCase(), c.id)
    }

    const defaultCourseId = courses[0].id

    for (const seed of SEED_QUESTIONS) {
      const courseId = courseMap.get(seed.courseCode.toUpperCase()) || defaultCourseId
      const qHash = generateQuestionHash(seed.question_text, seed.format)

      const payload = {
        course_id: courseId,
        topic: seed.topic,
        subtopic: seed.subtopic || null,
        format: seed.format,
        question_text: seed.question_text,
        options: seed.options || [],
        correct_answer: seed.correct_answer,
        explanation: seed.explanation,
        tf_options: seed.tf_options ? JSON.parse(JSON.stringify(seed.tf_options)) : null,
        sub_questions: seed.sub_questions ? JSON.parse(JSON.stringify(seed.sub_questions)) : null,
        difficulty: seed.difficulty || "medium",
        high_yield_weight: seed.high_yield_weight || 1.0,
        provenance: seed.provenance ? JSON.parse(JSON.stringify(seed.provenance)) : {},
        question_hash: qHash,
        status: "active",
      }

      await supabase.from("question_bank").upsert(payload, { onConflict: "question_hash" })

      // Seed Blueprint
      const bpPayload = {
        course_id: courseId,
        topic: seed.topic,
        high_yield_concepts: [seed.subtopic || seed.topic],
        topic_weight: 1.5,
        exam_emphasis: "High-yield clinical vignettes and spotter imaging interpretation",
        format_styles: {
          MCQ: { emphasis: "T/F per statement with negative marking awareness" },
          SBA: { emphasis: "3-5 sentence clinical presentation with 4 options" },
          "Short Answer": { emphasis: "Direct question with mark allocation" },
          OSCE: { emphasis: "Radiologic specimen identification with structured tasks" }
        }
      }

      await supabase.from("course_blueprints").upsert(bpPayload, { onConflict: "course_id, topic" })
    }
  } catch (err) {
    console.error("Error seeding initial question bank:", err)
  }
}
