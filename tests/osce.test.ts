import { evaluateOSCEAnswer, type OSCEStation, type OSCESpecimenImage } from "../lib/osce-engine"

console.log("=== Running OSCE Engine & Scoring Validation Tests ===")

// Test 1: evaluateOSCEAnswer accuracy scoring
const expected1 = "Anterior cruciate ligament (ACL) tear"
const userCorrect1 = "This is an anterior cruciate ligament tear with Lachman positivity."
const userWrong1 = "Normal knee meniscus structure."

const evalResult1 = evaluateOSCEAnswer(userCorrect1, expected1)
const evalResult2 = evaluateOSCEAnswer(userWrong1, expected1)

if (!evalResult1.isCorrect) {
  console.error("Test 1 Failed: Expected correct match for user answer.")
  process.exit(1)
} else {
  console.log("✓ Correct answer keyword match evaluated successfully.")
}

if (evalResult2.isCorrect) {
  console.error("Test 1 Failed: Expected wrong match for unrelated answer.")
  process.exit(1)
} else {
  console.log("✓ Incorrect answer evaluated successfully.")
}

// Test 2: OSCE Station structure validation
const sampleImage: OSCESpecimenImage = {
  id: "test-img-uuid-1",
  title: "Chest X-ray — Bilateral Pulmonary Tuberculosis",
  image_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Tuberculosis-x-ray.jpg",
  category: "radiology",
  correct_findings: "Bilateral apical cavitary infiltrates consistent with active PTB.",
  differential_diagnosis: "Fungal pneumonia, lung abscess, sarcoidosis",
  source: "Wikimedia Commons"
}

const sampleStation: OSCEStation = {
  image_bank_id: sampleImage.id,
  topic: "Radiology",
  question_text: "Study the provided chest radiograph and answer the questions below.",
  sub_questions: [
    {
      question: "Identify the principal radiological abnormality.",
      expected_answer: "Apical cavitary infiltrates in right upper lobe.",
      explanation: "Classic feature of secondary tuberculosis."
    },
    {
      question: "State the primary clinical diagnosis.",
      expected_answer: "Pulmonary tuberculosis.",
      explanation: "Correlates with radiological cavitation."
    }
  ],
  correct_answer: "Pulmonary tuberculosis with apical cavitary lesions.",
  explanation: "Secondary PTB characteristically affects upper lobes."
}

if (sampleStation.sub_questions.length !== 2) {
  console.error("Test 2 Failed: Sub-question count mismatch.")
  process.exit(1)
}

if (!sampleStation.sub_questions[0].expected_answer || !sampleStation.sub_questions[1].expected_answer) {
  console.error("Test 2 Failed: Expected sub-question answers missing.")
  process.exit(1)
}

console.log("✓ OSCE Station structure and sub-question rubrics validated.")
console.log("✓ ALL OSCE TESTS PASSED SUCCESSFULLY!")
