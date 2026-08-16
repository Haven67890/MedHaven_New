# MedHaven Materials Data Integrity Audit Report

**Generated At:** 2026-08-16T18:23:17.719Z
**Total Rows Checked:** 847
**Broken URL Count:** 56
**Tier/Type Inconsistent Count:** 10

## Pattern & Criteria Used for Tier/Type Judgment

- **Valid Format Types:** `pdf`, `video`, `image`, `slideshare`, `doc`, `link`, `office`, `lecture_slide`, `past_question`
- **Valid Content Tiers:** `study`, `recommended`, `recommendation`, `past_question`, `slides`
- **Pattern Inconsistencies Flagged:**
  - Missing or unrecognized format type or tier value.
  - Incompatible combination (e.g. tier `past_question` with type `video` or `slideshare`; tier `slides` with type `video`).
  - Type `slideshare` without a valid supported slide provider URL (`slideshare.net`, `slideserve.com`, `scribd.com`, `slides.com`).
  - Type `link` without a `source_url`.

## Broken-URL Rows

| ID | Title | Resolved URL | HTTP Status / Error |
| --- | --- | --- | --- |
| `df041b26-b6c2-4684-8d6a-711ee5848dd8` | Tolerence And Autoimmune Diseases | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/mcb/Tolerence%20and%20autoimmune%20diseases.ppt` | **400** |
| `37f43f32-7030-47a4-8542-8a4f2e11382b` | Haemopoiesis MS | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/haematology/HAEMOPOIESIS%20MS.ppt` | **400** |
| `2cdda31d-4150-4fe4-bc24-853782d5d1de` | Onchoceriasis | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/mcb/ONCHOCERIASIS.pptx` | **400** |
| `693ef48e-45f8-40ff-ade4-2de74123de23` | Gladiasis | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/mcb/Gladiasis.pptx` | **400** |
| `a9c5577e-a2c8-4f84-ae87-db72248790e1` | Diphyllobophthiasis | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/mcb/DIPHYLLOBOPHTHIASIS.pptx` | **400** |
| `26dfe324-13b3-42b3-9869-270e69407749` | Ascarasis | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/mcb/ASCARASIS.pptx` | **400** |
| `f09e744e-f115-4cfa-a710-a4447735317b` | Anaerobic Bacteriology 2016 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/mcb/Anaerobic%20Bacteriology%202016.ppt` | **400** |
| `8476b9f2-7b31-451b-b1e2-a25abe3e2a88` | LECTURE | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/radiology/LECTURE.pptx` | **400** |
| `9b5790f6-c2dc-4b52-ab39-797e6629e88a` | Radiology | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/radiology/Radiology.ppt` | **400** |
| `30bc503f-1a36-46e2-9c42-95f0b70b79e5` | Radiological Anatomy of the Male Reproductive System | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/radiology/Radiological%20Anatomy%20of%20the%20Male%20Reproductive%20System.pptx` | **400** |
| `7855fd0c-5000-4e1f-ac68-0815204ae1ec` | INTELLECTUAL DISABILTY | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/psychiatry/INTELLECTUAL%20DISABILTY.ppt` | **400** |
| `5d9caf38-149f-479d-abce-f32cf698cb44` | SCHIZOPHRENIAS for Medical Students 5thSept] | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/psychiatry/SCHIZOPHRENIAS%20for%20Medical%20Students%205thSept%5D.pptx` | **400** |
| `08e4adab-695e-4fe6-b705-0afcbb248333` | Medical students' Lecture series; salivary calculi | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/otorhinolaryngology/Medical%20students%27%20Lecture%20series%3B%20salivary%20calculi.pptx` | **400** |
| `8e5d3c7c-6318-451d-9182-69bd8c20bea6` | Acute Abdomen | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/ACUTE%20ABDOMEN.pptx` | **400** |
| `8cb074c8-0974-4580-9aa8-a38f93261cdd` | MUSCLE RELAXANTS & REVERSAL | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/anaesthesiology/MUSCLE%20RELAXANTS%20%26%20REVERSAL.ppt` | **400** |
| `c894b612-b45b-4f12-8593-f2c34b7377db` | Fluids and Electrolytes | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/Fluids%20and%20Electrolytes%20copy.pdf` | **400** |
| `9fe4e59d-9ac1-4964-9ed0-1eaae7300a54` | Skin Lesions II: Kaposi Sarcoma | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/SURG%20402-skin%20lesionII-%20kaposi%20sarcoma.pptx` | **400** |
| `b41d0b03-9dad-4bd9-acd6-be96dd851a1f` | Haematology Scanned Past Question 24 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/haematology/20240323_015449.jpg` | **ERROR (This operation was aborted)** |
| `21b200bb-982a-412b-86dc-fc9478803349` | Haematology Scanned Past Question 25 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/haematology/20240323_015501.jpg` | **ERROR (This operation was aborted)** |
| `7689b639-dbcd-4493-b32f-e0d6b71f3222` | Haematology Scanned Past Question 26 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/haematology/20240323_015509.jpg` | **ERROR (This operation was aborted)** |
| `180e351a-c795-4089-885a-c4f8156854eb` | Haematology Scanned Past Question 27 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/haematology/20240323_020542.jpg` | **ERROR (This operation was aborted)** |
| `43a39584-79f7-4a5f-ba33-664672b147df` | Haematology Scanned Past Question 28 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/haematology/20240323_020551.jpg` | **ERROR (This operation was aborted)** |
| `f1b58ce0-efe6-42f8-9731-bacb7604566a` | Haematology Scanned Past Question 30 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/haematology/20240323_020605.jpg` | **ERROR (This operation was aborted)** |
| `f21fa801-76bc-4a21-81d9-f762f75dcd63` | Haematology Scanned Past Question 31 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/haematology/20240323_020612.jpg` | **ERROR (This operation was aborted)** |
| `23f5bcdd-a64e-4377-b41b-0376beec537c` | Haematology Scanned Past Question 32 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/haematology/20240323_020619.jpg` | **ERROR (This operation was aborted)** |
| `02cb96e7-b8c9-4879-a66e-ed0c570902cb` | Haematology Scanned Past Question 34 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/haematology/20240323_020633.jpg` | **ERROR (This operation was aborted)** |
| `ca3056db-38e2-455d-a37c-638d0ff8fe8d` | Haematology Scanned Past Question 35 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/haematology/20240323_020640.jpg` | **ERROR (This operation was aborted)** |
| `00f63872-eb23-4d58-9c47-5adf3c6235d7` | Chem Path Past Questions (Big Owi) | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/chempath/CHEM%20PATH%20PQs—Big%20Owi.pdf` | **400** |
| `de4614da-480e-4897-9254-db0cf8e131a3` | Chem Path Questions (Victor Bright) | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/chempath/Chem%20Path%20Questions%20by%20Victor%20Bright.pdf` | **ERROR (This operation was aborted)** |
| `c2a7b13c-be3b-40fd-9cd4-12bd9948b82c` | ChemPath Past Questions | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/chempath/ChemPath%20PQs%20(1).pdf` | **ERROR (This operation was aborted)** |
| `8f42cff1-71fa-43ab-9ac5-9f9a87efb430` | Chempath MCQ 2021 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/chempath/Chempath%20mcq2021.pdf` | **ERROR (This operation was aborted)** |
| `2b9d4427-9f99-4b47-808d-a1b8e76100c9` | Chempath MCQ Past Question Collection (Answered, v0.5) | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/chempath/Chempath%20MCQ%20PQ%20Collection%20(Answered)%20v0.5.pdf` | **ERROR (This operation was aborted)** |
| `b8f7602e-49f8-47f4-8474-241fc9b54d0c` | Chempath MCQs | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/chempath/Chem.path%20MCQs.pdf` | **ERROR (This operation was aborted)** |
| `1e53702f-6c3b-4a76-a163-d4a96ef47608` | Chempath Scanned Past Question 17 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/chempath/IMG_20240323_114956_948.jpg` | **ERROR (This operation was aborted)** |
| `b94e7fc2-bfd1-4347-b034-5fd360bbb3ea` | Chempath Scanned Past Question 16 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/chempath/IMG_20240323_114943_725.jpg` | **ERROR (This operation was aborted)** |
| `60758903-fa45-452d-803e-3dab590edcec` | Neurosurgical Anatomy | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/NEUROSURGICAL%20ANATOMY.pptx` | **400** |
| `6a6995f6-b529-4b13-935a-9353bc84f818` | History, Examination and Investigation of the Respiratory System | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/HISTORY,EXAMINATION%20AND%20INVESTIGATION%20OF%20THE%20RESPIRATORY%20SYSTEM%20(1).pptx` | **ERROR (This operation was aborted)** |
| `aab5a60d-1568-46e1-8548-77255b79c788` | History, Examination and Investigations of the Neurosurgical Patient | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/History,%20Examination%20and%20Investigations%20of%20the%20Neurosurgical.pptx` | **ERROR (This operation was aborted)** |
| `8d424836-6090-40c2-ab28-3c86826394c3` | History and Examination of the Gastrointestinal System (2022) | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/HISTORY%20AND%20EXAMINATION%20AND%20INVESTIGATION%20OF%20THE%20GASTROINTESTINAL%20SYSTEM%202022.pptx` | **400** |
| `b31d37d1-544f-4eb1-9aca-355bfa336ab0` | Ethical Principles and Ethics in Surgery | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/ETHICAL%20PRINCIPLES%20AND%20ETHICS%20IN%20SURGERY.pdf` | **400** |
| `aec6da75-8ce2-4c3a-82bc-909c37c22b99` | Gastric Carcinoma | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/GASTRIC%20CARCINOMA.pptx` | **400** |
| `214b1129-ec51-4675-a72f-694cf03787b6` | Surgical Clerkship | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/SURGICAL%20CLERKSHIP.pdf` | **ERROR (This operation was aborted)** |
| `69943f2f-5912-4008-9da4-edb964ece578` | Breast Cancer | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/Breast%20cancer.pptx` | **ERROR (This operation was aborted)** |
| `4813d9e0-6092-4ddf-8bf6-37335f21d6c0` | Adrenal Gland Tumors | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/Adrenal%20gland%20tumors%20400L.pptx` | **ERROR (This operation was aborted)** |
| `5f1af831-1562-4ccd-8b6c-8f9f78c5538d` | Theatre Conduct and Principles of Asepsis | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/Theatre%20Conduct%20and%20Principles%20of%20Asepsis_043152.pptx` | **ERROR (This operation was aborted)** |
| `3f51a197-a49f-4218-bc38-4f793b606f98` | The Final MBBS Examination in Surgery | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/The%20Final%20MBBS%20Examination%20in%20Surgery.ppt` | **ERROR (This operation was aborted)** |
| `70849710-8c3e-44ea-9f2e-f4deb66c9b31` | Superficial Ulcers | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/surgery/Superficial%20ulcers.pptx` | **ERROR (This operation was aborted)** |
| `c219c883-300e-4e5d-a4d3-62b4d4823b17` | Physiology Scanned Past Question 3 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/physiology/IMAG4525.jpg` | **ERROR (This operation was aborted)** |
| `172aa7e1-f241-40c9-a245-97436830dd1b` | Physiology MBBS Q & A | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/physiology/PHYSIOLOGY%20MBBS%20Q%20&%20A.pdf` | **ERROR (This operation was aborted)** |
| `23e2fc5a-7420-47ec-9a3e-3303468b0e32` | Blood MCQ | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/physiology/blood%20mcq.pdf` | **ERROR (This operation was aborted)** |
| `2164741a-99eb-4e20-95e4-420517e72be5` | Physiology Scanned Past Question 2 | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/physiology/IMAG4524.jpg` | **ERROR (This operation was aborted)** |
| `62cb69d7-d2de-454d-86be-4b9554c92f4d` | Terminologies and Evaluation in Dermatology | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/paediatric/Terminologies%20and%20Evaluation%20in%20Dermatology.pptx` | **400** |
| `d35e3e6e-4813-4654-9b9b-2322acd15e84` | Development of the Kidney and Congenital Abnormalities | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/paediatric/Development%20of%20the%20Kidney%20and%20Congenital%20abnormalities%20DT_071231.pptx` | **400** |
| `1cadb0a1-1541-4cbf-9f5b-d68d1f940441` | Rights of the Child and Child Rights Act | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/recommended/paediatric/Rights%20of%20the%20child%20and%20child%20rights%20act%20updated%20march%202026.pptx` | **400** |
| `b1e56fc3-84fc-4606-ad7d-ba3cc03fa539` | Medicine OSCE Checklist and SBA | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/final-year-pq/Med_Medicine%20OSCE%20Check%20list%20and%20SBA.pdf` | **400** |
| `bee70707-f6ab-484f-ab2d-5abccf38ca4d` | 600L MCQ 2018 April | `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/past-questions/final-year-pq/600L%20MCQ%202018%20april.docx` | **400** |

## Tier-Inconsistent Rows

| ID | Title | Current Tier | Current Type | Reason Flagged |
| --- | --- | --- | --- | --- |
| `ba273c9e-a901-4fb6-87b8-dec6f058aab0` | PRC Order Draw Multiple | `recommended` | `tutorial_note` | Unrecognized material type 'tutorial_note' (expected one of: pdf, video, image, slideshare, doc, link, office, lecture_slide, past_question) |
| `ba4ddbb0-de37-4841-8c2b-0d47f1fa72e8` | Guide to Calculations in Chemical Pathology (Alfred Bala Haruna) | `recommended` | `tutorial_note` | Unrecognized material type 'tutorial_note' (expected one of: pdf, video, image, slideshare, doc, link, office, lecture_slide, past_question) |
| `b296ad79-b8e4-4595-b07d-6899104cda40` | Biochemistry Free For All (Ahern) | `study` | `textbook` | Unrecognized material type 'textbook' (expected one of: pdf, video, image, slideshare, doc, link, office, lecture_slide, past_question) |
| `cad09011-6d49-4f9f-bedb-fafea3fbe385` | Biochemistry Free For All (Ahern) | `study` | `textbook` | Unrecognized material type 'textbook' (expected one of: pdf, video, image, slideshare, doc, link, office, lecture_slide, past_question) |
| `2526bd35-ffd2-4238-9925-73d8011edb04` | Histology and Embryology for Dental Hygiene | `study` | `textbook` | Unrecognized material type 'textbook' (expected one of: pdf, video, image, slideshare, doc, link, office, lecture_slide, past_question) |
| `23fa536b-4ebf-4231-9b35-debd8460808f` | Histology and Embryology for Dental Hygiene | `study` | `textbook` | Unrecognized material type 'textbook' (expected one of: pdf, video, image, slideshare, doc, link, office, lecture_slide, past_question) |
| `c26bd708-a9be-4526-a7da-0eed0d66e3cf` | Anatomy and Physiology 2e (OpenStax) | `study` | `textbook` | Unrecognized material type 'textbook' (expected one of: pdf, video, image, slideshare, doc, link, office, lecture_slide, past_question) |
| `4033bb99-8f85-49b0-a8c1-7a688dc5ed37` | Anatomy and Physiology 2e (OpenStax) | `study` | `textbook` | Unrecognized material type 'textbook' (expected one of: pdf, video, image, slideshare, doc, link, office, lecture_slide, past_question) |
| `06186d80-442c-4e1e-b425-4c098b5ac300` | Anatomy and Physiology 2e (OpenStax) | `study` | `textbook` | Unrecognized material type 'textbook' (expected one of: pdf, video, image, slideshare, doc, link, office, lecture_slide, past_question) |
| `97d1feaf-8abc-44f3-b361-bb023b6a2170` | Anatomy and Physiology 2e (OpenStax) | `study` | `textbook` | Unrecognized material type 'textbook' (expected one of: pdf, video, image, slideshare, doc, link, office, lecture_slide, past_question) |
