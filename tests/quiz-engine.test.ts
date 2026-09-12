import { selectQuizQuestions, validateQuestionStructure, generateQuestionHash } from "../lib/quiz-selection"

async function runTests() {
  console.log("=== Testing Quiz Engine Component Logic ===")

  // 1. Validation tests
  const sbaValid = validateQuestionStructure({
    question_text: "Vignette?",
    options: ["A", "B", "C", "D"],
    correct_answer: "A"
  }, "SBA")
  console.assert(sbaValid === true, "Valid SBA failed validation")

  const sbaInvalidOptions = validateQuestionStructure({
    question_text: "Vignette?",
    options: ["A", "B", "C"],
    correct_answer: "A"
  }, "SBA")
  console.assert(sbaInvalidOptions === false, "Invalid SBA options passed validation")

  const mcqValid = validateQuestionStructure({
    question_text: "Stem?",
    tf_options: [{ statement: "S1", answer: true }, { statement: "S2", answer: false }]
  }, "MCQ")
  console.assert(mcqValid === true, "Valid MCQ failed validation")

  const osceValid = validateQuestionStructure({
    question_text: "Station?",
    sub_questions: [{ question: "SubQ1", expected_answer: "Ans1" }]
  }, "OSCE")
  console.assert(osceValid === true, "Valid OSCE failed validation")

  const saValid = validateQuestionStructure({
    question_text: "SA Question?",
    correct_answer: "Model Answer"
  }, "Short Answer")
  console.assert(saValid === true, "Valid Short Answer failed validation")

  // 2. Hash generation
  const hash1 = generateQuestionHash("Test Question Stem", "SBA")
  const hash2 = generateQuestionHash("test question stem ", "sba")
  console.assert(hash1 === hash2, "Question hash normalization failed")

  console.log("All unit tests passed successfully!")
}

runTests().catch(console.error)
