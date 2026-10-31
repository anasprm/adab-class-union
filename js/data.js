import { assetPaths } from "./assets.js";

export const roleNames = {
  developer: "Developer",
  teacher: "Class Teacher",
  treasurer: "Treasurer",
  student: "Student",
  wing: "Wing Account"
};

// Profile picture and achievements state keys
export const PROFILE_STORAGE_KEY = "adab_student_profiles";
export const ACHIEVEMENTS_STORAGE_KEY = "adab_student_achievements";

// --- Student Profile Data (LocalStorage persisted) ---
// Each student gets a profile entry with avatar (base64) and achievements array
export const studentProfiles = {
  // { studentId: { avatarBase64, bio, tagline, achievements: [...] } }
};

// --- Achievement Records Structure ---
// { id, studentId, studentRoll, studentName, title, category, awardLevel, date, description, imageUrl, createdAt }
export const achievementRecords = [];

// --- Pre-defined avatar options for quick selection ---
export const avatarOptions = [
  { id: "avatar-1", icon: "📚", label: "Student", color: "#DC2626" },
  { id: "avatar-2", icon: "🏆", label: "Achiever", color: "#991B1B" },
  { id: "avatar-3", icon: "🔬", label: "Science", color: "#3B82F6" },
  { id: "avatar-4", icon: "⚽", label: "Sports", color: "#10B981" },
  { id: "avatar-5", icon: "🎨", label: "Art", color: "#F59E0B" },
  { id: "avatar-6", icon: "📝", label: "Literary", color: "#8B5CF6" }
];

export const rolesAllowedToReview = ["developer", "teacher", "committee"];
export const canManageUnion = profile => rolesAllowedToReview.includes(profile?.role);
export const canManageContent = profile => canManageUnion(profile) || profile?.role === "wing";
export const isTreasurerOrDev = profile => ["developer", "treasurer"].includes(profile?.role);
export const isVerifiedMember = profile => Boolean(profile && profile.is_active && roleNames[profile.role]);

export const coreMembers = [
  { role: "President", name: "Muhammed Jameel.K", roll: "AD-01", initials: "MJ", bio: "Leads the class union with vision, guiding programmes and uniting students toward shared goals.", district: "Malappuram", handle: "@jameel.adab" },
  { role: "Secretary", name: "Muhammed Jasim.MJ", roll: "AD-02", initials: "MJ", bio: "Coordinates union operations, records decisions, and ensures clear communication across all activities.", district: "Kozhikode", handle: "@jasim.adab" },
  { role: "Treasurer", name: "Muhammed Anzil.E", roll: "AD-03", initials: "MA", bio: "Manages class union finances, budget allocations, and transparent financial records.", district: "Kannur", handle: "@anzil.adab" },
  { role: "PRO", name: "Muhammed Adhil.KP", roll: "AD-04", initials: "MA", bio: "Handles public relations, announcements, and outreach for class union events and initiatives.", district: "Wayanad", handle: "@adhil.adab" }
];

export const wings = [
  {
    id: "ethics",
    name: "Arabic Wing",
    icon: "📜",
    accent: "Arabic",
    objective: "Celebrate the rich heritage of Arabic language and literature through melodious recitation, masterclass calligraphy workshops, and expressive spoken-word programmes.",
    activities: [
      "Advanced Quranic recitation & Tajweed training circles",
      "Traditional & modern Arabic calligraphy masterclasses",
      "Inter-house Arabic elocution, poetry & debate symposiums"
    ]
  },
  {
    id: "arts",
    name: "English Wing",
    icon: "🎭",
    accent: "English",
    objective: "Cultivate eloquence, confidence, and linguistic mastery in English through engaging public speaking, creative essay writing, and dramatic stage performances.",
    activities: [
      "Dynamic public speaking & parliamentary debate contests",
      "Creative writing, poetry, and flash fiction editorial circles",
      "English theatrical productions & dramatic monologue showcases"
    ]
  },
  {
    id: "literary",
    name: "Library Wing",
    icon: "📖",
    accent: "Library",
    objective: "Foster a lifelong passion for reading by maintaining a vibrant class library, hosting intellectual book circles, and curating peaceful study sanctuaries.",
    activities: [
      "Weekly peer book reviews & reflective reading circles",
      "Comprehensive library cataloging, catalog curation & lending management",
      "Literary quiz bowls & celebrated author spotlight exhibitions"
    ]
  },
  {
    id: "media",
    name: "Malayalam Wing",
    icon: "🌴",
    accent: "Malayalam",
    objective: "Honour our mother tongue through classical Malayalam poetry recitation, captivating storytelling evenings, and deep explorations of regional literature.",
    activities: [
      "Classical & contemporary Malayalam poetry recitation meets",
      "Traditional storytelling & Kathaprasangam cultural evenings",
      "Regional literary quiz tournaments & heritage essay sessions"
    ]
  },
  {
    id: "pkv",
    name: "PKV",
    icon: "🎯",
    accent: "PKV",
    objective: "Drive specialized PKV student development initiatives, collaborative peer learning pods, and inclusive class-wide engagement across all union activities.",
    activities: [
      "Weekly structured PKV skill-building mentoring sessions",
      "Inter-house PKV collaborative project competitions",
      "Student-led community impact & leadership development workshops"
    ]
  },
  {
    id: "tech",
    name: "Science Wing",
    icon: "🔬",
    accent: "Science",
    objective: "Ignite scientific curiosity and empirical inquiry through hands-on laboratory experiments, interactive science exhibitions, and astronomy stargazing nights.",
    activities: [
      "Innovative science fair exhibition project prototypes",
      "Live physics, chemistry & biology laboratory demonstrations",
      "Astonomy stargazing nights & general science quiz challenges"
    ]
  },
  {
    id: "sports",
    name: "Sports & Athletics Club",
    icon: "⚽",
    accent: "Teamwork",
    objective: "Champion physical wellness, sportsmanship, and vigorous inter-house competition through well-organized athletic leagues and fitness programmes.",
    activities: [
      "Inter-house football, cricket & badminton championship leagues",
      "Annual athletics meet, track events & sprint relay cups",
      "Morning wellness conditioning & physical fitness sessions"
    ]
  },
  {
    id: "social",
    name: "Urdu Wing",
    icon: "✒️",
    accent: "Urdu",
    objective: "Promote the elegance of Urdu poetry, prose, and literary culture through mushairas, fine script calligraphy, and expressive linguistic dialogues.",
    activities: [
      "Graceful Urdu poetry (Mushaira) & ghazal recitation evenings",
      "Traditional Urdu script calligraphy & handwriting workshops",
      "Urdu elocution, debate & literary appreciation circles"
    ]
  }
];
const districts = ["Malappuram", "Kozhikode", "Wayanad", "Kannur", "Palakkad", "Kasaragod", "Thrissur"];
const houses = ["Red Knights", "White Warriors", "Crimson Falcons"];

export const studentSeedData = [
  { roll: "AD-01", name: "Muhammed Riyas", email: "student01@adab.edu", house: "Red Knights", district: "Malappuram", bio: "Union Chairman. Dedicated to community building, student representation, and collaborative learning.", skills: ["Leadership", "Public Speaking"] },
  { roll: "AD-02", name: "Fathima Shirin", email: "student02@adab.edu", house: "White Warriors", district: "Kozhikode", bio: "Vice Chairperson. Passionate about women empowerment in leadership, public speaking, and literature.", skills: ["Debate", "Writing"] },
  { roll: "AD-03", name: "Abdul Hadi", email: "student03@adab.edu", house: "White Warriors", district: "Kannur", bio: "General Secretary. Coordinates meetings, records decisions, and keeps communication moving across the class.", skills: ["Coordination", "Recitation"] },
  { roll: "AD-04", name: "Nida Fathima", email: "student04@adab.edu", house: "Crimson Falcons", district: "Wayanad", bio: "Joint Secretary. Keen reader, creative organizer, and passionate about environment and student wellbeing.", skills: ["Organization", "Writing"] },
  { roll: "AD-05", name: "Shamil Basheer", email: "student05@adab.edu", house: "Crimson Falcons", district: "Malappuram", bio: "Treasurer. Keeps union resources carefully accounted for and manages class budget allocations.", skills: ["Finance", "Mathematics"] },
  { roll: "AD-06", name: "Hiba Nasrin", email: "student06@adab.edu", house: "Red Knights", district: "Kozhikode", bio: "Arts Convenor. Calligrapher, fine artist, and designer exploring Islamic geometry and typography.", skills: ["Calligraphy", "Visual Art"] },
  { roll: "AD-07", name: "Muneeb Rahman", email: "student07@adab.edu", house: "White Warriors", district: "Palakkad", bio: "Sports Secretary. Football captain, 100m sprint champion, and inter-house athletics enthusiast.", skills: ["Football", "Athletics"] },
  { roll: "AD-08", name: "Amina Zoya", email: "student08@adab.edu", house: "Crimson Falcons", district: "Kasaragod", bio: "Magazine Editor. Short story writer, essayist, and editor of the upcoming ADAB Journal Issue 01.", skills: ["Editing", "Creative Writing"] },
  { roll: "AD-09", name: "Safa Mariyam", email: "student09@adab.edu", house: "Red Knights", district: "Thrissur", bio: "Poet and debater. Enjoys classical poetry recitation and writing reflections on everyday life.", skills: ["Poetry", "Debate"] },
  { roll: "AD-10", name: "Yahya Niyas", email: "student10@adab.edu", house: "White Warriors", district: "Malappuram", bio: "Tech enthusiast, Python programmer, and web developer working on class digital projects.", skills: ["Web Development", "Python"] },
  { roll: "AD-11", name: "Rizwana K", email: "student11@adab.edu", house: "Crimson Falcons", district: "Kannur", bio: "Science enthusiast, quiz team member, and avid reader of non-fiction and history.", skills: ["Quiz", "Research"] },
  { roll: "AD-12", name: "Aslam P", email: "student12@adab.edu", house: "Red Knights", district: "Palakkad", bio: "Badminton player, student volunteer, and coordinator for community social drives.", skills: ["Badminton", "Volunteering"] },
  { roll: "AD-13", name: "Ramees Thaha", email: "student13@adab.edu", house: "White Warriors", district: "Kozhikode", bio: "Visual photographer, video editor, and media contributor documenting class moments.", skills: ["Photography", "Video Editing"] },
  { roll: "AD-14", name: "Liyana Noor", email: "student14@adab.edu", house: "Crimson Falcons", district: "Wayanad", bio: "Math club member, peer tutor in physics, and student council active member.", skills: ["Tutoring", "Mathematics"] },
  { roll: "AD-15", name: "Ashraf Najeeb", email: "student15@adab.edu", house: "Red Knights", district: "Malappuram", bio: "Dars student, ethics coordinator, and participant in inter-school Islamic debate contests.", skills: ["Moral Ethics", "Public Speaking"] }
];

export const students = studentSeedData.map(student => ({
  ...student,
  initials: student.name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase(),
  // Initialize profile with default avatar (first option) and empty achievements
  profile: {
    avatarBase64: "",
    bio: student.bio || "",
    tagline: "",
    achievements: []
  }
}));

export const events = [
  { id: "union-fest", title: "ADAB Union Fest 2026", category: "Flagship", date: "2026-12-12T09:00:00+05:30", time: "9:00 AM – 4:00 PM", venue: "Main College Auditorium", status: "Upcoming", description: "A full-day celebration of house performances, creative exhibitions, inter-house quizzes, and awards.", image: assetPaths.event, imageAlt: "Illustrated ADAB Union Fest poster with red geometric motifs" },
  { id: "tech-hackathon", title: "ADAB CodeCraft Challenge", category: "Tech", date: "2026-11-28T10:00:00+05:30", time: "10:00 AM – 3:00 PM", venue: "Computer Lab 02", status: "Upcoming", description: "Build interactive web tools, solve algorithmic puzzles, and showcase student coding projects.", image: assetPaths.event, imageAlt: "Illustrated ADAB event artwork" },
  { id: "reading-circle", title: "Pages & Perspectives", category: "Literary", date: "2026-11-18T10:00:00+05:30", time: "10:00 AM – 11:30 AM", venue: "Reading Room", status: "Upcoming", description: "An easy-going reading circle for sharing a passage, a question, or a book you think others should discover.", image: assetPaths.event, imageAlt: "Illustrated ADAB event artwork" },
  { id: "house-athletics", title: "House Athletics Meet", category: "Sports", date: "2026-11-05T08:30:00+05:30", time: "8:30 AM – 1:00 PM", venue: "College Grounds", status: "Upcoming", description: "A morning of track events and team challenges. Every house member can take part, support a friend, or cheer from the sidelines.", image: assetPaths.event, imageAlt: "Illustrated ADAB event artwork" },
  { id: "open-mic", title: "Voices of ADAB", category: "Arts", date: "2026-10-12T13:30:00+05:30", time: "1:30 PM – 3:30 PM", venue: "Seminar Hall", status: "Completed", description: "An open stage for poetry, short talks, stories, and original performances by students.", image: assetPaths.event, imageAlt: "Illustrated ADAB event artwork" },
  { id: "welcome-day", title: "A New Chapter", category: "Community", date: "2026-09-20T09:00:00+05:30", time: "9:00 AM – 12:00 PM", venue: "College Auditorium", status: "Completed", description: "A warm welcome to the Plus One class, with introductions, team activities, and a first look at union life.", image: assetPaths.event, imageAlt: "Illustrated ADAB event artwork" }
];

export const creativeWorks = [
  {
    id: "small-acts",
    title: "The Quiet Power of Small Acts",
    type: "Article",
    kind: "article",
    author: "Amina Zoya",
    date: "October 2026",
    icon: "✎",
    image: assetPaths.article,
    imageAlt: "Illustrated open notebook and a red pencil",
    excerpt: "A reflection on how small acts of kindness make a class feel more like a community.",
    content: "A kind word before a difficult lesson. A seat saved for someone who is late. A classmate who shares their notes without being asked. These small moments rarely make a headline, but they shape the way a place feels. Community is not only built during big events; it is practised in the ordinary minutes we share."
  },
  {
    id: "morning-rain",
    title: "After the Morning Rain",
    type: "Poetry",
    kind: "poetry",
    author: "Safa Mariyam",
    date: "September 2026",
    icon: "❝",
    image: assetPaths.poetry,
    imageAlt: "Illustrated rainy morning with a soft crimson sunrise",
    excerpt: "A short poem about the hush that follows a rain-washed morning.",
    content: "The courtyard holds a softer sky,\nThe leaves keep little drops of light.\nWe find our voices, one by one,\nAnd carry them into the day."
  },
  {
    id: "lettering",
    title: "Letters in Bloom: Kufic Study",
    type: "Calligraphy",
    kind: "calligraphy",
    author: "Hiba Nasrin",
    date: "September 2026",
    icon: "۞",
    image: assetPaths.calligraphy,
    imageAlt: "Original abstract calligraphy-inspired floral line art",
    excerpt: "A student calligraphy study exploring balance, patience, and geometrical rhythm.",
    content: "This lettering study began as a small practice in patience: one line, one curve, one careful pause at a time. The finished piece celebrates the beauty of learning slowly and giving every detail room to breathe."
  },
  {
    id: "quiz-app-project",
    title: "Class Quiz Engine & Timer",
    type: "Code",
    kind: "code",
    author: "Yahya Niyas",
    date: "October 2026",
    icon: "💻",
    image: assetPaths.event,
    imageAlt: "Code engine preview",
    excerpt: "A responsive client-side quiz application built with vanilla JavaScript for inter-house academic battles.",
    codeSnippet: `// Inter-House Quiz Engine Timer
export function startTimer(seconds, onTick, onComplete) {
  let remaining = seconds;
  const interval = setInterval(() => {
    remaining--;
    onTick(remaining);
    if (remaining <= 0) {
      clearInterval(interval);
      onComplete();
    }
  }, 1000);
  return () => clearInterval(interval);
}`,
    content: "Developed to automate timing and scoring during our weekly Academic Wing trivia challenges. Supports custom house scoring, live countdowns, and sound indicators."
  },
  {
    id: "solar-tracker-project",
    title: "Dual-Axis Solar Tracker Model",
    type: "Project",
    kind: "project",
    author: "Yahya Niyas & Liyana Noor",
    date: "October 2026",
    icon: "⚙",
    image: assetPaths.event,
    imageAlt: "Solar tracker engineering model",
    excerpt: "Working prototype using Arduino and light-dependent resistors to maximize photovoltaic efficiency.",
    projectUrl: "https://github.com/adab-class/solar-tracker",
    content: "A Plus One physics and robotics project demonstrating how solar cells can align dynamically with sunlight throughout the day to boost electricity generation by up to 35%."
  },
  {
    id: "digital-illustration",
    title: "Red & White: Campus Horizons",
    type: "Art",
    kind: "art",
    author: "Hiba Nasrin",
    date: "September 2026",
    icon: "🎨",
    image: assetPaths.calligraphy,
    imageAlt: "Digital painting of campus horizons",
    excerpt: "A digital landscape painting depicting our Plus One campus under the crimson evening sun.",
    content: "Rendered using digital brushes with a primary Red and White palette, highlighting the architectural arches of our campus against Kerala's evening sky."
  },
  {
    id: "first-edition",
    title: "The ADAB Journal — Issue 01",
    type: "Magazine",
    kind: "magazine",
    author: "Editorial Team",
    date: "August 2026",
    icon: "▤",
    image: assetPaths.magazine,
    imageAlt: "Illustrated cover of the first ADAB class magazine",
    excerpt: "The first collection of student writing, artwork, interviews, and class memories.",
    content: "Issue 01 brings together student poems, short reflections, creative work, and moments from the beginning of our Plus One year. It is a snapshot of a class finding its voice and making room for many different perspectives."
  }
];

export const initialFinanceEntries = [
  {
    id: "fin-01",
    entry_type: "income",
    amount: "25000.00",
    category: "Student Union Dues",
    description: "Term 1 Class Union Membership contribution collected from 25 students (₹1,000 each).",
    occurred_on: "2026-09-15",
    attachment_name: "bank-deposit-receipt-sep15.pdf",
    recorded_by: "Shamil Basheer (Treasurer)"
  },
  {
    id: "fin-02",
    entry_type: "income",
    amount: "15000.00",
    category: "Alumni Sponsorship",
    description: "Sponsorship grant received from Senior Batch Alumni for Union Fest 2026 equipment.",
    occurred_on: "2026-09-28",
    attachment_name: "alumni-sponsorship-voucher.pdf",
    recorded_by: "Shamil Basheer (Treasurer)"
  },
  {
    id: "fin-03",
    entry_type: "expense",
    amount: "4800.00",
    category: "Sports Equipment & Meets",
    description: "Purchase of 2 match-grade footballs, 1 cricket set, and whistle set for inter-house meet.",
    occurred_on: "2026-10-04",
    attachment_name: "sports-emporium-bill-4800.pdf",
    recorded_by: "Shamil Basheer (Treasurer)"
  },
  {
    id: "fin-04",
    entry_type: "expense",
    amount: "3250.00",
    category: "Refreshments & Hospitality",
    description: "Tea, snacks, and mineral water for the Welcome Day general student assembly.",
    occurred_on: "2026-10-12",
    attachment_name: "campus-canteen-invoice-3250.pdf",
    recorded_by: "Shamil Basheer (Treasurer)"
  },
  {
    id: "fin-05",
    entry_type: "expense",
    amount: "6500.00",
    category: "Literary & Class Magazine",
    description: "Advance deposit paid to Calicut Offset Printers for ADAB Journal Issue 01 print run.",
    occurred_on: "2026-10-20",
    attachment_name: "calicut-printers-advance-receipt.pdf",
    recorded_by: "Shamil Basheer (Treasurer)"
  },
  {
    id: "fin-06",
    entry_type: "income",
    amount: "8000.00",
    category: "PTA Special Contribution",
    description: "Parent-Teacher Association grant for student welfare and tech club workshop kits.",
    occurred_on: "2026-10-25",
    attachment_name: "pta-fund-transfer-receipt.pdf",
    recorded_by: "Shamil Basheer (Treasurer)"
  }
];

export const initialBudgetAllocations = [
  { category: "Events & Festivities", allocated: 25000, spent: 0, description: "Stage setup, audio, lighting, and guest honorariums" },
  { category: "Sports Equipment & Meets", allocated: 15000, spent: 4800, description: "Football, cricket, athletics gear, field marking" },
  { category: "Arts & Creative Showcase", allocated: 10000, spent: 0, description: "Art supplies, calligraphy materials, exhibition boards" },
  { category: "Literary & Class Magazine", allocated: 12000, spent: 6500, description: "Printing of ADAB Journal Issue 01, debate trophies" },
  { category: "Tech & Digital Infrastructure", allocated: 8000, spent: 0, description: "Web hosting, workshop kits, domain registration" },
  { category: "Refreshments & Hospitality", allocated: 10000, spent: 3250, description: "Snacks and beverages for union meetings and assemblies" }
];

export const unionFundFixedAmount = 100;
export const unionFundStudents = 15;

// --- Teacher & Developer Financial Portal Data ---

export const teacherAnnualDonationBase = 500; // ₹500/month per student at year start

export const teacherDonations = [
  // Each entry tracks a student's annual donation progress
  // { studentId, studentName, roll, monthlyBase, totalPaidYTD, payments: [...] }
];

export const studentDebts = [
  // Each entry: { id, studentId, studentName, roll, description, totalAmount, amountPaid, dueDate, status, createdAt }
];

export const formatEventDate = date => new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));

// --- Profile & Achievements Persistence ---

// Load student profiles from LocalStorage, merging with seed data
export function loadStudentProfiles() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      // Initialize with seed data profiles (empty avatars, no achievements)
      const initial = {};
      students.forEach(s => {
        initial[s.id] = { avatarBase64: "", bio: s.bio || "", tagline: "", achievements: [] };
      });
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    // Ensure all students have profile entries
    students.forEach(s => {
      if (!parsed[s.id]) {
        parsed[s.id] = { avatarBase64: "", bio: s.bio || "", tagline: "", achievements: [] };
      }
    });
    return parsed;
  } catch (e) {
    console.warn("Failed to load student profiles:", e);
    return loadStudentProfiles(); // recursive retry
  }
}

// Save student profiles to LocalStorage
export function saveStudentProfiles(profiles) {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
    return true;
  } catch (e) {
    console.warn("Failed to save student profiles:", e);
    return false;
  }
}

// Load achievement records from LocalStorage
export function loadAchievementRecords() {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(achievementRecords));
      return achievementRecords;
    }
    const parsed = JSON.parse(raw);
    // Ensure achievement IDs are unique
    return parsed;
  } catch (e) {
    console.warn("Failed to load achievement records:", e);
    return loadAchievementRecords();
  }
}

// Save achievement records to LocalStorage
export function saveAchievementRecords(records) {
  try {
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (e) {
    console.warn("Failed to save achievement records:", e);
    return false;
  }
}

// Add a new achievement for a student
export function addStudentAchievement(studentId, achievement) {
  const records = loadAchievementRecords();
  const student = students.find(s => s.id === studentId);
  if (!student) return false;

  const newAchievement = {
    id: `ach-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    studentId,
    studentRoll: student.roll,
    studentName: student.name,
    title: achievement.title,
    category: achievement.category,
    awardLevel: achievement.awardLevel,
    date: achievement.date,
    description: achievement.description,
    imageUrl: achievement.imageUrl || "",
    createdAt: new Date().toISOString()
  };

  records.push(newAchievement);
  saveAchievementRecords(records);

  // Also update the student's profile achievements array
  const profiles = loadStudentProfiles();
  if (!profiles[studentId]) profiles[studentId] = { avatarBase64: "", bio: "", tagline: "", achievements: [] };
  // Remove any existing achievement with same ID to prevent duplicates
  profiles[studentId].achievements = profiles[studentId].achievements.filter(a => a.id !== newAchievement.id);
  profiles[studentId].achievements.push(newAchievement);
  saveStudentProfiles(profiles);

  return newAchievement;
}

// Update a student's profile (avatar, bio, tagline)
export function updateStudentProfile(studentId, profileData) {
  const profiles = loadStudentProfiles();
  if (!profiles[studentId]) profiles[studentId] = { avatarBase64: "", bio: "", tagline: "", achievements: [] };

  // Merge existing with new data
  profiles[studentId] = {
    ...profiles[studentId],
    avatarBase64: profileData.avatarBase64 || profiles[studentId].avatarBase64,
    bio: profileData.bio || profiles[studentId].bio,
    tagline: profileData.tagline || profiles[studentId].tagline,
    achievements: profiles[studentId].achievements // keep existing achievements
  };

  saveStudentProfiles(profiles);
  return profiles[studentId];
}

// Get a student's profile
export function getStudentProfile(studentId) {
  const profiles = loadStudentProfiles();
  return profiles[studentId] || { avatarBase64: "", bio: "", tagline: "", achievements: [] };
}

// Get student's achievement count and badge info
export function getStudentAchievementSummary(studentId) {
  const profiles = loadStudentProfiles();
  const achievements = profiles[studentId]?.achievements || [];
  const count = achievements.length;

  // Count by award level
  const byLevel = { Campus: 0, District: 0, State: 0, College: 0 };
  achievements.forEach(a => {
    if (byLevel[a.awardLevel]) byLevel[a.awardLevel]++;
  });

  // Category counts
  const byCategory = { Academic: 0, Cultural: 0, Sports: 0, "SAMIA Outreach": 0 };
  achievements.forEach(a => {
    if (byCategory[a.category]) byCategory[a.category]++;
  });

  return { count, byLevel, byCategory };
}
