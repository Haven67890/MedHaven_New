"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from './lib/supabase/client';
import { 
  BookOpen, Search, Calendar, Folder,
  ChevronRight, Sparkles, MapPin, CheckCircle,
  HeartPulse, AlertCircle, X, ShoppingBag, Heart,
  Clock, FileText, Video, Presentation, FilePenLine, Image as ImageIcon
} from 'lucide-react';
import {
  MotionReveal,
  MotionStaggerGroup,
  MotionStaggerItem,
  MotionButton,
} from '@/components/ui/motion';
import AIChatDrawer from '@/components/dashboard/ai-chat-drawer';
import { MaterialPreviewModal, PreviewModalData } from '@/components/dashboard/material-preview-modal';

// Reliable placeholder imagery for the hospital dashboard without broken asset references.
const JUTH_IMAGES = {
  mainGate: "/logo.png",
  ambulanceDriveway: "/logo.png",
  ward11Entrance: "/logo.png",
  courtyardTree: "/logo.png",
  emergencyTicker: "/logo.png"
};

const LEVELS = ['100L', '200L', '300L', '400L', '500L', '600L', 'Final Year'];

const getProfileDisplayName = (fullName?: string | null, fallback = 'Scholar') => {
  const cleanName = fullName?.trim();
  return cleanName && cleanName.length > 0 ? cleanName : fallback;
};

const getTimeGreeting = (fullName?: string | null) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return `${greeting}, ${getProfileDisplayName(fullName)}`;
};

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
              isAdmin: Boolean(
                userProfile.isAdmin ||
                data.role === "admin" ||
                data.role === "super_admin" ||
                data.role === "moderator"
              ),
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
  }, []);

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

  // Global Search state
  const [globalSearch, setGlobalSearch] = useState('');

  const userIsClinical = ['400L', '500L', '600L', 'Final Year'].includes(userProfile.level || '');

  // AI Assistant Chat Open State
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [recentModal, setRecentModal] = useState<PreviewModalData | null>(null);

  useEffect(() => {
    const loadRecentlyViewed = () => {
      try {
        const stored = localStorage.getItem("medhaven_recently_viewed");
        if (stored) {
          setRecentlyViewed(JSON.parse(stored));
        }
      } catch (e) {
        // Ignore
      }
    };

    loadRecentlyViewed();

    if (typeof window !== "undefined") {
      window.addEventListener("recently-viewed-updated", loadRecentlyViewed);
      return () => window.removeEventListener("recently-viewed-updated", loadRecentlyViewed);
    }
  }, []);

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

  const handleAISlickClick = () => {
    setIsAIChatOpen(true);
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

          {/* Dynamic Class level switcher */}
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

        {/* ================= MAIN CONTENT SPACE ================= */}
        <main className="flex-grow p-4 md:p-6 max-w-7xl w-full mx-auto">

          <div className="space-y-6">
            
            {/* Dynamic Level-and-Time-Aware Activity Reminder Banner */}
            <MotionReveal direction="down" distance={12}>
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
            </MotionReveal>

            {/* Hero section featuring JUTH main admission gate */}
            <MotionReveal direction="up" distance={20}>
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
            </MotionReveal>

            {/* Recently Viewed Materials Section */}
            {recentlyViewed.length > 0 && (
              <MotionReveal direction="up" distance={16}>
              <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <h3 className="font-extrabold text-base text-foreground">Recently Viewed Materials</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{recentlyViewed.length} recent</span>
                </div>

                <MotionStaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recentlyViewed.map((item) => {
                    const url = item.storage_path
                      ? item.storage_path.startsWith("http")
                        ? item.storage_path
                        : `/api/materials/signed-url?path=${encodeURIComponent(item.storage_path)}`
                      : item.source_url || "#";

                    return (
                      <MotionStaggerItem key={item.id}>
                      <div
                        onClick={() => {
                          if (url !== "#") {
                            const isPdf = item.type?.toLowerCase() === "pdf" || url.endsWith(".pdf");
                            const isVideo = item.type?.toLowerCase() === "video";
                            const isOffice = ["pptx", "ppt", "docx", "doc", "xlsx", "xls"].some((ext) => url.toLowerCase().includes("." + ext));
                            const typeVal = isVideo ? "video" : isPdf ? "pdf" : isOffice ? "office" : "pdf";
                            setRecentModal({
                              isOpen: true,
                              title: item.title,
                              url: url,
                              type: typeVal,
                              materialId: item.id,
                            });
                          }
                        }}
                        className="p-3.5 rounded-xl bg-muted/40 border border-border/70 hover:border-primary/40 hover:bg-muted/70 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            {item.type?.toLowerCase() === "video" ? (
                              <Video className="size-4 text-red-500" />
                            ) : item.type?.toLowerCase() === "lecture_slide" ? (
                              <Presentation className="size-4 text-orange-500" />
                            ) : (
                              <FileText className="size-4 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors" title={item.title}>
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-muted-foreground truncate">{item.course || "General"}</p>
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                      </MotionStaggerItem>
                    );
                  })}
                </MotionStaggerGroup>
              </div>
              </MotionReveal>
            )}

            {/* Subject curriculum index cards based on level */}
            <MotionReveal direction="up" distance={16}>
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-primary" />
                <h3 className="font-extrabold text-base text-foreground">Personalized Course Folders</h3>
              </div>

              {personalizedFolders.length > 0 ? (
                <MotionStaggerGroup className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      <MotionStaggerItem key={folder.id}>
                      <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 hover:-translate-y-1 hover:shadow-md transition-all">
                        <span className={`text-[10px] font-bold uppercase tracking-widest w-fit px-2 py-0.5 rounded ${cls.tag}`}>{folder.tag}</span>
                        <h4 className="font-bold text-foreground text-xs">{folder.title}</h4>
                        <p className="text-[11px] text-muted-foreground leading-normal">{folder.description}</p>
                        <button onClick={() => { router.push(folder.link); }} className={`text-[11px] hover:underline flex items-center gap-1 font-bold ${folder.color === 'cyan' ? 'text-cyan-400' : folder.color === 'indigo' ? 'text-indigo-400' : folder.color === 'emerald' ? 'text-emerald-400' : folder.color === 'amber' ? 'text-amber-400' : 'text-rose-400'}`}>Open repository <ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>
                      </MotionStaggerItem>
                    );
                  })}
                </MotionStaggerGroup>
              ) : (
                <div className="p-6 bg-muted/40 border border-border rounded-xl text-center space-y-2">
                  <p className="text-xs text-muted-foreground">Pre-clinical curriculum slides, anatomical nerve diagrams, and biochemistry mock tests are loaded.</p>
                  <button onClick={() => { router.push('/library'); }} className="text-xs text-primary font-bold hover:underline">Explore material folders →</button>
                </div>
              )}
            </div>
            </MotionReveal>

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
                        <button onClick={() => { router.push('/materials?department=Medicine'); }} className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold px-3 py-2 rounded-lg transition shadow-md shadow-primary/10">Read clinical slides</button>
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
            <MotionStaggerGroup className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Study Library Repository', desc: 'Lecture slides & notes', action: () => { router.push('/library'); }, icon: BookOpen, color: 'text-cyan-400' },
                { label: 'Rotation Timetables', desc: 'Ward rounds schedule', action: () => { router.push('/timetable'); }, icon: Calendar, color: 'text-indigo-400' },
                { label: 'Practice MCQ Exams', desc: 'Prepare for boards', action: () => { router.push('/quizzes'); }, icon: BookOpen, color: 'text-emerald-400' },
                { label: 'Equipment Marketplace', desc: 'Buy/trade scrubs & gear', action: () => { router.push('/marketplace'); }, icon: ShoppingBag, color: 'text-rose-400' },
              ].map((act, index) => {
                const Icon = act.icon;
                return (
                  <MotionStaggerItem key={index}>
                  <button 
                    onClick={act.action}
                    className="p-4 bg-card border border-border rounded-xl text-left hover:border-primary/50 hover:-translate-y-1 hover:shadow-md transition-all w-full cursor-pointer"
                  >
                    <div className="p-2.5 rounded-lg bg-muted border border-border w-fit mb-3">
                      <Icon className={`w-5 h-5 ${act.color}`} />
                    </div>
                    <h5 className="text-xs font-bold text-foreground leading-tight">{act.label}</h5>
                    <p className="text-[10px] text-muted-foreground mt-1">{act.desc}</p>
                  </button>
                  </MotionStaggerItem>
                );
              })}
            </MotionStaggerGroup>

            {/* Support MedHaven Banner Card */}
            <MotionReveal direction="up" distance={16}>
            <div className="bg-gradient-to-r from-rose-500/10 via-card to-rose-500/5 border border-rose-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 shrink-0">
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-foreground">Support Open Access Medical Learning</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Help keep MedHaven accessible and updated for medical scholars across Jos and beyond.</p>
                </div>
              </div>
              <MotionButton scaleHover={1.04}>
              <button
                onClick={() => router.push('/donate')}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shrink-0 flex items-center gap-2 cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 fill-white" />
                <span>Donate Now</span>
              </button>
              </MotionButton>
            </div>
            </MotionReveal>

          </div>

        </main>

        {/* ================= FLOATING AI ASSISTANT BUTTON ================= */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          <button
            onClick={handleAISlickClick}
            className="bg-gradient-to-tr from-cyan-500 to-blue-600 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-6 h-6 animate-pulse" />
            <span className="text-xs font-black pr-1 hidden sm:inline">Ask MedHaven AI</span>
          </button>
        </div>

        {/* AI Assistant Chat Drawer */}
        <AIChatDrawer isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />

        {/* Preview Modal for Recently Viewed Materials */}
        <MaterialPreviewModal modal={recentModal} onClose={() => setRecentModal(null)} />

        {/* ================= FOOTER ================= */}
        <footer className="bg-card border-t border-border px-6 py-6 mt-12">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-bold">
              <HeartPulse className="w-4 h-4 text-primary" />
              <span>MedHaven JUTH Hub • Jos University Teaching Hospital</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <span className="font-semibold text-foreground">Contact & Support:</span>
              <a href="mailto:medhaven57@gmail.com" className="hover:text-foreground transition font-medium">medhaven57@gmail.com</a>
              <span className="hidden sm:inline">•</span>
              <a href="https://wa.me/2347072299463" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition font-medium text-emerald-500">WhatsApp: 07072299463</a>
            </div>
            <div className="font-bold">
              <span>© 2026 MedHaven. All Rights Reserved.</span>
            </div>
          </div>
        </footer>

      </div>

    </div>
  );
}
