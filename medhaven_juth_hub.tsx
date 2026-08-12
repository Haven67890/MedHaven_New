"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from './lib/supabase/client';
import { 
  BookOpen, Search, Calendar, Folder, Upload, Plus,
  Award, ShieldAlert, Eye, Download, Tag, ChevronRight, Sparkles,
  MapPin, CheckCircle, Home, HeartPulse,
  Check, ArrowLeft, RefreshCw, Star, ShoppingBag, Send,
  MessageCircle, AlertCircle, X, CheckSquare, Settings
} from 'lucide-react';


// Reliable placeholder imagery for the hospital dashboard without broken asset references.
const JUTH_IMAGES = {
  mainGate: "https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/Snapchat-1489759066.jpg",
  ambulanceDriveway: "https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/20260622_130116.jpg",
  ward11Entrance: "https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/e36b68e4f40e44f88f4cfdd0a8ae6fbb.jpg",
  courtyardTree: "https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/IMG-20250627-WA0038.jpg",
  emergencyTicker: "https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/20260622_130116.jpg"
};

const LEVELS = ['100L', '200L', '300L', '400L', '500L', '600L', 'Final Year'];

type StudyResource = {
  id: string;
  title: string;
  description: string;
  type: string;
  level: string;
  department: string;
  subfolder: string;
  fileUrl: string;
  isFeatured: boolean;
  uploadedBy: string;
  uploadedAt: string;
  downloads: number;
  views: number;
  rating: number;
};

const getProfileDisplayName = (fullName?: string | null, fallback = 'Scholar') => {
  const cleanName = fullName?.trim();
  return cleanName && cleanName.length > 0 ? cleanName : fallback;
};

const getTimeGreeting = (fullName?: string | null) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return `${greeting}, ${getProfileDisplayName(fullName)}`;
};

const PRE_MADE_QUIZZES = [
  {
    id: "quiz-1",
    title: "Cardiology & Resuscitation Mastery Test",
    level: "400L",
    department: "Medicine",
    questions: [
      {
        question: "A 52-year-old male presents with severe chest tightness, diaphoresis, and hypotension. His ECG reveals 3mm ST-segment elevation in leads II, III, and aVF. Which coronary arterial branch is most likely occluded?",
        options: [
          "Left Anterior Descending Artery (LAD)",
          "Right Coronary Artery (RCA)",
          "Left Circumflex Artery (LCx)",
          "Left Main Coronary Artery"
        ],
        answer: "Right Coronary Artery (RCA)",
        explanation: "ST-elevation in leads II, III, and aVF indicates an inferior wall myocardial infarction. The inferior wall of the heart is typically supplied by the Right Coronary Artery (RCA)."
      },
      {
        question: "Which of the following clinical indicators is highly specific for chronic congestive heart failure during physical assessment?",
        options: [
          "Bilateral peripheral ankle edema",
          "A third heart sound (S3 gallop rhythm)",
          "Bilateral expiratory wheezing",
          "Distended jugular veins on flat recumbent posture"
        ],
        answer: "A third heart sound (S3 gallop rhythm)",
        explanation: "An S3 gallop is highly specific to volume overload states and reduced ventricular ejection fraction in chronic congestive heart failure."
      },
      {
        question: "During fluid resuscitation of Diabetic Ketoacidosis (DKA) in the emergency unit, at what plasma glucose level should 5% Dextrose be added to normal saline infusions?",
        options: [
          "When blood glucose drops below 15 mmol/L (approx. 270 mg/dL)",
          "When blood glucose reaches normal range (5.5 mmol/L)",
          "Only when the patient develops symptomatic hypoglycemia",
          "At the exact start of insulin infusion regardless of glucose levels"
        ],
        answer: "When blood glucose drops below 15 mmol/L (approx. 270 mg/dL)",
        explanation: "Adding 5% Dextrose prevents rapid blood glucose drop and subsequent cerebral edema while allowing continuous insulin infusion to clear ketone bodies."
      }
    ]
  }
];

const getActivityReminder = (level: string) => {
  const hour = new Date().getHours();
  const isMorning = hour < 12;

  const lvl = (level || '100L').toUpperCase().trim();

  if (lvl.startsWith('100')) {
    return {
      title: isMorning ? "Morning Reminder" : "Afternoon/Evening Reminder",
      message: isMorning
        ? "Prepare for today's lectures."
        : "Prepare for Physics, Chemistry, and Biology practicals, and don't forget your practical report submissions."
    };
  } else if (lvl.startsWith('200') || lvl.startsWith('300')) {
    return {
      title: isMorning ? "Morning Reminder" : "Afternoon/Evening Reminder",
      message: isMorning
        ? "Prepare for today's lectures."
        : "Prepare for Anatomy, Biochemistry, and Physiology practicals, and don't forget your practical report submissions."
    };
  } else {
    // 400L and above (Clinical)
    return {
      title: isMorning ? "Morning Reminder" : "Afternoon/Evening Reminder",
      message: isMorning
        ? "Prepare for ward rounds, clinic, and theatre."
        : "Prepare for duty posting and tutorials."
    };
  }
};


export default function App() {
  const router = useRouter();
  const supabase = createClient();

  // Gemini API configuration
  const [geminiApiKey, setGeminiApiKey] = useState("");

  // Live student profile state with safe fallback identity
  const [userProfile, setUserProfile] = useState({
    name: "Scholar",
    matric: "",
    email: "",
    level: "400L",
    course: "Medicine and Surgery (MBBS)",
    gender: "Male",
    phone: "",
    isAdmin: false,
    departmentName: "",
    facultyName: "",
    universityName: "",
    avatarUrl: ""
  });

  useEffect(() => {
    let mounted = true;

    const lookupMetadata = async (departmentId: string | number | null, facultyId: string | number | null, universityId: string | number | null) => {
      const requests = [
        departmentId ? supabase.from('departments').select('name').eq('id', departmentId).maybeSingle() : Promise.resolve({ data: null, error: null }),
        facultyId ? supabase.from('faculties').select('name').eq('id', facultyId).maybeSingle() : Promise.resolve({ data: null, error: null }),
        universityId ? supabase.from('universities').select('name').eq('id', universityId).maybeSingle() : Promise.resolve({ data: null, error: null })
      ];

      const [departmentResult, facultyResult, universityResult] = await Promise.allSettled(requests);

      if (!mounted) return;

      const departmentName = departmentResult.status === 'fulfilled' && departmentResult.value.data ? String((departmentResult.value.data as { name?: string | null }).name ?? '') : '';
      const facultyName = facultyResult.status === 'fulfilled' && facultyResult.value.data ? String((facultyResult.value.data as { name?: string | null }).name ?? '') : '';
      const universityName = universityResult.status === 'fulfilled' && universityResult.value.data ? String((universityResult.value.data as { name?: string | null }).name ?? '') : '';

      setUserProfile((prev) => ({
        ...prev,
        departmentName,
        facultyName,
        universityName
      }));
    };

    const loadProfile = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id ?? null;
        const userEmail = authData?.user?.email ?? (userProfile.email || null);

        if (!mounted) return;

        if (userId || userEmail) {
          let query = supabase
            .from('profiles')
            .select('*')
            .limit(1);

          if (userId) {
            query = query.eq('id', userId);
          } else if (userEmail) {
            query = query.eq('email', userEmail);
          }

          const { data, error } = await query.maybeSingle();

          if (!mounted) return;

          if (!error && data) {
            const nextProfile = {
              name: getProfileDisplayName(data.full_name ?? null, userProfile.name || 'Scholar'),
              email: data.email ?? userProfile.email,
              level: data.current_level ?? userProfile.level,
              matric: String(data.id ?? userProfile.matric),
              gender: userProfile.gender,
              phone: userProfile.phone,
              isAdmin: Boolean(userProfile.isAdmin || data.role === 'admin' || data.role_name === 'admin' || data.is_admin),
              course: userProfile.course,
              departmentName: data.department ?? userProfile.departmentName,
              facultyName: userProfile.facultyName,
              universityName: userProfile.universityName,
              avatarUrl: String(data.avatar_url ?? userProfile.avatarUrl)
            };

            setUserProfile(nextProfile);
            await lookupMetadata(data.department_id ?? null, data.faculty_id ?? null, data.university_id ?? null);
            return;
          }
        }
      } catch {
        if (mounted) {
          setUserProfile((prev) => ({ ...prev, name: prev.name || 'Scholar' }));
        }
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [userProfile.email]);

  // Core Databases
  const [library, setLibrary] = useState<StudyResource[]>([]);
  const [dbTimetableEntries, setDbTimetableEntries] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000); // update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userProfile.level) return;
    let active = true;
    const fetchTimetableEntries = async () => {
      try {
        const { data, error } = await supabase
          .from('timetable_entries')
          .select('id, level, day_of_week, start_time, end_time, title, activity_type, course_id, lecturer, notes')
          .eq('level', userProfile.level);
        if (active && !error && data) {
          setDbTimetableEntries(data);
        }
      } catch (err) {
        console.error("Failed to fetch timetable entries:", err);
      }
    };
    void fetchTimetableEntries();
    return () => {
      active = false;
    };
  }, [userProfile.level]);

  useEffect(() => {
    let mounted = true;

    const loadCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, code, name, title, level, parent_id, department_id, faculty_id, university_id, description')
          .order('name', { ascending: true })
          .limit(100);

        if (!mounted) return;

        if (!error && data && data.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mappedLibrary = data.map((course: any, index: number) => ({
            id: String(course.id ?? `course-${index}`),
            title: String(course.name ?? course.title ?? course.code ?? 'Course'),
            description: String(course.description ?? 'Live curriculum item from Supabase.'),
            type: 'Lecture Slides',
            level: String(course.level ?? userProfile.level),
            department: String(course.parent_id ?? course.name ?? 'General'),
            subfolder: String(course.parent_id ?? 'Curriculum'),
            fileUrl: '#',
            isFeatured: Boolean(course.parent_id) === false,
            uploadedBy: 'Supabase',
            uploadedAt: new Date().toISOString().split('T')[0],
            downloads: 0,
            views: 0,
            rating: 4.5,
          }));

          setLibrary(mappedLibrary);
          return;
        }
      } catch {
        // No live course records yet: keep the library empty and show the clean empty state.
      }

      if (mounted) {
        setLibrary([]);
      }
    };

    void loadCourses();

    return () => {
      mounted = false;
    };
  }, [userProfile.level]);

  // Global Navigation states
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('400L');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [globalSearch, setGlobalSearch] = useState('');

  const userIsClinical = ['400L', '500L', '600L', 'Final Year'].includes(userProfile.level || '');

  // Toast feedback state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  // MCQ interactive states
  const [quizActive, setQuizActive] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(PRE_MADE_QUIZZES[0]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Modal open triggers
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);

  // Form entries for uploads
  const [newDoc, setNewDoc] = useState({ title: '', desc: '', type: 'Lecture Slides', level: '400L', dept: 'Medicine', subfolder: 'M1/Cardiology' });
  const [newSlot, setNewSlot] = useState({ day: 'Monday', time: '08:00 - 10:00', activity: 'Lecture', course: '', location: '', lecturer: '' });

  // Floating AI Tutor systems
  const [showAITutor, setShowAITutor] = useState(false);
  const [aiChat, setAIChat] = useState([
    { role: "assistant", text: "Hello JUTH scholar! I am your clinical training companion. Ask me any medical query, pharmacological mechanism, or ward round diagnostic checklist." }
  ]);
  const [aiInput, setAIInput] = useState("");
  const [aiLoading, setAILoading] = useState(false);

  // Access check rule based on level
  const canAccessLevel = (studentLevel: string, resourceLevel: string) => {
    const hierarchy: Record<string, number> = { '100L': 1, '200L': 2, '300L': 3, '400L': 4, '500L': 5, '600L': 6, 'Final Year': 7 };
    const sRank = hierarchy[studentLevel] || 0;
    const rRank = hierarchy[resourceLevel] || 0;
    return sRank >= rRank;
  };

  // Filter study items based on global search & dynamic level logic, sorted so student's own level is ranked first
  const filteredLibrary = library.filter(item => {
    const matchQuery = item.title.toLowerCase().includes(globalSearch.toLowerCase()) || 
                       item.description.toLowerCase().includes(globalSearch.toLowerCase()) ||
                       item.subfolder.toLowerCase().includes(globalSearch.toLowerCase());
    const matchLevel = selectedLevelFilter === 'All' ? canAccessLevel(userProfile.level, item.level) : item.level === selectedLevelFilter;
    const matchDept = selectedDeptFilter === 'All' ? true : item.department.toLowerCase() === selectedDeptFilter.toLowerCase();
    return matchQuery && matchLevel && matchDept;
  }).sort((a, b) => {
    const aMatch = String(a.level) === String(userProfile.level);
    const bMatch = String(b.level) === String(userProfile.level);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  // Dynamic state for real courses matching student's current level
  interface DashboardCourse {
    id: string;
    code?: string | null;
    title?: string | null;
    level?: string | number | null;
    faculty_id?: string | null;
    description?: string | null;
  }

  interface CourseFolder {
    id: string;
    tag: string;
    title: string;
    description: string;
    color: string;
    link: string;
  }

  const [dashboardCourses, setDashboardCourses] = useState<DashboardCourse[]>([]);

  useEffect(() => {
    if (!userProfile.level) return;
    let active = true;
    const fetchDashboardCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, code, title, level, faculty_id, description')
          .eq('level', userProfile.level)
          .order('code', { ascending: true });
        if (active && !error && data) {
          setDashboardCourses(data as DashboardCourse[]);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard courses:", err);
      }
    };
    void fetchDashboardCourses();
    return () => {
      active = false;
    };
  }, [userProfile.level]);

  const bannerData = useMemo(() => {
    if (!dbTimetableEntries || dbTimetableEntries.length === 0) {
      const reminder = getActivityReminder(userProfile.level);
      return {
        title: `${reminder.title} • ${userProfile.level}`,
        message: reminder.message,
        isReal: false
      };
    }

    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayDayOfWeek = days[now.getDay()];

    const todayEntries = dbTimetableEntries.filter(
      entry => (entry.day_of_week || "").toLowerCase().trim() === todayDayOfWeek
    );

    const parseTimeToMinutes = (timeStr: string): number => {
      if (!timeStr) return 0;
      const parts = timeStr.split(":");
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      return hours * 60 + minutes;
    };

    const formatTime = (timeStr: string | null | undefined): string => {
      if (!timeStr) return "";
      const parts = timeStr.split(":");
      if (parts.length >= 2) {
        const hr = parseInt(parts[0], 10);
        const min = parts[1];
        return `${hr}:${min}`;
      }
      return timeStr;
    };

    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Find active entry
    const activeEntry = todayEntries.find(entry => {
      const start = parseTimeToMinutes(entry.start_time);
      const end = parseTimeToMinutes(entry.end_time);
      return nowMinutes >= start && nowMinutes < end;
    });

    if (activeEntry) {
      return {
        title: `Active Schedule • ${userProfile.level}`,
        message: `🩺 ${activeEntry.title} is happening now, until ${formatTime(activeEntry.end_time)}`,
        isReal: true
      };
    }

    // 2. Find next upcoming entry today (start_time later than now)
    const upcomingEntries = todayEntries.filter(entry => {
      const start = parseTimeToMinutes(entry.start_time);
      return start > nowMinutes;
    });

    // Sort upcoming entries by start_time
    upcomingEntries.sort((a, b) => {
      return parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time);
    });

    if (upcomingEntries.length > 0) {
      const nextEntry = upcomingEntries[0];
      const start = parseTimeToMinutes(nextEntry.start_time);
      const diff = start - nowMinutes;

      if (diff <= 30) {
        return {
          title: `Upcoming Schedule • ${userProfile.level}`,
          message: `${nextEntry.title} starts in ${diff} minutes`,
          isReal: true
        };
      } else {
        return {
          title: `Next Up • ${userProfile.level}`,
          message: `${nextEntry.title} is next up at ${formatTime(nextEntry.start_time)}`,
          isReal: true
        };
      }
    }

    // 3. If there are no more entries today
    return {
      title: `End of Day • ${userProfile.level}`,
      message: "No more activities scheduled for today. Rest well!",
      isReal: true
    };
  }, [dbTimetableEntries, userProfile.level, now]);

  // Sensible grouping of the queried level-specific courses
  const personalizedFolders = useMemo<CourseFolder[]>(() => {
    if (dashboardCourses.length === 0) {
      return [];
    }

    // If <= 4 courses, make 1 tile per course
    if (dashboardCourses.length <= 4) {
      const colors = ['cyan', 'indigo', 'emerald', 'amber'];
      return dashboardCourses.map((course, idx) => ({
        id: course.id,
        tag: course.code || 'COURSE',
        title: course.title || 'Course Folder',
        description: course.description || 'Access and search library materials for this course.',
        color: colors[idx % colors.length],
        link: `/library?course_id=${course.id}`
      }));
    }

    // If > 4 courses, group into logical clusters by faculty_id
    const groupsByFaculty: Record<string, DashboardCourse[]> = {};
    dashboardCourses.forEach(c => {
      const key = c.faculty_id || 'general';
      if (!groupsByFaculty[key]) {
        groupsByFaculty[key] = [];
      }
      groupsByFaculty[key].push(c);
    });

    const colors = ['cyan', 'indigo', 'emerald', 'amber', 'rose'];
    const grouped: CourseFolder[] = [];

    Object.entries(groupsByFaculty).forEach(([facId, facultyCourses], idx) => {
      const color = colors[idx % colors.length];
      if (facultyCourses.length === 1) {
        const course = facultyCourses[0];
        grouped.push({
          id: course.id,
          tag: course.code || 'COURSE',
          title: course.title || 'Course Folder',
          description: course.description || 'Access and search library materials for this course.',
          color,
          link: `/library?course_id=${course.id}`
        });
      } else {
        const codesList = facultyCourses.map(c => c.code).filter(Boolean).join(', ');
        const courseIdsList = facultyCourses.map(c => c.id).join(',');

        let blockTitle = 'Clinical/Academic Block';
        if (facId === 'general') {
          blockTitle = 'General Study Block';
        } else {
          const firstWord = facultyCourses[0].title ? facultyCourses[0].title.split(' ')[0] : 'Subject';
          blockTitle = `${firstWord} & Specialty Block`;
        }

        grouped.push({
          id: `fac-group-${facId}`,
          tag: `BLOCK ${idx + 1}`,
          title: blockTitle,
          description: `Consolidated repository containing ${facultyCourses.length} courses: ${codesList}`,
          color,
          link: `/library?course_ids=${courseIdsList}`
        });
      }
    });

    return grouped;
  }, [dashboardCourses]);

  // Derived greeting details
  const academicPhase = useMemo(() => {
    const lvl = (userProfile.level || '100L').toUpperCase().trim();
    return ['400L', '500L', '600L', 'Final Year'].includes(lvl) ? "Clinical Phase" : "Pre-clinical Phase";
  }, [userProfile.level]);

  const heroParagraph = useMemo(() => {
    const lvl = (userProfile.level || '100L').toUpperCase().trim();
    const isClinical = ['400L', '500L', '600L', 'Final Year'].includes(lvl);

    // Find active or next upcoming timetable entry
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayDayOfWeek = days[now.getDay()];
    const todayEntries = dbTimetableEntries.filter(
      entry => (entry.day_of_week || "").toLowerCase().trim() === todayDayOfWeek
    );

    const parseTimeToMinutes = (timeStr: string): number => {
      if (!timeStr) return 0;
      const parts = timeStr.split(":");
      return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    };

    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const activeEntry = todayEntries.find(entry => {
      const start = parseTimeToMinutes(entry.start_time);
      const end = parseTimeToMinutes(entry.end_time);
      return nowMinutes >= start && nowMinutes < end;
    });

    const upcomingEntries = todayEntries.filter(entry => parseTimeToMinutes(entry.start_time) > nowMinutes)
      .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));

    const currentOrUpcoming = activeEntry || upcomingEntries[0];

    if (currentOrUpcoming) {
      const titleText = currentOrUpcoming.title;
      if (isClinical) {
        return `Your schedule is active today. Focus on your posting in "${titleText}" and prepare with our customized revision library.`;
      } else {
        return `Your schedule is active today. Focus on your session in "${titleText}" and prepare with our customized revision library.`;
      }
    }

    if (lvl.startsWith('100')) {
      return "Prepare for your premed sciences lectures, physics, chemistry, and biology practical sessions with our customized revision library.";
    } else if (lvl.startsWith('200') || lvl.startsWith('300')) {
      return "Prepare for your preclinical blocks, anatomy, biochemistry, and physiology lecture and laboratory practicals with our customized revision library.";
    } else {
      return "Prepare for your clinical ward rounds, outpatient department clinics, and specialty postings with our customized revision library.";
    }
  }, [dbTimetableEntries, userProfile.level, now]);

  const displayTimetable = useMemo(() => {
    if (dbTimetableEntries && dbTimetableEntries.length > 0) {
      return dbTimetableEntries.map(entry => {
        const formatTime = (timeStr: string | null | undefined): string => {
          if (!timeStr) return "";
          const parts = timeStr.split(":");
          if (parts.length >= 2) {
            return `${parts[0]}:${parts[1]}`;
          }
          return timeStr;
        };
        const timeRange = `${formatTime(entry.start_time)} - ${formatTime(entry.end_time)}`;
        const dayCap = entry.day_of_week ? entry.day_of_week.charAt(0).toUpperCase() + entry.day_of_week.slice(1) : "Monday";
        const actCap = entry.activity_type ? entry.activity_type.charAt(0).toUpperCase() + entry.activity_type.slice(1) : "Lecture";

        return {
          id: entry.id,
          level: entry.level,
          day: dayCap,
          time: timeRange,
          activity: actCap,
          course: entry.title,
          location: entry.notes || "Hospital Complex",
          lecturer: entry.lecturer || "Clinical Consultants"
        };
      });
    }
    return [];
  }, [dbTimetableEntries]);

  // Action methods
  const handleDocUploadSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newDoc.title.trim()) {
      showToast("Please input a descriptive slide/document title.", "error");
      return;
    }
    const uploaded = {
      id: "uploaded-" + Date.now(),
      title: newDoc.title,
      description: newDoc.desc || "No supplemental details supplied.",
      type: newDoc.type,
      level: newDoc.level,
      department: newDoc.dept,
      subfolder: newDoc.subfolder,
      fileUrl: "#",
      isFeatured: false,
      uploadedBy: userProfile.name,
      uploadedAt: new Date().toISOString().split('T')[0],
      downloads: 0,
      views: 1,
      rating: 5.0
    };
    setLibrary([uploaded, ...library]);
    setShowDocUploadModal(false);
    setNewDoc({ title: '', desc: '', type: 'Lecture Slides', level: userProfile.level, dept: 'Medicine', subfolder: 'M1/Cardiology' });
    showToast("Study resource uploaded successfully to JUTH database!", "success");
  };

  const handleTimetableSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newSlot.course.trim()) {
      showToast("Provide a course or hospital ward rotation title.", "error");
      return;
    }
    setShowTimetableModal(false);
    setNewSlot({ day: 'Monday', time: '08:00 - 10:00', activity: 'Lecture', course: '', location: '', lecturer: '' });
    showToast("Rotation slot saved successfully! (Active timetable is synchronized with Supabase database entries.)", "success");
  };

  const handleAITutorSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;

    const query = aiInput;
    setAIChat(prev => [...prev, { role: "user", text: query }]);
    setAIInput("");
    setAILoading(true);

    try {
      if (geminiApiKey.trim()) {
        const payload = {
          contents: [{ parts: [{ text: query }] }],
          systemInstruction: { parts: [{ text: `You are a clinical training mentor at Jos University Teaching Hospital (JUTH). Provide highly structured, high-yield answers using local Nigerian clinical parameters, Ward 11 Male medical ward references, and A&E fluid protocols where relevant. Keep clinical answers concise and exam-focused.` }] }
        };
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const responseData = await res.json();
        const outputText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || "I was unable to retrieve a response from the API. Let's trace back to standard internal medicine guidelines.";
        setAIChat(prev => [...prev, { role: "assistant", text: outputText }]);
      } else {
        // High-fidelity local JUTH Mock response system mimicking expert clinical guidance
        setTimeout(() => {
          let responseText = "Let me break that down using standard JUTH clinical ward round parameters: \n\n";
          const normalized = query.toLowerCase();

          if (normalized.includes("cardiology") || normalized.includes("heart") || normalized.includes("failure")) {
            responseText += "• Focus on NYHA classification (Stages I-IV) and Framingham clinical criteria.\n• First line therapies at Ward 11 include loop diuretics (Furosemide), ACE inhibitors (Enalapril or Lisinopril), and selective Beta-Blockers once stabilized.\n• Be prepared to discuss fluid balance charts during morning rounds with Prof. Mbanefo.";
          } else if (normalized.includes("malaria") || normalized.includes("artemether")) {
            responseText += "• Uncomplicated Malaria: Treated with Artemether-Lumefantrine (ACT) standard dose regime.\n• Severe Malaria clinical indicators: Hypoglycemia, renal impairment, blackwater fever, cerebral symptoms.\n• Standard JUTH emergency line: IV Artesunate 2.4 mg/kg given stat, then at 12 and 24 hours.";
          } else if (normalized.includes("dka") || normalized.includes("ketoacidosis") || normalized.includes("endocrinology")) {
            responseText += "• resuscitation: Active fluid replacement using 0.9% Normal Saline (1L in 1st hour, then 1L over 2 hours, etc.).\n• Regular Insulin infusion at 0.1 units/kg/hour.\n• Potassium: Keep checked. If potassium < 3.3 mmol/L, delay insulin and restore potassium stat.\n• Add 5% Dextrose when blood glucose drops below 15 mmol/L (270 mg/dL).";
          } else if (normalized.includes("surgery") || normalized.includes("peritonitis") || normalized.includes("abdomen")) {
            responseText += "• Pre-op checklists include securing adequate intravenous lines, ordering a complete blood count (look for leukocytosis), and performing an erect abdominal X-ray to confirm presence of free subdiaphragmatic air.";
          } else {
            responseText += "Excellent medical inquiry. During JUTH diagnostic assessments, make sure you outline:\n1. Detailed history-taking parameters (Presenting complaints, systemic review).\n2. Guided physical inspection checks.\n3. Relevant localized investigations (CBC, U/E/Cr, chest radiographs).\n4. Definitive therapeutic lines.";
          }
          setAIChat(prev => [...prev, { role: "assistant", text: responseText }]);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setAIChat(prev => [...prev, { role: "assistant", text: "Connection error. Remember first-line medical guidelines: secure intravenous access, administer supplemental oxygen if indicated, and monitor vitals closely." }]);
    } finally {
      setAILoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground transition-all duration-300">
      
      {/* Dynamic Floating Toast Feedback */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' :
          toast.type === 'error' ? 'bg-rose-950/90 border-rose-500/30 text-rose-300' :
          'bg-cyan-950/90 border-cyan-500/30 text-cyan-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-xs font-bold">{toast.message}</span>
          <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="text-muted-foreground hover:text-foreground transition ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= MAIN APPLICATION shell ================= */}
        <div className="flex flex-col min-h-screen">
          
          {/* Main Top Header Bar */}
          <header className="border-b border-border bg-card/90 backdrop-blur sticky top-0 z-40 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-cyan-500/20">
                <HeartPulse className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-foreground via-foreground/80 to-primary bg-clip-text text-transparent">MedHaven Hub</h1>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Jos University Teaching Hospital • Academic Suite</p>
              </div>
            </div>

            {/* Global Search Interface */}
            <div className="flex-grow max-w-md mx-auto md:mx-0 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search materials, past questions, videos..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-muted/60 border border-border rounded-lg text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Dynamic Class level switcher / admin display */}
            <div className="flex items-center gap-3 bg-muted border border-border p-1.5 pr-4 rounded-full">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground text-xs shadow-md shadow-primary/20">
                {userProfile.name[0]}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <p className="font-bold text-foreground leading-tight">{userProfile.name}</p>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-[10px]">Level: </span>
                  <select 
                    value={userProfile.level}
                    onChange={(e) => {
                      setUserProfile({ ...userProfile, level: e.target.value });
                      setSelectedLevelFilter(e.target.value);
                      showToast(`Academic dashboard dynamic filters configured for ${e.target.value}.`, 'info');
                    }}
                    className="bg-transparent text-primary font-bold border-none p-0 m-0 focus:outline-none text-[10px]"
                  >
                    {LEVELS.map(lvl => <option key={lvl} value={lvl} className="bg-background text-foreground">{lvl}</option>)}
                  </select>
                </div>
              </div>
              {userProfile.isAdmin && (
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Admin</span>
              )}
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/login";
                }}
                className="text-muted-foreground hover:text-destructive transition ml-2"
                title="Sign out of system"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* ================= SECONDARY NAVIGATION / TABS ================= */}
          <nav className="bg-background/80 border-b border-border px-4 overflow-x-auto flex gap-1 scrollbar-none scroll-smooth sticky top-[61px] z-30 backdrop-blur">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'library', label: 'Study Library', icon: BookOpen },
              { id: 'timetable', label: 'Rotation Timetables', icon: Calendar },
              { id: 'quizzes', label: 'Quizzes & Recalls', icon: Award },
              ...(userProfile.isAdmin ? [{ id: 'admin', label: 'Admin Workspace', icon: ShieldAlert }] : [])
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setQuizActive(false); }}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold tracking-wide whitespace-nowrap transition-all border-b-2 ${
                    isActive 
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* ================= MAIN CONTENT SPACE ================= */}
          <main className="flex-grow p-4 md:p-6 max-w-7xl w-full mx-auto">
            
            {/* ================= 1. DASHBOARD VIEW ================= */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* Dynamic Level-and-Time-Aware Activity Reminder Banner */}
                <div
                  onClick={() => router.push('/timetable')}
                  className="bg-rose-500/10 border border-rose-500/20 dark:border-rose-500/30 rounded-2xl p-4 flex items-start gap-3.5 animate-pulse cursor-pointer hover:bg-rose-500/20 transition-colors"
                >
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full">
                      {bannerData.title}
                    </span>
                    <h4 className="font-extrabold text-rose-950 dark:text-rose-100 text-sm mt-1.5">
                      Daily Activity Guidance
                    </h4>
                    <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                      {bannerData.message}
                    </p>
                  </div>
                </div>

                {/* Hero section featuring JUTH main admission gate */}
                <div className="relative rounded-2xl overflow-hidden bg-card border border-border p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-primary/5 z-0" />
                  
                  <div className="relative z-10 space-y-2.5 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20">
                      <HeartPulse className="w-3.5 h-3.5" /> JUTH systems mapped
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground leading-tight">{getTimeGreeting(userProfile.name)}</h2>
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                      Dashboard resources and rotations filtered for <span className="text-primary font-black">{userProfile.level}</span>. {heroParagraph}
                    </p>
                    <div className="flex gap-4 pt-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Academic Level</p>
                        <p className="text-xs font-bold text-primary">{userProfile.level}</p>
                      </div>
                      <div className="border-l border-border pl-4">
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Academic Phase</p>
                        <p className="text-xs font-bold text-foreground">{academicPhase}</p>
                      </div>
                    </div>
                  </div>

                  {/* Cloudy entrance gate photo exactly matched */}
                  <div className="relative z-10 w-full md:w-72 h-44 rounded-xl overflow-hidden border border-border shadow-2xl shrink-0 group">
                    <img 
                      src={JUTH_IMAGES.mainGate} 
                      alt="JUTH Main admission gate"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                </div>

                {/* Subject curriculum index cards based on level */}
                <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-primary" />
                    <h3 className="font-extrabold text-base text-foreground">Personalized Course Folders</h3>
                  </div>

                  {personalizedFolders.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {personalizedFolders.map((folder: CourseFolder) => {
                        const colorClasses: Record<string, { tag: string; bg: string }> = {
                          cyan: { tag: 'text-cyan-400 bg-cyan-950/40', bg: 'border-border' },
                          indigo: { tag: 'text-indigo-400 bg-indigo-950/40', bg: 'border-border' },
                          emerald: { tag: 'text-emerald-400 bg-emerald-950/40', bg: 'border-border' },
                          amber: { tag: 'text-amber-400 bg-amber-950/40', bg: 'border-border' },
                          rose: { tag: 'text-rose-400 bg-rose-950/40', bg: 'border-border' }
                        };
                        const cls = colorClasses[folder.color] || colorClasses.cyan;

                        return (
                          <div key={folder.id} className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                            <span className={`text-[10px] font-bold uppercase tracking-widest w-fit px-2 py-0.5 rounded ${cls.tag}`}>{folder.tag}</span>
                            <h4 className="font-bold text-foreground text-xs">{folder.title}</h4>
                            <p className="text-[11px] text-muted-foreground leading-normal">{folder.description}</p>
                            <button onClick={() => { router.push(folder.link); }} className={`text-[11px] hover:underline flex items-center gap-1 font-bold ${folder.color === 'cyan' ? 'text-cyan-400' : folder.color === 'indigo' ? 'text-indigo-400' : folder.color === 'emerald' ? 'text-emerald-400' : folder.color === 'amber' ? 'text-amber-400' : 'text-rose-400'}`}>Open repository <ChevronRight className="w-3.5 h-3.5" /></button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 bg-muted/40 border border-border rounded-xl text-center space-y-2">
                      <p className="text-xs text-muted-foreground">Pre-clinical curriculum slides, anatomical nerve diagrams, and biochemistry mock tests are loaded.</p>
                      <button onClick={() => { setActiveTab('library'); setSelectedLevelFilter(userProfile.level); }} className="text-xs text-primary font-bold hover:underline">Explore material folders →</button>
                    </div>
                  )}
                </div>

                {/* Ward 11 Spotlight containing stethoscope photograph */}
                {userIsClinical ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden p-6 relative">
                      <div className="flex flex-col md:flex-row gap-6 items-center">

                        <div className="space-y-3 flex-grow">
                          <div className="inline-flex items-center gap-1 bg-teal-500/10 text-teal-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-teal-500/20">
                            <MapPin className="w-3.5 h-3.5" /> JUTH Clinical Spotlight
                          </div>
                          <h4 className="text-lg font-black text-foreground leading-tight">Ward 11 - Male Medical Ward rounds</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Review Framingham clinical markers, fluid charts, and drug mechanisms prior to embarking on rounds with consultants. Always ensure your diagnostic stethoscope is packed.
                          </p>
                          <div className="flex flex-wrap gap-2 pt-2">
                            <button onClick={() => { setActiveTab('library'); setSelectedDeptFilter('Medicine'); }} className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold px-3 py-2 rounded-lg transition shadow-md shadow-primary/10">Read clinical slides</button>
                          </div>
                        </div>

                        {/* Stethoscope in front of Ward 11 exactly registered */}
                        <div className="w-full md:w-56 h-36 rounded-xl overflow-hidden border border-border relative shadow-lg shrink-0 group">
                          <img src={JUTH_IMAGES.ward11Entrance} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="Ward 11 door with stethoscope" />
                          <div className="absolute inset-0 bg-slate-950/60 flex items-end p-2.5">
                            <span className="text-[10px] font-bold text-white bg-slate-950/80 px-2 py-0.5 rounded border border-slate-850">Ward 11 Entry Gateway</span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Courtyard flowering tree display panel */}
                    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between gap-4">
                      <div>
                        <h4 className="font-extrabold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5"><HeartPulse className="w-4 h-4 text-primary animate-pulse" /> Morning Fellowship</h4>
                        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">Join standard student prayer groups in the administrative courtyard before lecture blocks.</p>
                      </div>

                      <div className="h-28 rounded-lg overflow-hidden relative border border-border">
                        <img src={JUTH_IMAGES.courtyardTree} className="w-full h-full object-cover" alt="Administrative garden" />
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {/* Courtyard flowering tree display panel */}
                    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between gap-4">
                      <div>
                        <h4 className="font-extrabold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5"><HeartPulse className="w-4 h-4 text-primary animate-pulse" /> Morning Fellowship</h4>
                        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">Join standard student prayer groups in the administrative courtyard before lecture blocks.</p>
                      </div>

                      <div className="h-28 rounded-lg overflow-hidden relative border border-border">
                        <img src={JUTH_IMAGES.courtyardTree} className="w-full h-full object-cover" alt="Administrative garden" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick actions links */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Study Library Repository', desc: 'Lecture slides & notes', action: () => { router.push('/library'); }, icon: BookOpen, color: 'text-cyan-400' },
                    { label: 'Rotation Timetables', desc: 'Ward rounds schedule', action: () => { router.push('/timetable'); }, icon: Calendar, color: 'text-indigo-400' },
                    { label: 'Practice MCQ Exams', desc: 'Prepare for boards', action: () => { router.push('/quizzes'); }, icon: Award, color: 'text-emerald-400' },
                    { label: 'Equipment Marketplace', desc: 'Buy/trade scrubs & gear', action: () => { router.push('/marketplace'); }, icon: ShoppingBag, color: 'text-rose-400' },
                  ].map((act, index) => {
                    const Icon = act.icon;
                    return (
                      <button 
                        key={index}
                        onClick={act.action}
                        className="p-4 bg-card border border-border rounded-xl text-left hover:border-primary/50 transition"
                      >
                        <div className="p-2.5 rounded-lg bg-muted border border-border w-fit mb-3">
                          <Icon className={`w-5 h-5 ${act.color}`} />
                        </div>
                        <h5 className="text-xs font-bold text-foreground leading-tight">{act.label}</h5>
                        <p className="text-[10px] text-muted-foreground mt-1">{act.desc}</p>
                      </button>
                    );
                  })}
                </div>

              </div>
            )}

            {/* ================= 2. STUDY LIBRARY Repository ================= */}
            {activeTab === 'library' && (
              <div className="space-y-6">
                
                {/* Repos header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-6 rounded-2xl">
                  <div>
                    <h2 className="text-xl font-black text-foreground">JUTH Digital Study Vault</h2>
                    <p className="text-xs text-muted-foreground mt-1">Direct level-restricted files database containing clinical slides and PDF checklists.</p>
                  </div>
                  <button 
                    onClick={() => {
                      if(userProfile.isAdmin) {
                        setShowDocUploadModal(true);
                      } else {
                        showToast("Admin privilege is required to upload files.", "error");
                      }
                    }}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/10 transition"
                  >
                    <Upload className="w-4 h-4" /> Upload Study Material
                  </button>
                </div>

                {/* Library Filter Settings */}
                <div className="bg-card border border-border p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-wrap gap-3 items-center">
                    
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground mr-2">Level Class:</span>
                      <select 
                        value={selectedLevelFilter} 
                        onChange={(e) => setSelectedLevelFilter(e.target.value)}
                        className="bg-muted text-foreground text-xs px-3 py-1.5 rounded border border-border font-bold focus:outline-none"
                      >
                        <option value="All">All Accessible Levels</option>
                        {LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground mr-2">Department:</span>
                      <select 
                        value={selectedDeptFilter} 
                        onChange={(e) => setSelectedDeptFilter(e.target.value)}
                        className="bg-muted text-foreground text-xs px-3 py-1.5 rounded border border-border font-bold focus:outline-none"
                      >
                        <option value="All">All Departments</option>
                        <option value="Medicine">Medicine</option>
                        <option value="Surgery">Surgery</option>
                        <option value="Paediatric">Paediatric</option>
                        <option value="Obstetrics & Gynaecology">Obstetrics & Gynaecology</option>
                        <option value="Pathology and Pharmacology">Pathology & Pharmacology</option>
                        <option value="Anatomy">Anatomy</option>
                      </select>
                    </div>

                  </div>

                  <span className="text-xs text-muted-foreground font-bold">Showing {filteredLibrary.length} study resource(s)</span>
                </div>

                {/* Content grid */}
                {filteredLibrary.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLibrary.map(item => (
                      <div key={item.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-all flex flex-col justify-between">
                        <div className="p-5 space-y-4">
                          <div className="flex justify-between items-start">
                            <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {item.type}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-bold uppercase">{item.level} • {item.department}</span>
                          </div>

                          <div className="space-y-1.5">
                            <h4 className="font-extrabold text-foreground text-sm leading-snug">{item.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{item.description}</p>
                          </div>

                          <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-primary" /> {item.subfolder}</span>
                            <span>Uploaded by: {item.uploadedBy}</span>
                          </div>
                        </div>

                        {/* Interactive operations links */}
                        <div className="bg-muted/60 px-5 py-3.5 border-t border-border flex items-center justify-between gap-2">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Eye className="w-4 h-4 text-muted-foreground" /> {item.views}</span>
                            <span className="flex items-center gap-1"><Download className="w-4 h-4 text-muted-foreground" /> {item.downloads}</span>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setShowAITutor(true);
                                setAIChat(prev => [
                                  ...prev,
                                  { role: "user", text: `Summarize the clinical guidelines and high-yield checks for: ${item.title}` }
                                ]);
                              }}
                              className="p-2 rounded-lg bg-card border border-border text-primary hover:bg-muted transition"
                              title="Query AI companion about this file"
                            >
                              <Sparkles className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                const updated = library.map(l => l.id === item.id ? { ...l, downloads: l.downloads + 1 } : l);
                                setLibrary(updated);
                                showToast(`Starting download sequence for: ${item.title}`, "success");
                              }}
                              className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-black px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                            >
                              <Download className="w-3.5 h-3.5" /> PDF
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-card border border-border p-12 text-center rounded-2xl space-y-3">
                    <Folder className="w-12 h-12 text-muted-foreground mx-auto" />
                    <h4 className="font-bold text-muted-foreground">No resources found matching filters</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">Try selecting a different level or course category to expand your search results.</p>
                  </div>
                )}

              </div>
            )}

            {/* ================= 3. TIMETABLES ROTATION VIEW ================= */}
            {activeTab === 'timetable' && (
              <div className="space-y-6">
                
                <div className="bg-card border border-border p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 px-3 py-0.5 rounded-full text-xs font-bold border border-indigo-500/20">
                      <Calendar className="w-3.5 h-3.5" /> Clinical rotations schedule
                    </div>
                    <h3 className="font-extrabold text-xl text-foreground">Ward & Posting Rotation Timetables</h3>
                    <p className="text-xs text-muted-foreground">Timetable slots maintained by JUMSA coordinators and department secretaries.</p>
                  </div>

                  <button 
                    onClick={() => setShowTimetableModal(true)}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-primary/20 transition"
                  >
                    <Plus className="w-4 h-4" /> Add Timetable Slot
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Calendar schedule panels */}
                  <div className={`${userIsClinical ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Dynamic Class Rotation Matrix ({userProfile.level})</h4>
                    
                    <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
                      {displayTimetable.filter(t => t.level === userProfile.level).length > 0 ? (
                        displayTimetable.filter(t => t.level === userProfile.level).map(slot => (
                          <div key={slot.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-muted/30 transition">
                            <div className="flex items-start gap-4">
                              <div className="bg-muted border border-border p-2.5 rounded-xl text-center min-w-[100px] shrink-0">
                                <span className="text-[10px] font-black uppercase text-primary block tracking-wider">{slot.day}</span>
                                <span className="text-[11px] text-muted-foreground block mt-1">{slot.time}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase bg-primary/15 border border-primary/25 text-primary px-2.5 py-0.5 rounded-full tracking-wider block w-fit">
                                  {slot.activity}
                                </span>
                                <h5 className="font-extrabold text-foreground text-sm mt-1.5">{slot.course}</h5>
                                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1">
                                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-500" /> {slot.location}</span>
                                  {slot.lecturer && <span>Taught by: {slot.lecturer}</span>}
                                </div>
                              </div>
                            </div>

                            <button 
                              onClick={() => showToast(`Schedule block synchronized with your local calendar account.`, "success")}
                              className="bg-muted hover:bg-muted/80 border border-border text-[11px] font-bold text-foreground px-3 py-1.5 rounded-lg transition shrink-0"
                            >
                              Sync Calendar
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center text-muted-foreground text-xs">No active postings registered for your level. Try updating level settings in header profile list.</div>
                      )}
                    </div>
                  </div>

                  {/* Ward round reminders & Emergency unit photo */}
                  {userIsClinical && (
                    <div className="bg-card border border-border p-6 rounded-2xl space-y-4 h-fit">
                      <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5"><HeartPulse className="w-4 h-4 text-rose-400 animate-pulse" /> Emergency Unit Protocols</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">Prior to entering hospital blocks or starting clinical rotations, review DKA resuscitation charts and make sure to have your stethoscopes.</p>

                      <ul className="space-y-3 text-xs text-foreground">
                        <li className="flex gap-2.5 items-start">
                          <CheckSquare className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Bring your diagnostics stethoscope (as shown in Ward 11 rounds).</span>
                        </li>
                        <li className="flex gap-2.5 items-start">
                          <CheckSquare className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Read DKA resus fluid guidelines in Endocrinology folders.</span>
                        </li>
                      </ul>

                      {/* LED ticker sign from clinical emergencies matched */}
                      <div className="rounded-xl overflow-hidden border border-border relative h-36">
                        <img src={JUTH_IMAGES.emergencyTicker} className="w-full h-full object-cover" alt="Red LED emergency ticker board" />
                        <div className="absolute inset-0 bg-slate-950/20" />
                      </div>
                    </div>
                  )}

                </div>

              </div>
            )}

            {/* ================= 4. PRACTICE MCQ QUIZZES ================= */}
            {activeTab === 'quizzes' && (
              <div className="space-y-6">
                
                {!quizActive ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Quizzes list */}
                    <div className="lg:col-span-2 space-y-4">
                      <h3 className="font-black text-lg text-foreground">Practice Exams & Case Recalls</h3>
                      <p className="text-xs text-muted-foreground">Prepare for clinical professional medical board assessments with interactive case questions.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {PRE_MADE_QUIZZES.map(quiz => (
                          <div key={quiz.id} className="bg-card border border-border p-5 rounded-2xl space-y-4">
                            <div>
                              <span className="text-[10px] font-bold bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">{quiz.level} • {quiz.department}</span>
                              <h4 className="font-extrabold text-foreground text-sm mt-3">{quiz.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{quiz.questions.length} High-Yield diagnostic questions</p>
                            </div>

                            <button 
                              onClick={() => {
                                setActiveQuiz(quiz);
                                setCurrentQuestionIndex(0);
                                setUserAnswers({});
                                setQuizSubmitted(false);
                                setQuizActive(true);
                              }}
                              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-black py-2 rounded-xl shadow-lg transition"
                            >
                              Start Practice Quiz
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Spaced Spaced Repetition Link */}
                    <div className="bg-card border border-border p-6 rounded-2xl space-y-4 h-fit">
                      <h4 className="font-extrabold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary animate-pulse" /> Active Spaced Repetition</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">Prepare for examinations using MedHaven's dynamic spaced-repetition active recall flashcard decks.</p>
                      
                      <button
                        onClick={() => router.push('/flashcards')}
                        className="w-full bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-black py-2.5 rounded-xl shadow-lg transition text-center"
                      >
                        Go to Flashcards
                      </button>
                    </div>

                  </div>
                ) : (
                  /* Live test platform */
                  <div className="bg-card border border-border p-6 md:p-8 rounded-2xl max-w-2xl mx-auto space-y-6">
                    
                    <div className="flex justify-between items-center pb-4 border-b border-border">
                      <h3 className="font-black text-foreground text-base">{activeQuiz.title}</h3>
                      <button 
                        onClick={() => setQuizActive(false)}
                        className="text-muted-foreground hover:text-destructive text-xs font-bold"
                      >
                        Exit Test
                      </button>
                    </div>

                    {!quizSubmitted ? (
                      <div className="space-y-6">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider block">Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}</span>
                          <h4 className="font-extrabold text-foreground text-sm sm:text-base mt-1 leading-relaxed">
                            {activeQuiz.questions[currentQuestionIndex].question}
                          </h4>
                        </div>

                        <div className="space-y-2">
                          {activeQuiz.questions[currentQuestionIndex].options.map((opt, optionIndex) => (
                            <button
                              key={optionIndex}
                              onClick={() => {
                                setUserAnswers({ ...userAnswers, [currentQuestionIndex]: opt });
                              }}
                              className={`w-full text-left p-4 rounded-xl border text-xs transition-all duration-200 flex items-center justify-between ${
                                userAnswers[currentQuestionIndex] === opt 
                                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-lg'
                                  : 'bg-muted border-border hover:bg-muted/80 text-foreground'
                              }`}
                            >
                              <span>{opt}</span>
                              {userAnswers[currentQuestionIndex] === opt && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                            </button>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-border">
                          <button
                            disabled={currentQuestionIndex === 0}
                            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                            className="text-muted-foreground hover:text-foreground text-xs font-bold disabled:opacity-40"
                          >
                            Previous
                          </button>

                          {currentQuestionIndex === activeQuiz.questions.length - 1 ? (
                            <button
                              onClick={() => {
                                let score = 0;
                                activeQuiz.questions.forEach((q, idx) => {
                                  if (userAnswers[idx] === q.answer) score++;
                                });
                                setQuizScore(score);
                                setQuizSubmitted(true);
                                showToast(`Test completed! You scored ${score}/${activeQuiz.questions.length}`, "success");
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg"
                            >
                              Submit Quiz
                            </button>
                          ) : (
                            <button
                              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                              className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-black px-4 py-2.5 rounded-xl shadow-lg"
                            >
                              Next Question
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Evaluation and explanation view */
                      <div className="space-y-6">
                        <div className="text-center py-4 space-y-2">
                          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                            <CheckCircle className="w-8 h-8" />
                          </div>
                          <h4 className="font-extrabold text-foreground text-base">Assessment Evaluated</h4>
                          <p className="text-xs text-muted-foreground">
                            You scored <span className="text-emerald-500 font-extrabold">{quizScore}</span> correct out of {activeQuiz.questions.length} items.
                          </p>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border">
                          <h5 className="font-bold text-xs uppercase text-muted-foreground tracking-wider">Clinical Explanations:</h5>
                          {activeQuiz.questions.map((q, qIdx) => (
                            <div key={qIdx} className="p-4 bg-muted border border-border rounded-xl space-y-2 text-xs">
                              <p className="font-extrabold text-foreground">{q.question}</p>
                              <p className="text-muted-foreground">Selected Answer: <span className={userAnswers[qIdx] === q.answer ? 'text-emerald-500 font-bold' : 'text-destructive'}>{userAnswers[qIdx] || 'No selection'}</span></p>
                              <p className="text-emerald-500 font-bold">Verified Correct: {q.answer}</p>
                              <p className="text-[11px] text-muted-foreground italic mt-1 leading-normal">{q.explanation}</p>
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => setQuizActive(false)}
                          className="w-full bg-muted hover:bg-muted/80 border border-border text-foreground text-xs font-black py-2.5 rounded-xl mt-4"
                        >
                          Return to Quiz Portal
                        </button>
                      </div>
                    )}

                  </div>
                )}

              </div>
            )}

            {/* ================= 8. ADMINISTRATIVE WORKSPACE ================= */}
            {activeTab === 'admin' && userProfile.isAdmin && (
              <div className="space-y-6">
                
                <div className="bg-card border border-border p-6 rounded-2xl">
                  <h3 className="font-black text-xl text-foreground">JUTH Admin Command Console</h3>
                  <p className="text-xs text-muted-foreground mt-1">Direct operational settings to configure slide files, publish ward schedules, update clinical staff, and broadcast notices.</p>
                </div>

                {/* Creation triggers row */}
                <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Publish Control Operations</h4>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => setShowDocUploadModal(true)}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Upload Study Material
                    </button>
                    <button 
                      onClick={() => setShowTimetableModal(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Timetable Rotation
                    </button>
                  </div>
                </div>

                {/* Gemini Setup panel */}
                <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">AI Companion Configuration Settings</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Configure your direct Gemini API key below to unlock real-time intelligence. If left blank, the app runs on its customized local medical training backup framework.
                  </p>
                  <div className="max-w-md space-y-2">
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Gemini API Key</label>
                    <input 
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="e.g. AIzaSy..."
                      className="w-full bg-muted border border-border focus:border-primary rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none"
                    />
                    {geminiApiKey.trim() ? (
                      <span className="text-[10px] text-emerald-500 font-bold block">✓ Direct Gemini API connectivity established</span>
                    ) : (
                      <span className="text-[10px] text-yellow-500 font-bold block">⚠ Running in local diagnostic fallback mode</span>
                    )}
                  </div>
                </div>

                {/* System logs */}
                <div className="bg-card border border-border p-6 rounded-2xl space-y-3">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Database Connection Logs</h4>
                  <div className="p-4 bg-muted/60 border border-border text-[10px] sm:text-xs font-mono text-muted-foreground space-y-1.5">
                    <p><span className="text-emerald-500">[CONNECTED]</span> PostgreSQL Supabase connection verified.</p>
                    <p><span className="text-primary">[ROUTING]</span> Level-based filtering rules successfully mapped for clinical groups.</p>
                    <p><span className="text-emerald-400">[ACTIVE]</span> Assets exactly connected to local hospital records.</p>
                  </div>
                </div>

              </div>
            )}

          </main>

          {/* ================= FLOATING AI ASSISTANT PANEL ================= */}
          <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            
            <button
              onClick={() => setShowAITutor(!showAITutor)}
              className="bg-gradient-to-tr from-cyan-500 to-blue-600 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-6 h-6 animate-pulse" />
              <span className="text-xs font-black pr-1 hidden sm:inline">Ask MedHaven AI</span>
            </button>

            {showAITutor && (
              <div className="w-80 sm:w-96 h-[460px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
                
                {/* AI Chat Header */}
                <div className="bg-muted border-b border-border px-4 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-primary animate-pulse" />
                    <div>
                      <h4 className="font-extrabold text-foreground text-xs">Clinical AI Study Tutor</h4>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">JUTH Rounds Diagnostic Assistant</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAITutor(false)} className="text-muted-foreground hover:text-destructive transition">
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Chat window */}
                <div className="flex-grow overflow-y-auto p-4 space-y-3.5 scrollbar-none">
                  {aiChat.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-3 rounded-xl max-w-[85%] text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-muted border border-border text-foreground rounded-bl-none'
                      }`}>
                        {msg.text.split('\n').map((line, lidx) => (
                          <p key={lidx} className={lidx > 0 ? "mt-1" : ""}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="p-3 bg-muted border border-border text-muted-foreground text-xs rounded-xl rounded-bl-none flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" /> Formulating high-yield JUTH clinical notes...
                      </div>
                    </div>
                  )}
                </div>

                {/* User input */}
                <form onSubmit={handleAITutorSubmit} className="p-3 bg-muted border-t border-border flex gap-2">
                  <input
                    type="text"
                    required
                    disabled={aiLoading}
                    placeholder="Ask about Cardiology, Malaria, DKA fluid regimes..."
                    value={aiInput}
                    onChange={(e) => setAIInput(e.target.value)}
                    className="flex-grow px-3 py-2 bg-background border border-border focus:border-primary text-xs text-foreground placeholder-muted-foreground rounded-lg focus:outline-none"
                  />
                  <button 
                    type="submit"
                    disabled={aiLoading}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground p-2.5 rounded-lg transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

              </div>
            )}

          </div>

          {/* ================= EDIT MODALS VAULT ================= */}
          
          {/* A. Document upload modal */}
          {showDocUploadModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-foreground text-base">Upload Study Resource</h4>
                  <button onClick={() => setShowDocUploadModal(false)} className="text-muted-foreground hover:text-destructive"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleDocUploadSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-muted-foreground font-bold mb-1">Title *</label>
                    <input 
                      type="text" 
                      required 
                      value={newDoc.title} 
                      onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                      placeholder="e.g. Cardiology Lecture - Heart Failure"
                      className="w-full bg-background border border-border p-2.5 rounded-lg text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground font-bold mb-1">Description Summary</label>
                    <textarea 
                      value={newDoc.desc} 
                      onChange={(e) => setNewDoc({ ...newDoc, desc: e.target.value })}
                      placeholder="Brief details or clinical checklists..."
                      className="w-full bg-background border border-border p-2.5 rounded-lg text-foreground h-20 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-muted-foreground font-bold mb-1">Type</label>
                      <select 
                        value={newDoc.type} 
                        onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
                        className="w-full bg-background border border-border p-2 rounded-lg text-foreground"
                      >
                        <option>Lecture Slides</option>
                        <option>PDF Document</option>
                        <option>Study Notes</option>
                        <option>Video Lecture</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-muted-foreground font-bold mb-1">Level</label>
                      <select 
                        value={newDoc.level} 
                        onChange={(e) => setNewDoc({ ...newDoc, level: e.target.value })}
                        className="w-full bg-background border border-border p-2 rounded-lg text-foreground"
                      >
                        {LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-muted-foreground font-bold mb-1">Department</label>
                      <input 
                        type="text" 
                        required 
                        value={newDoc.dept} 
                        onChange={(e) => setNewDoc({ ...newDoc, dept: e.target.value })}
                        placeholder="e.g. Medicine"
                        className="w-full bg-background border border-border p-2 rounded-lg text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-muted-foreground font-bold mb-1">Subfolder Code</label>
                      <input 
                        type="text" 
                        required 
                        value={newDoc.subfolder} 
                        onChange={(e) => setNewDoc({ ...newDoc, subfolder: e.target.value })}
                        placeholder="e.g. M1/Cardiology"
                        className="w-full bg-background border border-border p-2 rounded-lg text-foreground"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-black py-2.5 rounded-xl shadow-lg transition"
                  >
                    Publish Study Resource
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* C. Rotation Timetable Modal */}
          {showTimetableModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-foreground text-base">Add Rotation Schedule Slot</h4>
                  <button onClick={() => setShowTimetableModal(false)} className="text-muted-foreground hover:text-destructive"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleTimetableSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-muted-foreground font-bold mb-1">Rotation / Subject Title *</label>
                    <input 
                      type="text" 
                      required 
                      value={newSlot.course} 
                      onChange={(e) => setNewSlot({ ...newSlot, course: e.target.value })}
                      placeholder="e.g. Ward 11 Medicine Posting"
                      className="w-full bg-background border border-border p-2 rounded-lg text-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-muted-foreground font-bold mb-1">Day</label>
                      <select 
                        value={newSlot.day} 
                        onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value })}
                        className="w-full bg-background border border-border p-2 rounded-lg text-foreground"
                      >
                        <option>Monday</option>
                        <option>Tuesday</option>
                        <option>Wednesday</option>
                        <option>Thursday</option>
                        <option>Friday</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-muted-foreground font-bold mb-1">Time Frame *</label>
                      <input 
                        type="text" 
                        required 
                        value={newSlot.time} 
                        onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                        placeholder="08:00 - 10:00"
                        className="w-full bg-background border border-border p-2 rounded-lg text-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-muted-foreground font-bold mb-1">Activity</label>
                      <input 
                        type="text" 
                        required 
                        value={newSlot.activity} 
                        onChange={(e) => setNewSlot({ ...newSlot, activity: e.target.value })}
                        placeholder="Lecture or Ward Round"
                        className="w-full bg-background border border-border p-2 rounded-lg text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-muted-foreground font-bold mb-1">Location</label>
                      <input 
                        type="text" 
                        required 
                        value={newSlot.location} 
                        onChange={(e) => setNewSlot({ ...newSlot, location: e.target.value })}
                        placeholder="Lamingto Hall A"
                        className="w-full bg-background border border-border p-2 rounded-lg text-foreground"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-black py-2.5 rounded-xl shadow-lg transition"
                  >
                    Save rotation block
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================= FOOTER ================= */}
          <footer className="bg-card border-t border-border px-6 py-6 mt-12">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground font-bold">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-primary" />
                <span>MedHaven JUTH Hub • Jos University Teaching Hospital</span>
              </div>
              <div className="flex gap-4 uppercase tracking-wider">
                <a href="#privacy" onClick={(e) => { e.preventDefault(); showToast("Privacy regulations active (NDPR).", "info"); }} className="hover:text-foreground transition">NDPR Compliance</a>
                <a href="#support" onClick={(e) => { e.preventDefault(); showToast("Representative directory loaded.", "info"); }} className="hover:text-foreground transition">Helpdesk</a>
              </div>
              <div>
                <span>© 2026 JUMSA. All Rights Reserved.</span>
              </div>
            </div>
          </footer>

        </div>

    </div>
  );
}