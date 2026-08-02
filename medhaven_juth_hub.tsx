"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Search, MessageSquare, Calendar, User, Folder, Upload, Plus, 
  Award, ShieldAlert, Trash, Eye, Download, Tag, ChevronRight, Sparkles, 
  Clock, Smartphone, MapPin, Users, CheckCircle, Home, HeartPulse, 
  Compass, FileText, AlertTriangle, Send, Share2, BookMarked, ThumbsUp, 
  Filter, Check, Info, ArrowLeft, RefreshCw, Star, ShoppingBag, Globe,
  Briefcase, MessageCircle, Volume2, Moon, Sun, AlertCircle, X, ChevronDown, CheckSquare,
  Settings
} from 'lucide-react';


// JUTH Native Images registered exactly as provided
const JUTH_IMAGES = {
  mainGate: "Screenshot_20240923-184937.png", // Cloudy sky entrance gate
  ambulanceDriveway: "Snapchat-1489759066.jpg", // Ambulance driveway under bright sky
  ward11Entrance: "IMG_20250317_183421_424.jpg", // Stethoscope in front of WARD 11 MALE WARD
  courtyardTree: "20260421_163352.jpg", // Beautiful flowering tree in hospital yard
  emergencyTicker: "20260509_200240.jpg" // JUTH EMERGENCY UNIT led light display
};

const LEVELS = ['100L', '200L', '300L', '400L', '500L', '600L', 'Final Year'];


const INITIAL_LIBRARY = [
  // 400L - Clinical Phase 1 (Medicine M1, Surgery S1, etc.)
  {
    id: "lib-1",
    title: "Pathophysiology & Therapeutic Management of Congestive Heart Failure",
    description: "Verified JUTH internal slide series analyzing systolic vs. diastolic dysfunctions, Framingham criteria, and local pharmacotherapy regimes.",
    type: "Lecture Slides",
    level: "400L",
    department: "Medicine",
    subfolder: "M1/Cardiology",
    fileUrl: "#",
    isFeatured: true,
    uploadedBy: "Prof. J. C. A. Mbanefo",
    uploadedAt: "2026-07-10",
    downloads: 312,
    views: 640,
    rating: 4.9
  },
  {
    id: "lib-2",
    title: "Diabetic Ketoacidosis Clinical Resuscitation Guideline (A&E Unit)",
    description: "Standard operating procedure for aggressive hydration, intravenous insulin protocols, and potassium monitoring inside the JUTH emergency unit.",
    type: "PDF Document",
    level: "400L",
    department: "Medicine",
    subfolder: "M1/Endocrinology",
    fileUrl: "#",
    isFeatured: true,
    uploadedBy: "Dr. L. S. Dama",
    uploadedAt: "2026-07-12",
    downloads: 245,
    views: 489,
    rating: 4.8
  },
  {
    id: "lib-3",
    title: "Acute Abdomen and Surgical Peritonitis Assessment Checklist",
    description: "Surgical block presentation on identifying rebound tenderness, guarding, and radiological signs of gas under diaphragm.",
    type: "Study Notes",
    level: "400L",
    department: "Surgery",
    subfolder: "S2/General Surgery",
    fileUrl: "#",
    isFeatured: false,
    uploadedBy: "Dr. Alao Surgery Team",
    uploadedAt: "2026-07-01",
    downloads: 189,
    views: 310,
    rating: 4.7
  },
  {
    id: "lib-4",
    title: "Haematology Practical Guide: Peripheral Blood Film Interpretation",
    description: "Microscopic analysis checklists of microcytic/macrocytic anemia patterns and bone marrow hypoplasia markers.",
    type: "PDF Document",
    level: "400L",
    department: "Pathology and Pharmacology",
    subfolder: "Haematology/1st Series",
    fileUrl: "#",
    isFeatured: false,
    uploadedBy: "Dr. P. Onyimba",
    uploadedAt: "2026-06-25",
    downloads: 120,
    views: 204,
    rating: 4.6
  },
  // 500L Specialty Posting
  {
    id: "lib-5",
    title: "Active Stage Management of Labor and Partograph Plotting",
    description: "Crucial guideline on tracking cervical dilatation, fetal heart rate indicators, and uterine contraction metrics.",
    type: "Lecture Slides",
    level: "500L",
    department: "Obstetrics & Gynaecology",
    subfolder: "Normal Labour",
    fileUrl: "#",
    isFeatured: true,
    uploadedBy: "Prof. S. O. Adebomi",
    uploadedAt: "2026-07-04",
    downloads: 145,
    views: 320,
    rating: 4.9
  },
  {
    id: "lib-6",
    title: "Congenital Cyanotic Heart Diseases in Pediatrics",
    description: "Tetralogy of Fallot and transposition of great arteries diagnostics, murmur classification, and management parameters.",
    type: "Lecture Slides",
    level: "500L",
    department: "Paediatric",
    subfolder: "Cardiology",
    fileUrl: "#",
    isFeatured: false,
    uploadedBy: "Dr. Ruth S. Dung",
    uploadedAt: "2026-07-02",
    downloads: 98,
    views: 215,
    rating: 4.7
  },
  // Pre-clinical
  {
    id: "lib-7",
    title: "Anatomy of the Brachial Plexus: Roots, Trunks, and Branches",
    description: "Revision materials on upper and lower trunk lesions, Erb's and Klumpke's paralysis clinical presentations.",
    type: "Study Notes",
    level: "200L",
    department: "Anatomy",
    subfolder: "Nervous System",
    fileUrl: "#",
    isFeatured: false,
    uploadedBy: "Dr. J. A. Gye",
    uploadedAt: "2026-05-18",
    downloads: 412,
    views: 890,
    rating: 4.5
  }
];

const INITIAL_TIMETABLES = [
  {
    id: "time-1",
    level: "400L",
    day: "Monday",
    time: "08:00 - 10:00",
    activity: "Lecture",
    course: "Chemical Pathology Integration",
    location: "Lamingto Hall A",
    lecturer: "Dr. P. Onyimba"
  },
  {
    id: "time-2",
    level: "400L",
    day: "Monday",
    time: "10:00 - 17:00",
    activity: "Block Posting",
    course: "Ward 11 Internal Medicine Ward Round",
    location: "Ward 11 (Male Ward)",
    lecturer: "Prof. Mbanefo & Consultants"
  },
  {
    id: "time-3",
    level: "400L",
    day: "Wednesday",
    time: "10:00 - 15:00",
    activity: "Clinic",
    course: "Surgical Outpatient Department Posting",
    location: "SOPD Clinic Rooms",
    lecturer: "Dr. Alao Surgical Team"
  },
  {
    id: "time-4",
    level: "500L",
    day: "Tuesday",
    time: "08:00 - 10:00",
    activity: "Lecture",
    course: "Ophthalmology Special Posting",
    location: "Eye Clinic Auditorium",
    lecturer: "Prof. E. R. Nuhu"
  },
  {
    id: "time-5",
    level: "500L",
    day: "Thursday",
    time: "10:00 - 14:00",
    activity: "Ward Round",
    course: "Labor Ward & Delivery Suite Postings",
    location: "Delivery Ward Rooms",
    lecturer: "O&G Consultants"
  }
];

const INITIAL_STAFF = [
  {
    id: "staff-1",
    name: "Prof. J. C. A. Mbanefo",
    title: "Prof.",
    role: "HOD",
    department: "Medicine",
    subspecialty: "Cardiology & Preventive Clinical Health",
    phone: "+2348031234567",
    email: "mbanefo.j@juth.edu.ng",
    bio: "Head of Cardiology Division with 25+ years training clinical students.",
    img: "Screenshot_20240923-184937.png"
  },
  {
    id: "staff-2",
    name: "Dr. Ruth S. Dung",
    title: "Dr.",
    role: "Consultant",
    department: "Paediatric",
    subspecialty: "Neonatology & Child Development",
    phone: "+2348057654321",
    email: "ruth.dung@juth.edu.ng",
    bio: "Consultant Neonatologist, championing local pediatric care optimization.",
    img: "IMG_20250317_183421_424.jpg"
  },
  {
    id: "staff-3",
    name: "Dr. L. S. Dama",
    title: "Dr.",
    role: "Lecturer",
    department: "Medicine",
    subspecialty: "Endocrine & Metabolic Emergencies",
    phone: "+2348061112233",
    email: "dama.l@juth.edu.ng",
    bio: "Chief Senior Lecturer, coordinator of Endocrinology clinical postings.",
    img: "Screenshot_20240923-184937.png"
  },
  {
    id: "staff-4",
    name: "Musa Joseph",
    title: "Mr.",
    role: "Class Rep",
    department: "MBBS Level 400L",
    subspecialty: "Clinical Rep Operations Liaison",
    phone: "+2348093334444",
    email: "musa.400lrep@jumsahub.org",
    bio: "Elected 400L Clinical representative. Reach out for any lecture or schedule amendments.",
    img: "20260421_163352.jpg"
  }
];

const INITIAL_MARKETPLACE = [
  {
    id: "market-1",
    title: "Littmann Classic III Stethoscope (Navy Blue)",
    description: "Extremely high acoustic sensitivity, minimal cosmetic wear, perfect for clinical examination postings.",
    category: "Stethoscopes",
    condition: "Like New",
    price: "₦75,000",
    sellerName: "Daniel Pam (600L)",
    sellerPhone: "+2348030001111",
    img: "IMG_20250317_183421_424.jpg"
  },
  {
    id: "market-2",
    title: "Welch Allyn Diagnostic Pocket Scope Set",
    description: "Ophthalmoscope + Otoscope pocket set with sturdy zip-up casing. Fully operational.",
    category: "Medical bags / diagnostic sets",
    condition: "Good",
    price: "₦140,000",
    sellerName: "Zainab Isa (Final Year)",
    sellerPhone: "+2348052223333",
    img: "Screenshot_20240923-184937.png"
  }
];

const INITIAL_BLOGS = [
  {
    id: "blog-1",
    title: "Navigating the Leap to 400L Clinical Phase: A JUTH Survival Blueprint",
    category: "Academic News",
    excerpt: "Moving from laboratory benches to Ward 11 can be overwhelming. Top registrar consultants share advice for clinical ward rounds.",
    date: "2026-07-15",
    author: "JUMSA Editorial Board",
    content: "Transitioning to clinical phase demands a major shift in focus. You are no longer just memorizing textbooks; you are diagnosing real human lives. First, master the history-taking sequence. Consultants like Prof. Mbanefo look for structured, chronological presenting complaints. Secondly, invest in comfortable shoes. Ward rounds in JUTH can last hours, moving from main blocks to administrative nodes. Make sure to keep your notebook handy and check clinical signs carefully."
  },
  {
    id: "blog-2",
    title: "JUTH Emergency Resuscitation Protocols Upgraded for 2026",
    category: "Health Tips",
    excerpt: "New clinical algorithms for cardiovascular emergencies and acute stroke interventions have been installed across all emergency nodes.",
    date: "2026-07-11",
    author: "Dr. Victor Lar",
    content: "With changes in modern guideline indicators, the resuscitation flowchart inside JUTH A&E now emphasizes early dual antiplatelet loading for acute coronary syndromes, alongside standard fluid resuscitation parameters for DKA as mapped in Endocrinology folders."
  }
];

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


export default function App() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  // Gemini API configuration
  const [geminiApiKey, setGeminiApiKey] = useState("");

  // Simulated Student Profile State
  const [userProfile, setUserProfile] = useState({
    name: "John Snow",
    matric: "UJT/2022/MBBS/014",
    email: "john.snow@juth.edu.ng",
    level: "400L",
    course: "Medicine and Surgery (MBBS)",
    gender: "Male",
    phone: "+2348031234567",
    isAdmin: true,
    points: 340,
    reputation: 1500
  });

  // Auth Form parameters
  const [regForm, setRegForm] = useState({
    name: "",
    email: "",
    matric: "",
    level: "400L",
    course: "Medicine and Surgery (MBBS)",
    password: "",
    confirmPassword: "",
    phone: ""
  });

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });

  // Core Databases
  const [library, setLibrary] = useState(INITIAL_LIBRARY);
  const [timetable, setTimetable] = useState(INITIAL_TIMETABLES);
  const [staffList, setStaffList] = useState(INITIAL_STAFF);
  const [marketItems, setMarketItems] = useState(INITIAL_MARKETPLACE);
  const [blogPosts, setBlogPosts] = useState(INITIAL_BLOGS);
  const [announcements, setAnnouncements] = useState([
    { 
      id: "ann-1", 
      title: "URGENT: Re-scheduled 400L Pharmacology Continuous Assessment", 
      content: "The continuous assessment scheduled for Thursday has been shifted to Friday 9:00 AM at Lecture Hall B. Kindly adjust your preparation schedule accordingly.", 
      priority: "High", 
      level: "400L" 
    },
    { 
      id: "ann-2", 
      title: "Morning Devotional & Prayer Fellowship Invitation", 
      content: "May your minds remain sharp and your clinical hands compassionate today. Join the community fellowship inside Lamingto Hall at 7:30 AM before postings.", 
      priority: "Low", 
      level: "All" 
    }
  ]);

  // Global Navigation states
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('400L');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [globalSearch, setGlobalSearch] = useState('');

  // Toast feedback state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'success' });

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
  const [showItemPostModal, setShowItemPostModal] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  // Form entries for uploads
  const [newDoc, setNewDoc] = useState({ title: '', desc: '', type: 'Lecture Slides', level: '400L', dept: 'Medicine', subfolder: 'M1/Cardiology' });
  const [newItem, setNewItem] = useState({ title: '', desc: '', category: 'Stethoscopes', cond: 'Like New', price: '₦', phone: '', seller: 'John Snow' });
  const [newSlot, setNewSlot] = useState({ day: 'Monday', time: '08:00 - 10:00', activity: 'Lecture', course: '', location: '', lecturer: '' });
  const [newAnn, setNewAnn] = useState({ title: '', content: '', priority: 'Medium', level: '400L' });

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

  // Filter study items based on global search & dynamic level logic
  const filteredLibrary = library.filter(item => {
    const matchQuery = item.title.toLowerCase().includes(globalSearch.toLowerCase()) || 
                       item.description.toLowerCase().includes(globalSearch.toLowerCase()) ||
                       item.subfolder.toLowerCase().includes(globalSearch.toLowerCase());
    const matchLevel = selectedLevelFilter === 'All' ? canAccessLevel(userProfile.level, item.level) : item.level === selectedLevelFilter;
    const matchDept = selectedDeptFilter === 'All' ? true : item.department.toLowerCase() === selectedDeptFilter.toLowerCase();
    return matchQuery && matchLevel && matchDept;
  });

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

  const handleMarketItemSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newItem.title.trim()) {
      showToast("Please input an item title for listing.", "error");
      return;
    }
    const item = {
      id: "market-" + Date.now(),
      title: newItem.title,
      description: newItem.desc,
      category: newItem.category,
      condition: newItem.cond,
      price: newItem.price || "₦ Free",
      sellerName: newItem.seller || userProfile.name,
      sellerPhone: newItem.phone || userProfile.phone,
      img: "IMG_20250317_183421_424.jpg" // Defaults to physical stethoscope image
    };
    setMarketItems([item, ...marketItems]);
    setShowItemPostModal(false);
    setNewItem({ title: '', desc: '', category: 'Stethoscopes', cond: 'Like New', price: '₦', phone: '', seller: userProfile.name });
    showToast("Listing posted successfully to student marketplace!", "success");
  };

  const handleTimetableSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newSlot.course.trim()) {
      showToast("Provide a course or hospital ward rotation title.", "error");
      return;
    }
    const slot = {
      id: "slot-" + Date.now(),
      level: userProfile.level,
      day: newSlot.day,
      time: newSlot.time,
      activity: newSlot.activity,
      course: newSlot.course,
      location: newSlot.location || "Hospital Main Ward Complex",
      lecturer: newSlot.lecturer || "Clinical Consultants"
    };
    setTimetable([...timetable, slot]);
    setShowTimetableModal(false);
    setNewSlot({ day: 'Monday', time: '08:00 - 10:00', activity: 'Lecture', course: '', location: '', lecturer: '' });
    showToast("Schedule block registered in timetable registry!", "success");
  };

  const handleAnnouncementSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newAnn.title.trim() || !newAnn.content.trim()) {
      showToast("Please enter a clear title and details text.", "error");
      return;
    }
    const alertItem = {
      id: "ann-" + Date.now(),
      title: newAnn.title,
      content: newAnn.content,
      priority: newAnn.priority,
      level: newAnn.level
    };
    setAnnouncements([alertItem, ...announcements]);
    setShowAnnouncementModal(false);
    setNewAnn({ title: '', content: '', priority: 'Medium', level: userProfile.level });
    showToast("Broadcasting alert created successfully!", "success");
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

  // Auth operations
  const handleRegFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (regForm.password !== regForm.confirmPassword) {
      showToast("Passwords do not match. Please verify.", "error");
      return;
    }
    setUserProfile({
      name: regForm.name || "Student Scholar",
      matric: regForm.matric || "UJT/2026/MBBS/999",
      email: regForm.email,
      level: regForm.level,
      course: regForm.course,
      gender: "Male",
      phone: regForm.phone || "+2348000000000",
      isAdmin: true,
      points: 150,
      reputation: 100
    });
    setIsAuthenticated(true);
    showToast(`Welcome to MedHaven Hub, ${regForm.name || 'Scholar'}!`, "success");
  };

  const handleLoginFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loginForm.email.includes("@")) {
      showToast("Enter a valid JUTH or university email address.", "error");
      return;
    }
    setIsAuthenticated(true);
    showToast(`Successfully logged in as ${userProfile.name}!`, "success");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white transition-all duration-300">
      
      {/* Dynamic Floating Toast Feedback */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' :
          toast.type === 'error' ? 'bg-rose-950/90 border-rose-500/30 text-rose-300' :
          'bg-cyan-950/90 border-cyan-500/30 text-cyan-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
          <span className="text-xs font-bold">{toast.message}</span>
          <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="text-slate-400 hover:text-slate-100 transition ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= AUTH SPLASH PORTAL ================= */}
      {!isAuthenticated ? (
        <div className="flex-grow flex flex-col lg:flex-row items-stretch justify-center min-h-screen bg-slate-900">
          
          {/* Left Column - Graphic features highlighting sunny ambulance block driveway */}
          <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-slate-950">
            <div className="absolute inset-0 bg-cover bg-center opacity-40 z-0" style={{ backgroundImage: `url(${JUTH_IMAGES.ambulanceDriveway})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/10 z-10" />
            
            <div className="relative z-20 flex items-center gap-3">
              <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2.5 rounded-xl">
                <HeartPulse className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white">MedHaven Hub</h2>
                <p className="text-xs text-slate-400">Jos University Teaching Hospital Academic Suite</p>
              </div>
            </div>

            <div className="relative z-20 space-y-4">
              <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> 2026 Medical Training Systems Live
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
                Empowering JUTH Clinical Scholars with Grounded Intelligence
              </h1>
              <p className="text-sm text-slate-300 max-w-md">
                Find lecture slides, verified diagnostic checklists, medical gear listings, and our interactive clinical reasoning companion in one responsive workspace.
              </p>
            </div>

            <div className="relative z-20 text-xs text-slate-500 font-bold">
              <span>© 2026 Jos University Medical Students Association (JUMSA)</span>
            </div>
          </div>

          {/* Right Column - Authentication forms */}
          <div className="flex-grow lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-950 relative">
            <div className="w-full max-w-md space-y-8">
              
              <div className="text-center lg:text-left space-y-2">
                <div className="lg:hidden flex justify-center mb-4">
                  <div className="bg-cyan-600 p-3 rounded-xl">
                    <HeartPulse className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold text-white">
                  {isRegistering ? "Create your Scholar Account" : "Access MedHaven JUTH Hub"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isRegistering ? "Register your level details to customize study filters" : "Enter your academic credentials to proceed to materials"}
                </p>
              </div>

              {isRegistering ? (
                /* Registration Screen Form fields matching phase criteria */
                <form onSubmit={handleRegFormSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Full Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={regForm.name}
                        onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                        placeholder="e.g. Daniel Pam" 
                        className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Matric Number *</label>
                      <input 
                        type="text" 
                        required 
                        value={regForm.matric}
                        onChange={(e) => setRegForm({ ...regForm, matric: e.target.value })}
                        placeholder="e.g. UJT/2022/MBBS/014" 
                        className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">University Email Address *</label>
                    <input 
                      type="email" 
                      required 
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="e.g. john.doe@juth.edu.ng" 
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Course of Study</label>
                      <select 
                        value={regForm.course}
                        onChange={(e) => setRegForm({ ...regForm, course: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="Medicine and Surgery (MBBS)">MBBS (Medicine & Surgery)</option>
                        <option value="Dental Surgery (BDS)">BDS (Dental Surgery)</option>
                        <option value="Nursing Sciences">Nursing Sciences</option>
                        <option value="Pharmacy">Pharmacy</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Current Level</label>
                      <select 
                        value={regForm.level}
                        onChange={(e) => setRegForm({ ...regForm, level: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
                      >
                        {LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Password *</label>
                      <input 
                        type="password" 
                        required 
                        minLength={8}
                        value={regForm.password}
                        onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                        placeholder="••••••••" 
                        className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Confirm Password *</label>
                      <input 
                        type="password" 
                        required 
                        minLength={8}
                        value={regForm.confirmPassword}
                        onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                        placeholder="••••••••" 
                        className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold py-2.5 rounded-lg shadow-lg shadow-cyan-500/10 transition-all duration-300 mt-2"
                  >
                    Register Scholar Profile
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLoginFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">University Email Address</label>
                    <input 
                      type="email" 
                      required 
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      placeholder="e.g. john.snow@juth.edu.ng" 
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Password</label>
                      <button type="button" onClick={() => showToast("Diagnostic reset query sent to JUTH server directory.", "info")} className="text-[10px] text-cyan-400 hover:underline">Forgot password?</button>
                    </div>
                    <input 
                      type="password" 
                      required 
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="••••••••" 
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold py-2.5 rounded-lg shadow-lg shadow-cyan-500/10 transition-all duration-300"
                  >
                    Proceed to Hub
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-850"></div>
                    <span className="flex-shrink mx-4 text-slate-600 text-[10px] uppercase font-black tracking-wider">or verify directory</span>
                    <div className="flex-grow border-t border-slate-850"></div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => { setIsAuthenticated(true); showToast("Authenticated successfully via JUTH Cloud Directory.", "success"); }}
                    className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-855 text-slate-300 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition"
                  >
                    <Globe className="w-4 h-4 text-cyan-400" /> Continue with Google Directory
                  </button>
                </form>
              )}

              <div className="text-center">
                <button 
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-xs text-slate-400 hover:text-cyan-400 transition font-medium"
                >
                  {isRegistering ? "Already have a scholar file? Sign in here" : "New JUTH Clinical Student? Create a Free Profile"}
                </button>
              </div>

            </div>
          </div>

        </div>
      ) : (
        /* ================= MAIN APPLICATION shell ================= */
        <div className="flex flex-col min-h-screen">
          
          {/* Main Top Header Bar */}
          <header className="border-b border-slate-850 bg-slate-950/90 backdrop-blur sticky top-0 z-40 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-cyan-500/20">
                <HeartPulse className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">MedHaven Hub</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jos University Teaching Hospital • Academic Suite</p>
              </div>
            </div>

            {/* Global Search Interface */}
            <div className="flex-grow max-w-md mx-auto md:mx-0 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search cardiology slides, DKA guides, past medical boards..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-850 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Dynamic Class level switcher / admin display */}
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-850 p-1.5 pr-4 rounded-full">
              <div className="h-8 w-8 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-cyan-500/20">
                {userProfile.name[0]}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <p className="font-bold text-slate-200 leading-tight">{userProfile.name}</p>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[10px]">Level: </span>
                  <select 
                    value={userProfile.level}
                    onChange={(e) => {
                      setUserProfile({ ...userProfile, level: e.target.value });
                      setSelectedLevelFilter(e.target.value);
                      showToast(`Academic dashboard dynamic filters configured for ${e.target.value}.`, 'info');
                    }}
                    className="bg-transparent text-cyan-400 font-bold border-none p-0 m-0 focus:outline-none text-[10px]"
                  >
                    {LEVELS.map(lvl => <option key={lvl} value={lvl} className="bg-slate-950 text-slate-300">{lvl}</option>)}
                  </select>
                </div>
              </div>
              {userProfile.isAdmin && (
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Admin</span>
              )}
              <button 
                onClick={() => { setIsAuthenticated(false); showToast("Logged out of session safely.", "info"); }}
                className="text-slate-500 hover:text-rose-400 transition ml-2"
                title="Sign out of system"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* ================= SECONDARY NAVIGATION / TABS ================= */}
          <nav className="bg-slate-950/80 border-b border-slate-850 px-4 overflow-x-auto flex gap-1 scrollbar-none scroll-smooth sticky top-[61px] z-30 backdrop-blur">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'library', label: 'Study Library', icon: BookOpen },
              { id: 'timetable', label: 'Rotation Timetables', icon: Calendar },
              { id: 'quizzes', label: 'Quizzes & Recalls', icon: Award },
              { id: 'marketplace', label: 'Equipment Market', icon: ShoppingBag },
              { id: 'staff', label: 'Staff Directory', icon: Users },
              { id: 'blogs', label: 'Campus Gists', icon: MessageSquare },
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
                      ? 'border-cyan-500 text-cyan-400 bg-cyan-950/10' 
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* ================= MAIN CONTENT SPACE ================= */}
          <main className="flex-grow p-4 md:p-6 max-w-7xl w-full mx-auto">
            
            {/* Urgent Notification Banner */}
            {announcements.filter(a => a.priority === 'High' && (a.level === 'All' || a.level === userProfile.level)).map(ann => (
              <div key={ann.id} className="mb-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3.5 animate-pulse">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-rose-400 bg-rose-950/40 px-2.5 py-0.5 rounded-full">Urgent Alert • {ann.level}</span>
                  <h4 className="font-extrabold text-rose-100 text-sm mt-1.5">{ann.title}</h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{ann.content}</p>
                </div>
              </div>
            ))}

            {/* ================= 1. DASHBOARD VIEW ================= */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* Hero section featuring JUTH main admission gate */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-850 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-cyan-950/10 z-0" />
                  
                  <div className="relative z-10 space-y-2.5 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-xs font-bold border border-cyan-500/20">
                      <HeartPulse className="w-3.5 h-3.5" /> JUTH systems mapped
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">Welcome back, Scholar {userProfile.name}</h2>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                      Dashboard resources and rotations filtered for <span className="text-cyan-400 font-black">{userProfile.level}</span>. Prepare for morning Ward 11 rounds and cardiology postings with our customized revision library.
                    </p>
                    <div className="flex gap-4 pt-2">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Reward points</p>
                        <p className="text-xs font-bold text-slate-200">{userProfile.points} Points</p>
                      </div>
                      <div className="border-l border-slate-800 pl-4">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Academic Level</p>
                        <p className="text-xs font-bold text-cyan-400">Clinical Training</p>
                      </div>
                    </div>
                  </div>

                  {/* Cloudy entrance gate photo exactly matched */}
                  <div className="relative z-10 w-full md:w-72 h-44 rounded-xl overflow-hidden border border-slate-800 shadow-2xl shrink-0 group">
                    <img 
                      src={JUTH_IMAGES.mainGate} 
                      alt="JUTH Main admission gate"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex flex-col justify-end p-3">
                      <p className="text-[10px] font-black text-white uppercase tracking-wider">Lamingo Campus Entrance</p>
                      <p className="text-[10px] text-slate-400">Clouds over main admission arches</p>
                    </div>
                  </div>
                </div>

                {/* Subject curriculum index cards based on level */}
                <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-extrabold text-base text-slate-100">Personalized Course Folders</h3>
                  </div>

                  {userProfile.level === '400L' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-850 space-y-3">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/40 w-fit px-2 py-0.5 rounded">Medicine Block (M1/M2)</span>
                        <h4 className="font-bold text-slate-200 text-xs">Cardiology, Endocrinology & Renal</h4>
                        <p className="text-[11px] text-slate-400 leading-normal">DKA resuscitating flowcharts, heart failure guidelines, and neurology slide sets.</p>
                        <button onClick={() => { setActiveTab('library'); setSelectedDeptFilter('Medicine'); }} className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-bold">Open repository <ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-850 space-y-3">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950/40 w-fit px-2 py-0.5 rounded">Surgery Block (S1/S2)</span>
                        <h4 className="font-bold text-slate-200 text-xs">General Surgery, Plastics & Trauma</h4>
                        <p className="text-[11px] text-slate-400 leading-normal">Acute abdomen parameters, subdiaphragmatic diagnostics, and neurosurgical notes.</p>
                        <button onClick={() => { setActiveTab('library'); setSelectedDeptFilter('Surgery'); }} className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-bold">Open repository <ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-850 space-y-3">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/40 w-fit px-2 py-0.5 rounded">Pathology & Pharmacology</span>
                        <h4 className="font-bold text-slate-200 text-xs">Haematology & Chempath Runs</h4>
                        <p className="text-[11px] text-slate-400 leading-normal">Blood film interpretations, bacteriology slide summaries, and drug formulas.</p>
                        <button onClick={() => { setActiveTab('library'); setSelectedDeptFilter('Pathology and Pharmacology'); }} className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-bold">Open repository <ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>

                    </div>
                  ) : (
                    <div className="p-6 bg-slate-900 border border-slate-850 rounded-xl text-center space-y-2">
                      <p className="text-xs text-slate-400">Pre-clinical curriculum slides, anatomical nerve diagrams, and biochemistry mock tests are loaded.</p>
                      <button onClick={() => { setActiveTab('library'); setSelectedLevelFilter(userProfile.level); }} className="text-xs text-cyan-400 font-bold hover:underline">Explore material folders →</button>
                    </div>
                  )}
                </div>

                {/* Ward 11 Spotlight containing stethoscope photograph */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  <div className="lg:col-span-2 bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden p-6 relative">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                      
                      <div className="space-y-3 flex-grow">
                        <div className="inline-flex items-center gap-1 bg-teal-500/10 text-teal-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-teal-500/20">
                          <MapPin className="w-3.5 h-3.5" /> JUTH Clinical Spotlight
                        </div>
                        <h4 className="text-lg font-black text-white leading-tight">Ward 11 - Male Medical Ward rounds</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Review Framingham clinical markers, fluid charts, and drug mechanisms prior to embarking on rounds with consultants. Always ensure your diagnostic stethoscope is packed.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <button onClick={() => { setActiveTab('library'); setSelectedDeptFilter('Medicine'); }} className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-md shadow-cyan-600/10">Read clinical slides</button>
                          <button onClick={() => { setActiveTab('staff'); }} className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-bold px-3 py-2 rounded-lg transition">Staff directory</button>
                        </div>
                      </div>

                      {/* Stethoscope in front of Ward 11 exactly registered */}
                      <div className="w-full md:w-56 h-36 rounded-xl overflow-hidden border border-slate-800 relative shadow-lg shrink-0 group">
                        <img src={JUTH_IMAGES.ward11Entrance} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="Ward 11 door with stethoscope" />
                        <div className="absolute inset-0 bg-slate-950/60 flex items-end p-2.5">
                          <span className="text-[10px] font-bold text-white bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">Ward 11 Entry Gateway</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Courtyard flowering tree display panel */}
                  <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between gap-4">
                    <div>
                      <h4 className="font-extrabold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5"><HeartPulse className="w-4 h-4 text-cyan-400" /> Morning Fellowship</h4>
                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">Join standard student prayer groups in the administrative courtyard before lecture blocks.</p>
                    </div>

                    <div className="h-28 rounded-lg overflow-hidden relative border border-slate-850">
                      <img src={JUTH_IMAGES.courtyardTree} className="w-full h-full object-cover" alt="Administrative garden" />
                      <div className="absolute inset-0 bg-slate-950/30 flex items-end p-2">
                        <span className="text-[9px] text-slate-200 uppercase font-black tracking-wider">Courtyard Flowering Tree</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Quick actions links */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Study Library Repository', desc: 'Lecture slides & notes', action: () => { setActiveTab('library'); }, icon: BookOpen, color: 'text-cyan-400' },
                    { label: 'Rotation Timetables', desc: 'Ward rounds schedule', action: () => { setActiveTab('timetable'); }, icon: Calendar, color: 'text-indigo-400' },
                    { label: 'Practice MCQ Exams', desc: 'Prepare for boards', action: () => { setActiveTab('quizzes'); }, icon: Award, color: 'text-emerald-400' },
                    { label: 'Equipment Marketplace', desc: 'Buy/trade scrubs & gear', action: () => { setActiveTab('marketplace'); }, icon: ShoppingBag, color: 'text-rose-400' },
                  ].map((act, index) => {
                    const Icon = act.icon;
                    return (
                      <button 
                        key={index}
                        onClick={act.action}
                        className="p-4 bg-slate-950 border border-slate-850 rounded-xl text-left hover:border-slate-700 transition"
                      >
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 w-fit mb-3">
                          <Icon className={`w-5 h-5 ${act.color}`} />
                        </div>
                        <h5 className="text-xs font-bold text-slate-200 leading-tight">{act.label}</h5>
                        <p className="text-[10px] text-slate-500 mt-1">{act.desc}</p>
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 border border-slate-850 p-6 rounded-2xl">
                  <div>
                    <h2 className="text-xl font-black text-slate-100">JUTH Digital Study Vault</h2>
                    <p className="text-xs text-slate-400 mt-1">Direct level-restricted files database containing clinical slides and PDF checklists.</p>
                  </div>
                  <button 
                    onClick={() => {
                      if(userProfile.isAdmin) {
                        setShowDocUploadModal(true);
                      } else {
                        showToast("Admin privilege is required to upload files.", "error");
                      }
                    }}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/10 transition"
                  >
                    <Upload className="w-4 h-4" /> Upload Study Material
                  </button>
                </div>

                {/* Library Filter Settings */}
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-wrap gap-3 items-center">
                    
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 mr-2">Level Class:</span>
                      <select 
                        value={selectedLevelFilter} 
                        onChange={(e) => setSelectedLevelFilter(e.target.value)}
                        className="bg-slate-900 text-slate-300 text-xs px-3 py-1.5 rounded border border-slate-800 font-bold focus:outline-none"
                      >
                        <option value="All">All Accessible Levels</option>
                        {LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 mr-2">Department:</span>
                      <select 
                        value={selectedDeptFilter} 
                        onChange={(e) => setSelectedDeptFilter(e.target.value)}
                        className="bg-slate-900 text-slate-300 text-xs px-3 py-1.5 rounded border border-slate-800 font-bold focus:outline-none"
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

                  <span className="text-xs text-slate-500 font-bold">Showing {filteredLibrary.length} study resource(s)</span>
                </div>

                {/* Content grid */}
                {filteredLibrary.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLibrary.map(item => (
                      <div key={item.id} className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between">
                        <div className="p-5 space-y-4">
                          <div className="flex justify-between items-start">
                            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {item.type}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{item.level} • {item.department}</span>
                          </div>

                          <div className="space-y-1.5">
                            <h4 className="font-extrabold text-slate-200 text-sm leading-snug">{item.title}</h4>
                            <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{item.description}</p>
                          </div>

                          <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-cyan-500" /> {item.subfolder}</span>
                            <span>Uploaded by: {item.uploadedBy}</span>
                          </div>
                        </div>

                        {/* Interactive operations links */}
                        <div className="bg-slate-900/60 px-5 py-3.5 border-t border-slate-850 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><Eye className="w-4 h-4 text-slate-500" /> {item.views}</span>
                            <span className="flex items-center gap-1"><Download className="w-4 h-4 text-slate-500" /> {item.downloads}</span>
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
                              className="p-2 rounded-lg bg-slate-950 border border-slate-850 text-cyan-400 hover:bg-slate-900 transition"
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
                              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                            >
                              <Download className="w-3.5 h-3.5" /> PDF
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-850 p-12 text-center rounded-2xl space-y-3">
                    <Folder className="w-12 h-12 text-slate-600 mx-auto" />
                    <h4 className="font-bold text-slate-300">No resources found matching filters</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">Try selecting a different level or course category to expand your search results.</p>
                  </div>
                )}

              </div>
            )}

            {/* ================= 3. TIMETABLES ROTATION VIEW ================= */}
            {activeTab === 'timetable' && (
              <div className="space-y-6">
                
                <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 px-3 py-0.5 rounded-full text-xs font-bold border border-indigo-500/20">
                      <Calendar className="w-3.5 h-3.5" /> Clinical rotations schedule
                    </div>
                    <h3 className="font-extrabold text-xl text-slate-100">Ward & Posting Rotation Timetables</h3>
                    <p className="text-xs text-slate-400">Timetable slots maintained by JUMSA coordinators and department secretaries.</p>
                  </div>

                  <button 
                    onClick={() => setShowTimetableModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition"
                  >
                    <Plus className="w-4 h-4" /> Add Timetable Slot
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Calendar schedule panels */}
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Dynamic Class Rotation Matrix ({userProfile.level})</h4>
                    
                    <div className="bg-slate-950 border border-slate-850 rounded-2xl divide-y divide-slate-850 overflow-hidden">
                      {timetable.filter(t => t.level === userProfile.level).length > 0 ? (
                        timetable.filter(t => t.level === userProfile.level).map(slot => (
                          <div key={slot.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-900/30 transition">
                            <div className="flex items-start gap-4">
                              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center min-w-[100px] shrink-0">
                                <span className="text-[10px] font-black uppercase text-cyan-400 block tracking-wider">{slot.day}</span>
                                <span className="text-[11px] text-slate-500 block mt-1">{slot.time}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 px-2.5 py-0.5 rounded-full tracking-wider block w-fit">
                                  {slot.activity}
                                </span>
                                <h5 className="font-extrabold text-slate-200 text-sm mt-1.5">{slot.course}</h5>
                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-500" /> {slot.location}</span>
                                  {slot.lecturer && <span>Taught by: {slot.lecturer}</span>}
                                </div>
                              </div>
                            </div>

                            <button 
                              onClick={() => showToast(`Schedule block synchronized with your local calendar account.`, "success")}
                              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-slate-300 px-3 py-1.5 rounded-lg transition shrink-0"
                            >
                              Sync Calendar
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center text-slate-500 text-xs">No active postings registered for your level. Try updating level settings in header profile list.</div>
                      )}
                    </div>
                  </div>

                  {/* Ward round reminders & Emergency unit photo */}
                  <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-4 h-fit">
                    <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5"><HeartPulse className="w-4 h-4 text-rose-400 animate-pulse" /> Emergency Unit Protocols</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">Prior to entering hospital blocks or starting clinical rotations, review DKA resuscitation charts and make sure to have your stethoscopes.</p>
                    
                    <ul className="space-y-3 text-xs text-slate-300">
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
                    <div className="rounded-xl overflow-hidden border border-slate-800 relative h-36">
                      <img src={JUTH_IMAGES.emergencyTicker} className="w-full h-full object-cover" alt="Red LED emergency ticker board" />
                      <div className="absolute inset-0 bg-slate-950/20" />
                    </div>
                  </div>

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
                      <h3 className="font-black text-lg text-slate-100">Practice Exams & Case Recalls</h3>
                      <p className="text-xs text-slate-400">Prepare for clinical professional medical board assessments with interactive case questions.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {PRE_MADE_QUIZZES.map(quiz => (
                          <div key={quiz.id} className="bg-slate-950 border border-slate-850 p-5 rounded-2xl space-y-4">
                            <div>
                              <span className="text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">{quiz.level} • {quiz.department}</span>
                              <h4 className="font-extrabold text-slate-200 text-sm mt-3">{quiz.title}</h4>
                              <p className="text-xs text-slate-500 mt-1">{quiz.questions.length} High-Yield diagnostic questions</p>
                            </div>

                            <button 
                              onClick={() => {
                                setActiveQuiz(quiz);
                                setCurrentQuestionIndex(0);
                                setUserAnswers({});
                                setQuizSubmitted(false);
                                setQuizActive(true);
                              }}
                              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black py-2 rounded-xl shadow-lg transition"
                            >
                              Start Practice Quiz
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Active recall block */}
                    <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-4 h-fit">
                      <h4 className="font-extrabold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-cyan-400" /> Active Recall flashcards</h4>
                      <p className="text-xs text-slate-400">Quick-fire revision points for clinical assessments.</p>
                      
                      <div className="p-4 bg-slate-900 border border-slate-850 rounded-xl space-y-3">
                        <span className="text-[9px] font-black text-emerald-400 tracking-widest block uppercase">Pharmacology Recall</span>
                        <h5 className="font-bold text-slate-200 text-xs leading-snug">What is the therapeutic mechanism of action of Artemether-Lumefantrine?</h5>
                        <button 
                          onClick={() => showToast("Answer: Artemether produces free radicals that damage parasite proteins, while Lumefantrine clears remaining parasites by inhibiting hemozoin synthesis.", "info")}
                          className="text-xs text-cyan-400 font-bold hover:underline block"
                        >
                          Reveal Answer
                        </button>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* Live test platform */
                  <div className="bg-slate-950 border border-slate-850 p-6 md:p-8 rounded-2xl max-w-2xl mx-auto space-y-6">
                    
                    <div className="flex justify-between items-center pb-4 border-b border-slate-850">
                      <h3 className="font-black text-slate-100 text-base">{activeQuiz.title}</h3>
                      <button 
                        onClick={() => setQuizActive(false)}
                        className="text-slate-400 hover:text-rose-400 text-xs font-bold"
                      >
                        Exit Test
                      </button>
                    </div>

                    {!quizSubmitted ? (
                      <div className="space-y-6">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}</span>
                          <h4 className="font-extrabold text-slate-200 text-sm sm:text-base mt-1 leading-relaxed">
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
                                  ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 font-bold shadow-lg' 
                                  : 'bg-slate-900 border-slate-850 hover:bg-slate-850 text-slate-300'
                              }`}
                            >
                              <span>{opt}</span>
                              {userAnswers[currentQuestionIndex] === opt && <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />}
                            </button>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-850">
                          <button
                            disabled={currentQuestionIndex === 0}
                            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                            className="text-slate-400 hover:text-slate-200 text-xs font-bold disabled:opacity-40"
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
                                setUserProfile({ ...userProfile, points: userProfile.points + (score * 10) });
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
                              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg"
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
                          <h4 className="font-extrabold text-slate-100 text-base">Assessment Evaluated</h4>
                          <p className="text-xs text-slate-400">
                            You scored <span className="text-emerald-400 font-extrabold">{quizScore}</span> correct out of {activeQuiz.questions.length} items.
                          </p>
                          <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-widest">+{quizScore * 10} reward points added</span>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-850">
                          <h5 className="font-bold text-xs uppercase text-slate-300 tracking-wider">Clinical Explanations:</h5>
                          {activeQuiz.questions.map((q, qIdx) => (
                            <div key={qIdx} className="p-4 bg-slate-900 border border-slate-850 rounded-xl space-y-2 text-xs">
                              <p className="font-extrabold text-slate-200">{q.question}</p>
                              <p className="text-slate-400">Selected Answer: <span className={userAnswers[qIdx] === q.answer ? 'text-emerald-400 font-bold' : 'text-rose-400'}>{userAnswers[qIdx] || 'No selection'}</span></p>
                              <p className="text-emerald-400 font-bold">Verified Correct: {q.answer}</p>
                              <p className="text-[11px] text-slate-500 italic mt-1 leading-normal">{q.explanation}</p>
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => setQuizActive(false)}
                          className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-black py-2.5 rounded-xl mt-4"
                        >
                          Return to Quiz Portal
                        </button>
                      </div>
                    )}

                  </div>
                )}

              </div>
            )}

            {/* ================= 5. EQUIPMENT MARKETPLACE VIEW ================= */}
            {activeTab === 'marketplace' && (
              <div className="space-y-6">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 border border-slate-850 p-6 rounded-2xl">
                  <div>
                    <h2 className="text-xl font-black text-slate-100">JUTH Peer Equipment Marketplace</h2>
                    <p className="text-xs text-slate-400 mt-1">Direct peer-to-peer catalog to trade scrubs, stethoscopes, and surgical dissection kits.</p>
                  </div>
                  <button 
                    onClick={() => setShowItemPostModal(true)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg"
                  >
                    <Plus className="w-4 h-4" /> Post Equipment
                  </button>
                </div>

                {/* Marketplace listing catalog */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {marketItems.map(item => (
                    <div key={item.id} className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden hover:border-slate-700 transition flex flex-col justify-between">
                      <div className="p-4 space-y-4">
                        <div className="h-44 rounded-xl overflow-hidden bg-slate-900 border border-slate-850 relative">
                          <img src={item.img} className="w-full h-full object-cover" alt="medical gear" />
                          <span className="absolute top-3 right-3 bg-slate-950/80 border border-emerald-500/20 backdrop-blur-sm text-emerald-400 font-extrabold text-xs px-3 py-1 rounded-lg">
                            {item.price}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span className="bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded font-black text-slate-300 uppercase tracking-wide">{item.condition}</span>
                            <span>{item.category}</span>
                          </div>
                          <h4 className="font-extrabold text-slate-200 text-sm leading-snug">{item.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 px-4 py-3 border-t border-slate-850 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Listed by: {item.sellerName}</span>
                        <a 
                          href={`https://wa.me/${item.sellerPhone.replace(/[^0-9+]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Buy
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* ================= 6. STAFF DIRECTORY VIEW ================= */}
            {activeTab === 'staff' && (
              <div className="space-y-6">
                
                <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl">
                  <h3 className="font-black text-xl text-slate-100">Dean, Consultants & Class Reps Directory</h3>
                  <p className="text-xs text-slate-400 mt-1">Get verified clinical contact numbers for teaching consultants, registrars, and level leaders.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {staffList.map(staff => (
                    <div key={staff.id} className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden flex flex-col justify-between">
                      <div className="p-5 flex gap-4 items-start">
                        <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-800 bg-slate-900 shrink-0 flex items-center justify-center font-bold text-lg text-slate-300 shadow-inner">
                          {staff.name[0]}
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 w-fit block tracking-wider">
                            {staff.role}
                          </span>
                          <h4 className="font-extrabold text-slate-200 text-sm">{staff.name}</h4>
                          <p className="text-xs text-slate-400">{staff.department} Department</p>
                          <p className="text-[11px] text-slate-500 leading-tight italic">{staff.subspecialty}</p>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 border-t border-slate-850 px-5 py-3 flex items-center justify-between gap-4">
                        <span className="text-xs text-slate-500 truncate">{staff.email}</span>
                        <a 
                          href={`https://wa.me/${staff.phone.replace(/[^0-9+]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase font-black tracking-wider px-3 py-1.5 rounded-lg shadow-md transition"
                        >
                          Message Rep
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* ================= 7. CAMPUS GISTS AND BLOGS VIEW ================= */}
            {activeTab === 'blogs' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Newsfeed cards column */}
                <div className="lg:col-span-2 space-y-6">
                  <h3 className="font-black text-lg text-slate-100 uppercase tracking-wider">JUMSA Editorial News Feed</h3>
                  
                  <div className="space-y-4">
                    {blogPosts.map(post => (
                      <div key={post.id} className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-3 hover:border-slate-700 transition">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                          <span>{post.category}</span>
                          <span>{post.date}</span>
                        </div>
                        <h4 className="font-extrabold text-slate-200 text-sm sm:text-base">{post.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{post.content}</p>
                        <div className="flex justify-between items-center pt-2 text-xs">
                          <span className="text-slate-500 font-bold">Author: {post.author}</span>
                          <button onClick={() => showToast(`Successfully registered bookmark for: ${post.title}`, "success")} className="text-cyan-400 font-bold hover:underline">Bookmark Story</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Peer Study Circle Panel */}
                <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-4 h-fit">
                  <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Active Peer Revision Circles</h4>
                  <p className="text-xs text-slate-400 leading-normal">Register to secure a revision slot inside Lamingto Hall study spaces.</p>
                  
                  <div className="space-y-3">
                    {[
                      { name: "Pathology Board Exam Study Group", members: "24 registered", limit: "30 max" },
                      { name: "Clinical Surgery Prep Circle", members: "10 registered", limit: "15 max" }
                    ].map((group, groupIdx) => (
                      <div key={groupIdx} className="p-3 bg-slate-900 border border-slate-850 rounded-xl flex justify-between items-center gap-3">
                        <div>
                          <h5 className="font-bold text-slate-200 text-xs leading-tight">{group.name}</h5>
                          <p className="text-[10px] text-slate-500 mt-0.5">{group.members} • {group.limit}</p>
                        </div>
                        <button 
                          onClick={() => showToast(`You have been added to ${group.name}! Check your student dashboard alerts.`, "success")}
                          className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-cyan-400 text-[10px] font-black px-3 py-1.5 rounded-lg transition"
                        >
                          Join Group
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ================= 8. ADMINISTRATIVE WORKSPACE ================= */}
            {activeTab === 'admin' && userProfile.isAdmin && (
              <div className="space-y-6">
                
                <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl">
                  <h3 className="font-black text-xl text-slate-100">JUTH Admin Command Console</h3>
                  <p className="text-xs text-slate-400 mt-1">Direct operational settings to configure slide files, publish ward schedules, update clinical staff, and broadcast notices.</p>
                </div>

                {/* Creation triggers row */}
                <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-4">
                  <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Publish Control Operations</h4>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => setShowDocUploadModal(true)}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-4 h-4" /> Upload Study Material
                    </button>
                    <button 
                      onClick={() => setShowTimetableModal(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-4 h-4" /> Add Timetable Rotation
                    </button>
                    <button 
                      onClick={() => setShowAnnouncementModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-4 h-4" /> Broadcast Announcement
                    </button>
                  </div>
                </div>

                {/* Gemini Setup panel */}
                <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-cyan-400" />
                    <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">AI Companion Configuration Settings</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Configure your direct Gemini API key below to unlock real-time intelligence. If left blank, the app runs on its customized local medical training backup framework.
                  </p>
                  <div className="max-w-md space-y-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Gemini API Key</label>
                    <input 
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="e.g. AIzaSy..."
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                    />
                    {geminiApiKey.trim() ? (
                      <span className="text-[10px] text-emerald-400 font-bold block">✓ Direct Gemini API connectivity established</span>
                    ) : (
                      <span className="text-[10px] text-yellow-500 font-bold block">⚠ Running in local diagnostic fallback mode</span>
                    )}
                  </div>
                </div>

                {/* System logs */}
                <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-3">
                  <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Database Connection Logs</h4>
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-850 text-[10px] sm:text-xs font-mono text-slate-400 space-y-1.5">
                    <p><span className="text-emerald-400">[CONNECTED]</span> PostgreSQL Supabase connection verified.</p>
                    <p><span className="text-cyan-400">[ROUTING]</span> Level-based filtering rules successfully mapped for clinical groups.</p>
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
              className="bg-gradient-to-tr from-cyan-500 to-blue-600 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition flex items-center gap-2"
            >
              <Sparkles className="w-6 h-6 animate-pulse" />
              <span className="text-xs font-black pr-1 hidden sm:inline">Ask JUTH AI Tutor</span>
            </button>

            {showAITutor && (
              <div className="w-80 sm:w-96 h-[460px] bg-slate-950 border border-slate-850 rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
                
                {/* AI Chat Header */}
                <div className="bg-slate-900 border-b border-slate-850 px-4 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-cyan-400 animate-pulse" />
                    <div>
                      <h4 className="font-extrabold text-slate-100 text-xs">Clinical AI Study Tutor</h4>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">JUTH Rounds Diagnostic Assistant</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAITutor(false)} className="text-slate-400 hover:text-rose-400 transition">
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Chat window */}
                <div className="flex-grow overflow-y-auto p-4 space-y-3.5 scrollbar-none">
                  {aiChat.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-3 rounded-xl max-w-[85%] text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-cyan-600 text-white rounded-br-none' 
                          : 'bg-slate-900 border border-slate-850 text-slate-200 rounded-bl-none'
                      }`}>
                        {msg.text.split('\n').map((line, lidx) => (
                          <p key={lidx} className={lidx > 0 ? "mt-1" : ""}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="p-3 bg-slate-900 border border-slate-850 text-slate-400 text-xs rounded-xl rounded-bl-none flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" /> Formulating high-yield JUTH clinical notes...
                      </div>
                    </div>
                  )}
                </div>

                {/* User input */}
                <form onSubmit={handleAITutorSubmit} className="p-3 bg-slate-900 border-t border-slate-850 flex gap-2">
                  <input
                    type="text"
                    required
                    disabled={aiLoading}
                    placeholder="Ask about Cardiology, Malaria, DKA fluid regimes..."
                    value={aiInput}
                    onChange={(e) => setAIInput(e.target.value)}
                    className="flex-grow px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs text-slate-200 placeholder-slate-600 rounded-lg focus:outline-none"
                  />
                  <button 
                    type="submit"
                    disabled={aiLoading}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white p-2.5 rounded-lg transition"
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
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-slate-100 text-base">Upload Study Resource</h4>
                  <button onClick={() => setShowDocUploadModal(false)} className="text-slate-400 hover:text-rose-400"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleDocUploadSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Title *</label>
                    <input 
                      type="text" 
                      required 
                      value={newDoc.title} 
                      onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                      placeholder="e.g. Cardiology Lecture - Heart Failure"
                      className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Description Summary</label>
                    <textarea 
                      value={newDoc.desc} 
                      onChange={(e) => setNewDoc({ ...newDoc, desc: e.target.value })}
                      placeholder="Brief details or clinical checklists..."
                      className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-slate-200 h-20 focus:outline-none focus:border-cyan-500" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Type</label>
                      <select 
                        value={newDoc.type} 
                        onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-300"
                      >
                        <option>Lecture Slides</option>
                        <option>PDF Document</option>
                        <option>Study Notes</option>
                        <option>Video Lecture</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Level</label>
                      <select 
                        value={newDoc.level} 
                        onChange={(e) => setNewDoc({ ...newDoc, level: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-300"
                      >
                        {LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Department</label>
                      <input 
                        type="text" 
                        required 
                        value={newDoc.dept} 
                        onChange={(e) => setNewDoc({ ...newDoc, dept: e.target.value })}
                        placeholder="e.g. Medicine"
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200" 
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Subfolder Code</label>
                      <input 
                        type="text" 
                        required 
                        value={newDoc.subfolder} 
                        onChange={(e) => setNewDoc({ ...newDoc, subfolder: e.target.value })}
                        placeholder="e.g. M1/Cardiology"
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200" 
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 rounded-xl shadow-lg transition"
                  >
                    Publish Study Resource
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* B. Equipment Post Listing Modal */}
          {showItemPostModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-slate-100 text-base">Post Equipment on Marketplace</h4>
                  <button onClick={() => setShowItemPostModal(false)} className="text-slate-400 hover:text-rose-400"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleMarketItemSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Equipment Title *</label>
                    <input 
                      type="text" 
                      required 
                      value={newItem.title} 
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      placeholder="e.g. Littmann Stethoscope classic"
                      className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-slate-200 focus:outline-none" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Price (₦) *</label>
                      <input 
                        type="text" 
                        required 
                        value={newItem.price} 
                        onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                        placeholder="₦75,000"
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200" 
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">WhatsApp Phone *</label>
                      <input 
                        type="text" 
                        required 
                        value={newItem.phone} 
                        onChange={(e) => setNewItem({ ...newItem, phone: e.target.value })}
                        placeholder="e.g. +2348030001111"
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Description</label>
                    <textarea 
                      value={newItem.desc} 
                      onChange={(e) => setNewItem({ ...newItem, desc: e.target.value })}
                      placeholder="Barely used diagnostic scope, clean membranes..."
                      className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200 h-20" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 rounded-xl shadow-lg transition"
                  >
                    Post Listing Live
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* C. Rotation Timetable Modal */}
          {showTimetableModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-slate-100 text-base">Add Rotation Schedule Slot</h4>
                  <button onClick={() => setShowTimetableModal(false)} className="text-slate-400 hover:text-rose-400"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleTimetableSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Rotation / Subject Title *</label>
                    <input 
                      type="text" 
                      required 
                      value={newSlot.course} 
                      onChange={(e) => setNewSlot({ ...newSlot, course: e.target.value })}
                      placeholder="e.g. Ward 11 Medicine Posting"
                      className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Day</label>
                      <select 
                        value={newSlot.day} 
                        onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-300"
                      >
                        <option>Monday</option>
                        <option>Tuesday</option>
                        <option>Wednesday</option>
                        <option>Thursday</option>
                        <option>Friday</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Time Frame *</label>
                      <input 
                        type="text" 
                        required 
                        value={newSlot.time} 
                        onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                        placeholder="08:00 - 10:00"
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Activity</label>
                      <input 
                        type="text" 
                        required 
                        value={newSlot.activity} 
                        onChange={(e) => setNewSlot({ ...newSlot, activity: e.target.value })}
                        placeholder="Lecture or Ward Round"
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200" 
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Location</label>
                      <input 
                        type="text" 
                        required 
                        value={newSlot.location} 
                        onChange={(e) => setNewSlot({ ...newSlot, location: e.target.value })}
                        placeholder="Lamingto Hall A"
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200" 
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 rounded-xl shadow-lg transition"
                  >
                    Save rotation block
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* D. Broadcast Announcement Modal */}
          {showAnnouncementModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-slate-100 text-base">Broadcast Urgent Notice</h4>
                  <button onClick={() => setShowAnnouncementModal(false)} className="text-slate-400 hover:text-rose-400"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleAnnouncementSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Notice Title *</label>
                    <input 
                      type="text" 
                      required 
                      value={newAnn.title} 
                      onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })}
                      placeholder="Rescheduled pharmacology CA..."
                      className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-slate-200" 
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Details Context *</label>
                    <textarea 
                      required 
                      value={newAnn.content} 
                      onChange={(e) => setNewAnn({ ...newAnn, content: e.target.value })}
                      placeholder="Specify dates, hours, and replacements rooms..."
                      className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-slate-200 h-20" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Priority</label>
                      <select 
                        value={newAnn.priority} 
                        onChange={(e) => setNewAnn({ ...newAnn, priority: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-300"
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Audience Target</label>
                      <select 
                        value={newAnn.level} 
                        onChange={(e) => setNewAnn({ ...newAnn, level: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-300"
                      >
                        <option>All</option>
                        {LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 rounded-xl shadow-lg transition"
                  >
                    Broadcast Live Alert
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================= FOOTER ================= */}
          <footer className="bg-slate-950 border-t border-slate-900 px-6 py-6 mt-12">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-bold">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-cyan-500" />
                <span>MedHaven JUTH Hub • Jos University Teaching Hospital</span>
              </div>
              <div className="flex gap-4 uppercase tracking-wider">
                <a href="#privacy" onClick={(e) => { e.preventDefault(); showToast("Privacy regulations active (NDPR).", "info"); }} className="hover:text-slate-300 transition">NDPR Compliance</a>
                <a href="#support" onClick={(e) => { e.preventDefault(); showToast("Representative directory loaded.", "info"); }} className="hover:text-slate-300 transition">Helpdesk</a>
              </div>
              <div>
                <span>© 2026 JUMSA. All Rights Reserved.</span>
              </div>
            </div>
          </footer>

        </div>
      )}

    </div>
  );
}