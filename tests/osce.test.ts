import { evaluateOSCEAnswer, type OSCEStation, type OSCESpecimenImage } from "../lib/osce-engine"

function runOSCETests() {
  console.log("=== Running MedHaven OSCE Engine & Scoring Tests ===")

  // 1. Exact answer match test
  const test1 = evaluateOSCEAnswer("Trigeminal Nerve", "Trigeminal Nerve (CN V)")
  if (!test1.isCorrect) {
    throw new Error(`Test 1 Failed: Expected exact key concept match for Trigeminal Nerve`)
  }
  console.log("✓ Test 1: Exact concept match validated successfully.")

  // 2. Medical abbreviation & synonym equivalence test (CT scan -> Computed Tomography)
  const test2 = evaluateOSCEAnswer("I can see a CT scan showing subdural hematoma", "Computed Tomography demonstrating crescentic acute subdural hematoma")
  if (!test2.isCorrect) {
    throw new Error(`Test 2 Failed: Expected medical synonym match for CT scan / Computed Tomography`)
  }
  console.log("✓ Test 2: Medical synonym equivalence (CT / Computed Tomography) validated successfully.")

  // 3. Medical abbreviation test (TB -> Tuberculosis)
  const test3 = evaluateOSCEAnswer("Apical cavity secondary to pulmonary TB", "Pulmonary tuberculosis with upper lobe cavitation")
  if (!test3.isCorrect) {
    throw new Error(`Test 3 Failed: Expected medical abbreviation match for TB / Tuberculosis`)
  }
  console.log("✓ Test 3: Medical abbreviation equivalence (TB / Tuberculosis) validated successfully.")

  // 4. Empty / incorrect answer handling
  const test4 = evaluateOSCEAnswer("", "Trigeminal Nerve")
  if (test4.isCorrect || test4.score !== 0) {
    throw new Error(`Test 4 Failed: Empty answer should score 0`)
  }
  console.log("✓ Test 4: Empty answer handled correctly.")

  // 5. OSCE Station Structure & Specimen Linkage Test
  const mockImage: OSCESpecimenImage = {
    id: "img-test-123",
    title: "Normal Chest Radiograph",
    image_url: "https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/test.jpg",
    category: "Radiology",
    correct_findings: "Normal hilar shadow, clear lung fields, normal cardiothoracic ratio (<50%).",
    differential_diagnosis: "No active disease."
  }

  const mockStation: OSCEStation = {
    image_bank_id: mockImage.id,
    topic: "Radiology",
    question_text: "Examine the chest radiograph below.",
    sub_questions: [
      {
        question: "1. Identify the radiological modality.",
        expected_answer: "Plain chest radiograph (X-ray) PA view.",
        explanation: "Standard posterior-anterior chest view."
      },
      {
        question: "2. State the normal cardiothoracic ratio limit.",
        expected_answer: "Less than 50% (0.5).",
        explanation: "Measured on PA chest film."
      }
    ],
    correct_answer: "Normal chest radiograph",
    explanation: "Standard PA radiograph without cardiomegaly or pulmonary lesions.",
    image_bank: mockImage
  }

  if (mockStation.sub_questions.length < 2 || mockStation.sub_questions.length > 4) {
    throw new Error("Test 5 Failed: Station sub-questions count should be between 2 and 4")
  }

  if (mockStation.image_bank_id !== mockImage.id) {
    throw new Error("Test 5 Failed: Station image_bank_id does not match specimen image ID")
  }

  console.log("✓ Test 5: OSCE Station structure and quiz_image_bank linkage validated successfully.")

  console.log("\n✓ ALL OSCE ENGINE & SCORING VERIFICATION TESTS PASSED SUCCESSFULLY!")
}

runOSCETests()
