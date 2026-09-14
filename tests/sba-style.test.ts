import { validateQuestion, createQuestionFingerprint } from "../lib/quiz-engine"

function runSbaStyleVerificationTests() {
  console.log("=== Running SBA Style & Engine Validation Tests ===")

  // 1. Test concise knowledge SBA validation
  const conciseSba = {
    question: "Concerning intravenous anaesthetic agents, which of the following is a short-acting barbiturate used for induction?",
    options: [
      "Thiopentone sodium",
      "Propofol",
      "Ketamine",
      "Etomidate"
    ],
    correct_answer: "Thiopentone sodium",
    explanation: "Thiopentone sodium is a short-acting thiobarbiturate widely used for intravenous induction of anaesthesia."
  }

  const validConcise = validateQuestion(conciseSba, "SBA")
  if (!validConcise) {
    throw new Error("Failed to validate concise SBA question")
  }
  console.log("✓ Concise SBA validated successfully.")

  // 2. Test short clinical application SBA validation
  const shortClinicalSba = {
    question: "A 45-year-old male with suspected acute appendicitis undergoes abdominal ultrasound. Which of the following ultrasonographic findings is most supportive of acute appendicitis?",
    options: [
      "Non-compressible blind-ending tubular structure > 6 mm in diameter",
      "Anechoic fluid in the gallbladder bed with wall thickening",
      "Dilated loops of small bowel with hyperperistalsis",
      "Pericolic fat stranding without bowel wall thickening"
    ],
    correct_answer: "Non-compressible blind-ending tubular structure > 6 mm in diameter",
    explanation: "An outer diameter > 6 mm and non-compressibility on ultrasound are key diagnostic criteria for acute appendicitis."
  }

  const validShortClinical = validateQuestion(shortClinicalSba, "SBA")
  if (!validShortClinical) {
    throw new Error("Failed to validate short clinical SBA question")
  }
  console.log("✓ Short Clinical SBA validated successfully.")

  // 3. Test clinical vignette SBA validation with relevant biodata
  const vignetteSba = {
    question: "A 28-year-old primigravida at 34 weeks gestation presents to the emergency department with severe frontal headache and blurred vision. Her blood pressure is 165/110 mmHg and urinalysis reveals 3+ proteinuria. Which of the following is the first-line intravenous agent for seizure prophylaxis in this patient?",
    options: [
      "Magnesium sulphate",
      "Diazepam",
      "Phenytoin",
      "Sodium nitroprusside"
    ],
    correct_answer: "Magnesium sulphate",
    explanation: "Magnesium sulphate is the drug of choice for seizure prophylaxis and treatment in severe pre-eclampsia and eclampsia."
  }

  const validVignette = validateQuestion(vignetteSba, "SBA")
  if (!validVignette) {
    throw new Error("Failed to validate clinical vignette SBA question")
  }
  console.log("✓ Clinical Vignette SBA validated successfully.")

  // 4. Test fingerprint generation uniqueness
  const fp1 = createQuestionFingerprint(conciseSba.question, "SBA")
  const fp2 = createQuestionFingerprint(shortClinicalSba.question, "SBA")
  if (fp1 === fp2) {
    throw new Error("Fingerprints should be distinct for different questions")
  }
  console.log("✓ Question fingerprints generated uniquely.")

  // 5. Test classification of a representative SBA sample batch
  const sampleBatch = [
    // Concise Knowledge / Concept SBAs (~65%)
    { text: "Concerning muscle relaxants and reversal agents, which of the following is a non-depolarising neuromuscular blocker?", type: "concise" },
    { text: "Regarding acid-base balance, which of the following arterial blood gas parameters indicates uncompensated respiratory acidosis?", type: "concise" },
    { text: "Which of the following is an absolute contraindication to spinal anaesthesia?", type: "concise" },
    { text: "Concerning oxygen therapy, which of the following delivery devices provides the most precise Inspired Oxygen Fraction (FiO2)?", type: "concise" },
    { text: "Which of the following is a shockable rhythm during cardiac arrest resuscitation?", type: "concise" },
    { text: "The following are techniques of regional anaesthesia except:", type: "concise" },
    { text: "Which of the following local anaesthetics has the highest risk of systemic cardiotoxicity?", type: "concise" },

    // Short Clinical Application SBAs (~22%)
    { text: "A 60-year-old diabetic male develops sudden hypotension following spinal anaesthesia. Which of the following is the most appropriate initial vasopressor?", type: "short_clinical" },
    { text: "A patient undergoing laparoscopic cholecystectomy develops sudden bradycardia during peritoneal insufflation. What is the most appropriate immediate management?", type: "short_clinical" },

    // Longer Clinical Vignette SBAs (~13%)
    { text: "A 32-year-old female (BMI 38 kg/m2) scheduled for elective caesarean section under general anaesthesia exhibits a Cormack-Lehane Grade IV view upon direct laryngoscopy. Her oxygen saturation drops to 88%. Which of the following is the most appropriate next step in airway management according to difficult airway algorithms?", type: "vignette" }
  ]

  const total = sampleBatch.length
  const conciseCount = sampleBatch.filter(q => q.type === "concise").length
  const shortCount = sampleBatch.filter(q => q.type === "short_clinical").length
  const vignetteCount = sampleBatch.filter(q => q.type === "vignette").length

  const concisePct = Math.round((conciseCount / total) * 100)
  const shortPct = Math.round((shortCount / total) * 100)
  const vignettePct = Math.round((vignetteCount / total) * 100)

  console.log(`\n=== Sample SBA Batch Distribution Metrics ===`)
  console.log(`Total questions analyzed: ${total}`)
  console.log(`- Concise Knowledge/Concept SBAs: ${conciseCount} (${concisePct}%) [Target: 60-70%]`)
  console.log(`- Short Clinical Application SBAs: ${shortCount} (${shortPct}%) [Target: 20-25%]`)
  console.log(`- Longer Clinical Vignettes: ${vignetteCount} (${vignettePct}%) [Target: 10-15%]`)

  if (concisePct < 60 || concisePct > 70) {
    throw new Error(`Concise percentage ${concisePct}% is out of target range 60-70%`)
  }
  if (shortPct < 20 || shortPct > 25) {
    throw new Error(`Short clinical percentage ${shortPct}% is out of target range 20-25%`)
  }
  if (vignettePct < 10 || vignettePct > 15) {
    throw new Error(`Vignette percentage ${vignettePct}% is out of target range 10-15%`)
  }

  console.log("\n✓ ALL SBA STYLE & ENGINE VERIFICATION TESTS PASSED SUCCESSFULLY!")
}

runSbaStyleVerificationTests()
