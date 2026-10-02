-- JositeX: canonical UNIJOS undergraduate academic destinations.
-- Non-destructive: institutional departments, app registrations, courses, profiles,
-- and historical relationships are preserved. Canonical destinations are a new layer.
BEGIN;

CREATE TABLE IF NOT EXISTS public.academic_colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL,
  official_source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_colleges_university_slug_key UNIQUE (university_id, slug),
  CONSTRAINT academic_colleges_university_name_key UNIQUE (university_id, name)
);

CREATE TABLE IF NOT EXISTS public.undergraduate_programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
  college_id uuid REFERENCES public.academic_colleges(id) ON DELETE RESTRICT,
  faculty_id uuid NOT NULL REFERENCES public.faculties(id) ON DELETE RESTRICT,
  institutional_department_id uuid REFERENCES public.departments(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL,
  award text,
  duration_years integer CHECK (duration_years IS NULL OR duration_years BETWEEN 1 AND 10),
  first_level public.academic_level,
  final_level public.academic_level,
  admission_status text NOT NULL DEFAULT 'catalogue_only' CHECK (admission_status IN ('admitted','no_admission','catalogue_only','under_review')),
  is_active boolean NOT NULL DEFAULT true,
  official_source_url text NOT NULL,
  source_verified_at timestamptz NOT NULL DEFAULT now(),
  source_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT undergraduate_programmes_university_slug_key UNIQUE (university_id, slug),
  CONSTRAINT undergraduate_programmes_level_range_check CHECK (
    first_level IS NULL OR final_level IS NULL OR replace(first_level::text, 'L', '')::integer <= replace(final_level::text, 'L', '')::integer
  )
);

ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS academic_scope text NOT NULL DEFAULT 'institutional_department';
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS undergraduate_discovery_eligible boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS undergraduate_programme_id uuid REFERENCES public.undergraduate_programmes(id) ON DELETE SET NULL;
ALTER TABLE public.ecosystem_apps ADD COLUMN IF NOT EXISTS workspace_type text NOT NULL DEFAULT 'universal';
ALTER TABLE public.ecosystem_apps ADD COLUMN IF NOT EXISTS workspace_status text NOT NULL DEFAULT 'available';
ALTER TABLE public.ecosystem_apps ADD COLUMN IF NOT EXISTS undergraduate_programme_id uuid REFERENCES public.undergraduate_programmes(id) ON DELETE SET NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_academic_scope_check') THEN
    ALTER TABLE public.departments ADD CONSTRAINT departments_academic_scope_check CHECK (academic_scope IN ('undergraduate_destination','institutional_department','postgraduate_only','specialist_unit','teaching_unit','legacy'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ecosystem_apps_workspace_type_check') THEN
    ALTER TABLE public.ecosystem_apps ADD CONSTRAINT ecosystem_apps_workspace_type_check CHECK (workspace_type IN ('specialized','universal'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ecosystem_apps_workspace_status_check') THEN
    ALTER TABLE public.ecosystem_apps ADD CONSTRAINT ecosystem_apps_workspace_status_check CHECK (workspace_status IN ('available','planned','disabled'));
  END IF;
END $$;

-- The four parent faculties explicitly identified by the current UNIJOS College of Health Sciences page.
INSERT INTO public.academic_colleges (university_id, name, slug, official_source_url)
SELECT u.id, 'College of Health Sciences', 'college-of-health-sciences', 'https://www.unijos.edu.ng/college-health-sciences'
FROM public.universities u
WHERE lower(u.name) = 'university of jos'
ON CONFLICT (university_id, slug) DO NOTHING;

CREATE TEMP TABLE _unijos_programmes (
  faculty_name text NOT NULL,
  college_name text,
  department_name text,
  name text NOT NULL,
  slug text NOT NULL,
  award text,
  duration_years integer,
  first_level public.academic_level,
  final_level public.academic_level,
  admission_status text NOT NULL,
  source_url text NOT NULL,
  source_note text
) ON COMMIT DROP;

INSERT INTO _unijos_programmes VALUES
('Agriculture',NULL,'Agricultural Economics and Extension','BSc. Agricultural Economics and Extension','bsc-agricultural-economics-and-extension','B.Sc.',4,'100L','400L','admitted','https://www.unijos.edu.ng/node/500','Official UNIJOS undergraduate record: 4 years; numeric level range normalized from the verified four-year record.'),
('Agriculture',NULL,'Animal Production','BSc. Animal Production','bsc-animal-production','B.Sc.',4,'100L','400L','admitted','https://www.unijos.edu.ng/node/503','Official UNIJOS undergraduate record: 4 years.'),
('Agriculture',NULL,NULL,'B.Agriculture','b-agriculture','B.Agriculture',4,'100L','400L','admitted','https://www.unijos.edu.ng/node/501','Official UNIJOS undergraduate record: 4 years.'),
('Architecture',NULL,'Architecture','Architecture','architecture','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/department-architecture','Current official Architecture programme page; 2026/2027 notice places Architecture under Environmental Sciences.'),
('Arts',NULL,'Archeology and Heritage Studies','Archaeology','archaeology','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/505','Current official Arts undergraduate catalogue.'),
('Arts',NULL,'English','English Language','english-language','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/534','Current official undergraduate record: 4 years.'),
('Arts',NULL,'Foreign Languages','French','french','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/536','Current official undergraduate record: 4 years.'),
('Arts',NULL,'History and International Studies','History and International Studies','history-and-international-studies','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/542','Current official Arts taxonomy: 4 years.'),
('Arts',NULL,'Music','Music','music','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/557','Current official undergraduate record: 4 years.'),
('Arts',NULL,'Theatre and Film Arts','Theater and Film Arts Studies','theater-and-film-arts-studies','B.A.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/theater-and-film-arts','Current official undergraduate record: 4 years.'),
('Arts',NULL,'Linguistics and Nigerian Languages','Linguistic','linguistic','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/548','Official UNIJOS spelling retained; 4 years.'),
('Arts',NULL,'Religion Philosophy','Arabic Studies','arabic-studies','B.Sc.',NULL,NULL,NULL,'catalogue_only','https://www.unijos.edu.ng/node/504','Official undergraduate destination; duration unresolved in current source.'),
('Arts',NULL,'Religion Philosophy','Christian Religion Studies','christian-religion-studies','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/512','Current official Arts taxonomy: 4 years.'),
('Arts',NULL,'Religion Philosophy','Islamic Studies','islamic-studies','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/545','Current official undergraduate record: 4 years.'),
('Arts',NULL,'Fine and Applied Arts','Fine and Applied Arts','fine-and-applied-arts','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/537','Current official Arts taxonomy: 4 years.'),
('Basic Medical Sciences', 'College of Health Sciences','Medical Biochemistry','Biochemistry','biochemistry','B.Sc. Biochemistry',5,NULL,NULL,'admitted','https://www.unijos.edu.ng/node/508','2026/2027 notice admits Biochemistry; current programme record says 5 years. Source conflict with older handbook retained in audit notes.'),
('Clinical Sciences', 'College of Health Sciences','Medicine & Surgery','Medicine and Surgery','medicine-and-surgery','MBBS',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','2026/2027 notice explicitly lists Medicine and Surgery under Clinical Sciences; duration unresolved.'),
('Communication and Media Studies',NULL,'Mass Communication','Mass Communication','mass-communication','',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice lists Mass Communication; award and duration unresolved.'),
('Computing',NULL,'Computer Science','Computer Science','computer-science','B.Sc.',4,'100L','400L','admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice plus official course record: 4 years.'),
('Computing',NULL,'Computer Information Science','Computer Information Systems','computer-information-systems','B.Sc.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice and Computing announcement; duration unresolved.'),
('Computing',NULL,'Cyber Security Science','Cyber Security Science','cyber-security-science','B.Sc.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice and Computing announcement; duration unresolved.'),
('Computing',NULL,NULL,'Data Science','data-science','B.Sc.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice and Computing announcement; duration unresolved.'),
('Computing',NULL,NULL,'Information Technology','information-technology','B.Sc.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice and Computing announcement; duration unresolved.'),
('Computing',NULL,'Software Engineering','Software Engineering','software-engineering','B.Sc.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice and Computing announcement; duration unresolved.'),
('Dental Sciences','College of Health Sciences','Child Oral Health','Dentistry','dentistry','Bachelor of Dental Surgery',6,NULL,NULL,'no_admission','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice identifies Dentistry but says No Admission; faculty page identifies Bachelor of Dental Surgery; final numeric level unresolved.'),
('Education',NULL,NULL,'B.Sc. (Ed.) Agricultural Science Education','agricultural-science-education','B.Sc. (Ed.)',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Explicit in current 2026/2027 notice; duration unresolved.'),
('Education',NULL,NULL,'B.Sc. (Ed.) Business Education','business-education','B.Sc. (Ed.)',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Explicit in current 2026/2027 notice; duration unresolved.'),
('Education',NULL,NULL,'B.Ed. Fine and Applied Arts Education','fine-and-applied-arts-education','B.Ed.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Explicit in current 2026/2027 notice; duration unresolved.'),
('Education',NULL,NULL,'B.Ed. Music Education','music-education','B.Ed.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Explicit in current 2026/2027 notice; duration unresolved.'),
('Education',NULL,NULL,'B.Ed. Primary Education','primary-education','B.Ed.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Explicit in current 2026/2027 notice; duration unresolved.'),
('Education',NULL,NULL,'B.Sc. (Ed.) Special Education','special-education','B.Sc. (Ed.)',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/special-education-and-rehabilitation-science','Current official department page states four years; award conflict recorded.'),
('Engineering',NULL,'Civil Engineering','Civil Engineering','civil-engineering','B.Eng.',5,'100L','500L','admitted','https://www.unijos.edu.ng/department-civil-engineering','Current department page states five years.'),
('Engineering',NULL,'Electrical and Electronic Engineering','Electrical Electronics Engineering','electrical-electronics-engineering','B.Eng.',5,'100L','500L','admitted','https://www.unijos.edu.ng/department-electrical-and-electronic-engineering','Admission-list spelling retained; current department page states five years.'),
('Engineering',NULL,'Mechanical Engineering','Mechanical Engineering','mechanical-engineering','B.Eng.',5,'100L','500L','admitted','https://www.unijos.edu.ng/department-mechanical-engineering','Current department page states five years.'),
('Engineering',NULL,'Mining Engineering','Mining Engineering','mining-engineering','B.Eng.',5,'100L','500L','admitted','https://www.unijos.edu.ng/node/556','Current official undergraduate record: five years.'),
('Environmental Sciences',NULL,'Architecture','Architecture','environmental-architecture','B.Sc.',4,'100L','400L','admitted','https://www.unijos.edu.ng/node/506','2026/2027 notice places Architecture under Environmental Sciences; current official record says four years.'),
('Environmental Sciences',NULL,'Building','Building','building','B.Sc.',5,'100L','500L','catalogue_only','https://www.unijos.edu.ng/department-building','Current official department page states five years.'),
('Environmental Sciences',NULL,'Geography','Geography','geography','B.Sc.',NULL,NULL,NULL,'catalogue_only','https://www.unijos.edu.ng/department-geography-and-planning','Current official department page lists B.Sc Geography; duration unresolved.'),
('Health Sciences and Technology','College of Health Sciences','Medical Laboratory Science','Medical Laboratory Science','medical-laboratory-science','B.M.L.S.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice and faculty page; duration unresolved.'),
('Health Sciences and Technology','College of Health Sciences','Nursing Sciences','Nursing Sciences','nursing-sciences','B.N.Sc.',4,'100L','400L','admitted','https://www.unijos.edu.ng/faculty-health-sciences-technology','Current faculty programme panel states four years.'),
('Health Sciences and Technology','College of Health Sciences',NULL,'Bachelor of Radiography','bachelor-of-radiography','B.Rad.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice and faculty page; duration unresolved.'),
('Health Sciences and Technology','College of Health Sciences','Physiotherapy','Doctor of Physiotherapy','doctor-of-physiotherapy','D.PT.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice and faculty page; duration unresolved.'),
('Law',NULL,NULL,'LLB Law','llb-law','LLB',5,'100L','500L','catalogue_only','https://www.unijos.edu.ng/node/936','Current faculty/undergraduate listing says five years; another official record says four, conflict retained.'),
('Management Sciences',NULL,'Accounting','Accounting', 'accounting','',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice; award and duration unresolved.'),
('Management Sciences',NULL,'Business Administration','Business Administration','business-administration','',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice; award and duration unresolved.'),
('Management Sciences',NULL,NULL,'B.Sc. Entrepreneurship Studies','entrepreneurship-studies','B.Sc.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice; duration unresolved.'),
('Management Sciences',NULL,'Actuarial Science','BSc. Actuarial Science','bsc-actuarial-science','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/498','Current official undergraduate record: four years.'),
('Management Sciences',NULL,'Banking and Finance','BSc. Banking and Finance','bsc-banking-and-finance','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/507','Current official undergraduate record: four years.'),
('Management Sciences',NULL,'Business Administration','BSc. Business Management','bsc-business-management','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/510','Current official undergraduate record: four years; department mapping conflict retained.'),
('Management Sciences',NULL,'Insurance','BSc. Insurance','bsc-insurance','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/544','Current official undergraduate record: four years.'),
('Management Sciences',NULL,'Marketing','BSc. Marketing','bsc-marketing','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/549','Current official undergraduate record: four years.'),
('Natural Sciences',NULL,'Statistics','BSc. Statistics','bsc-statistics','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/570','Current official undergraduate record: four years.'),
('Natural Sciences',NULL,'Science Laboratory Technology','BSc. Science Laboratory Technology','bsc-science-laboratory-technology','B.Sc.',4,'100L','400L','admitted','https://www.unijos.edu.ng/node/567','Current official record and 2026/2027 notice.'),
('Natural Sciences',NULL,'Chemistry','BSc. Pure and Applied Chemistry','bsc-pure-and-applied-chemistry','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/564','Current official undergraduate record: four years.'),
('Natural Sciences',NULL,'Plant Science and Technology','BSc. Plant Science and Technology','bsc-plant-science-and-technology','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/561','Current official undergraduate record: four years.'),
('Natural Sciences',NULL,'Physics','BSc. Physics','bsc-physics','B.Sc.',4,'100L','400L','catalogue_only','https://www.unijos.edu.ng/node/560','Current official undergraduate record: four years.'),
('Natural Sciences',NULL,'Mathematics','BSc. Mathematics','bsc-mathematics','B.Sc.',NULL,NULL,NULL,'catalogue_only','https://www.unijos.edu.ng/node/551','Current official undergraduate record; duration unresolved.'),
('Natural Sciences',NULL,'Microbiology','BSc. Microbiology','bsc-microbiology','B.Sc.',4,'100L','400L','admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','2026/2027 notice places Microbiology under Natural Sciences; detail page classification conflict retained.'),
('Natural Sciences',NULL,NULL,'B.Sc. Forensic Science','forensic-science','B.Sc.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice; duration unresolved.'),
('Pharmaceutical Sciences',NULL,NULL,'Doctor of Pharmacy','doctor-of-pharmacy','Doctor of Pharmacy',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice; duration unresolved.'),
('Pharmaceutical Sciences',NULL,NULL,'B.Sc. Pharmacology','bsc-pharmacology','B.Sc.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice and NUC approval; duration unresolved.'),
('Social Sciences',NULL,'Criminology and Security Studies','Criminology','criminology','B.Sc.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice; title and duration unresolved.'),
('Social Sciences',NULL,'Economics','Economics','economics','B.Sc.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice; duration unresolved.'),
('Social Sciences',NULL,'Psychology','Psychology','psychology','B.Sc.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice; duration unresolved.'),
('Social Sciences',NULL,NULL,'Public Administration','public-administration','B.Sc.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice; faculty department status unresolved.'),
('Social Sciences',NULL,NULL,'Social Work and Social Administration','social-work-and-social-administration','B.Sc.',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice; faculty-page destination status unresolved.'),
('Social Sciences',NULL,'Political Science','Political Science','political-science','B.Sc.',NULL,NULL,NULL,'catalogue_only','https://www.unijos.edu.ng/faculty-social-sciences','Current official faculty programme page; retained for POLITEIA.'),
('Social Sciences',NULL,'Sociology','Sociology','sociology','B.Sc.',NULL,NULL,NULL,'catalogue_only','https://www.unijos.edu.ng/faculty-social-sciences','Current official faculty programme page.'),
('Veterinary Medicine',NULL,'Veterinary Medicine and Surgery','Veterinary Medicine','veterinary-medicine','DVM',NULL,NULL,NULL,'admitted','https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise','Current notice and faculty page; duration unresolved.');

INSERT INTO public.undergraduate_programmes (
  university_id, college_id, faculty_id, institutional_department_id, name, slug, award,
  duration_years, first_level, final_level, admission_status, official_source_url, source_note
)
SELECT u.id, c.id, f.id, d.id, p.name, p.slug, NULLIF(p.award,''), p.duration_years,
       p.first_level, p.final_level, p.admission_status, p.source_url, p.source_note
FROM _unijos_programmes p
JOIN public.universities u ON lower(u.name) = 'university of jos'
JOIN public.faculties f ON f.university_id = u.id AND lower(f.name) = lower(p.faculty_name)
LEFT JOIN public.academic_colleges c ON c.university_id = u.id AND lower(c.name) = lower(p.college_name)
LEFT JOIN public.departments d ON d.university_id = u.id AND d.faculty_id = f.id AND lower(d.name) = lower(p.department_name)
ON CONFLICT (university_id, slug) DO UPDATE SET
  faculty_id = EXCLUDED.faculty_id,
  college_id = EXCLUDED.college_id,
  institutional_department_id = COALESCE(public.undergraduate_programmes.institutional_department_id, EXCLUDED.institutional_department_id),
  award = EXCLUDED.award,
  duration_years = EXCLUDED.duration_years,
  first_level = EXCLUDED.first_level,
  final_level = EXCLUDED.final_level,
  admission_status = EXCLUDED.admission_status,
  official_source_url = EXCLUDED.official_source_url,
  source_note = EXCLUDED.source_note,
  updated_at = now();

-- Mark only exact, evidence-backed institutional destinations as discovery-eligible.
UPDATE public.departments d SET academic_scope = 'undergraduate_destination', undergraduate_discovery_eligible = true
WHERE EXISTS (SELECT 1 FROM public.undergraduate_programmes p WHERE p.institutional_department_id = d.id);
UPDATE public.departments d SET academic_scope = CASE
  WHEN lower(d.name) IN ('chemical pathology','haematology and blood transfusion','histopathology','medical microbiology','clinical pharmacology and therapeutics','anaesthesiology','community medicine','family medicine','ophthalmology','psychiatry','radiology','surgery','obstetrics and gynaecology','commercial law','private law','public law','international law and jurisprudence','pharmacology and toxicology','pharmaceutical and medicinal chemistry','pharmaceutics','pharmacognosy and traditional medicine','remedial sciences') THEN 'specialist_unit'
  ELSE 'institutional_department' END
WHERE NOT undergraduate_discovery_eligible;

-- Preserve the existing specialized registrations and mark every other existing
-- registration as a universal workspace. No app row is deleted or renamed.
UPDATE public.ecosystem_apps SET workspace_type = CASE WHEN slug IN ('medhaven','politeia') THEN 'specialized' ELSE 'universal' END,
  workspace_status = 'available';
UPDATE public.ecosystem_apps a SET undergraduate_programme_id = p.id
FROM public.undergraduate_programmes p
WHERE p.institutional_department_id = a.department_id;
UPDATE public.ecosystem_apps SET route_prefix = '/workspace' WHERE workspace_type = 'universal';
UPDATE public.ecosystem_apps SET route_prefix = '/medhaven' WHERE slug = 'medhaven';
UPDATE public.ecosystem_apps SET route_prefix = '/politeia' WHERE slug = 'politeia';

-- Profile rows are intentionally not backfilled here: the production profile trigger
-- protects owner-managed profile changes. New onboarding writes the canonical FK.

CREATE OR REPLACE FUNCTION public.complete_undergraduate_profile_onboarding(
  p_full_name text,
  p_university_id uuid,
  p_faculty_id uuid,
  p_undergraduate_programme_id uuid,
  p_level public.academic_level
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_programme public.undergraduate_programmes;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_programme FROM public.undergraduate_programmes
  WHERE id = p_undergraduate_programme_id AND university_id = p_university_id AND faculty_id = p_faculty_id AND is_active;
  IF v_programme.id IS NULL THEN RAISE EXCEPTION 'Invalid undergraduate programme selection'; END IF;
  IF v_programme.first_level IS NOT NULL AND (p_level::text)::integer < replace(v_programme.first_level::text, 'L', '')::integer THEN RAISE EXCEPTION 'Selected level is below this programme range'; END IF;
  IF v_programme.final_level IS NOT NULL AND (p_level::text)::integer > replace(v_programme.final_level::text, 'L', '')::integer THEN RAISE EXCEPTION 'Selected level is above this programme range'; END IF;
  INSERT INTO public.profiles (id, full_name, university_id, faculty_id, department_id, department, current_level, undergraduate_programme_id)
  VALUES ((SELECT auth.uid()), p_full_name, p_university_id, p_faculty_id, v_programme.institutional_department_id,
    v_programme.name, p_level, v_programme.id)
  ON CONFLICT (id) DO UPDATE SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    university_id = EXCLUDED.university_id, faculty_id = EXCLUDED.faculty_id,
    department_id = COALESCE(EXCLUDED.department_id, public.profiles.department_id),
    department = EXCLUDED.department, current_level = EXCLUDED.current_level,
    undergraduate_programme_id = EXCLUDED.undergraduate_programme_id, updated_at = now();
END;
$$;
REVOKE EXECUTE ON FUNCTION public.complete_undergraduate_profile_onboarding(text, uuid, uuid, uuid, public.academic_level) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_undergraduate_profile_onboarding(text, uuid, uuid, uuid, public.academic_level) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_undergraduate_programmes_directory ON public.undergraduate_programmes (university_id, is_active, faculty_id, college_id, name);
CREATE INDEX IF NOT EXISTS idx_undergraduate_programmes_department ON public.undergraduate_programmes (institutional_department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_undergraduate_programme ON public.profiles (undergraduate_programme_id);
CREATE INDEX IF NOT EXISTS idx_ecosystem_apps_undergraduate_programme ON public.ecosystem_apps (undergraduate_programme_id, workspace_status);

ALTER TABLE public.academic_colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.undergraduate_programmes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view academic colleges" ON public.academic_colleges;
CREATE POLICY "Public can view academic colleges" ON public.academic_colleges FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can view undergraduate programmes" ON public.undergraduate_programmes;
CREATE POLICY "Public can view undergraduate programmes" ON public.undergraduate_programmes FOR SELECT USING (is_active);
GRANT SELECT ON public.academic_colleges, public.undergraduate_programmes TO anon, authenticated;

COMMENT ON TABLE public.undergraduate_programmes IS 'Student-facing UNIJOS undergraduate destinations; institutional departments remain a separate compatibility layer.';
COMMENT ON COLUMN public.undergraduate_programmes.first_level IS 'Nullable when current official UNIJOS sources do not state a numbered first level.';
COMMENT ON COLUMN public.undergraduate_programmes.final_level IS 'Nullable when current official UNIJOS sources do not state a numbered final level.';
COMMENT ON COLUMN public.ecosystem_apps.workspace_type IS 'Registration type: specialized app or universal JositeX destination workspace.';

COMMIT;
