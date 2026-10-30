import { assetPaths } from "./assets.js";

export const coreMembers = [
  { role: "Chairman", name: "Muhammed Riyas", roll: "AD-01", initials: "MR", bio: "Brings the class together with a steady voice, a welcoming spirit, and a belief that every student can contribute.", district: "Malappuram", handle: "@riyas.adab" },
  { role: "Vice Chairman", name: "Fathima Shirin", roll: "AD-02", initials: "FS", bio: "Supports the union's day-to-day work and helps turn student ideas into inclusive programmes.", district: "Kozhikode", handle: "@shirin.adab" },
  { role: "General Secretary", name: "Abdul Hadi", roll: "AD-03", initials: "AH", bio: "Coordinates meetings, records decisions, and keeps communication moving across the class.", district: "Kannur", handle: "@hadi.adab" },
  { role: "Joint Secretary", name: "Nida Fathima", roll: "AD-04", initials: "NF", bio: "Works with the secretary to make sure plans are clear, organised, and open to everyone.", district: "Wayanad", handle: "@nida.adab" },
  { role: "Treasurer", name: "Shamil Basheer", roll: "AD-05", initials: "SB", bio: "Keeps union resources carefully accounted for and helps each activity make the most of its budget.", district: "Malappuram", handle: "@shamil.adab" },
  { role: "Arts Convenor", name: "Hiba Nasrin", roll: "AD-06", initials: "HN", bio: "Creates space for performance, writing, visual art, and the many ways students express themselves.", district: "Kozhikode", handle: "@hiba.adab" },
  { role: "Sports Secretary", name: "Muneeb Rahman", roll: "AD-07", initials: "MR", bio: "Encourages participation, teamwork, and healthy competition across every house team.", district: "Palakkad", handle: "@muneeb.adab" },
  { role: "Magazine Editor", name: "Amina Zoya", roll: "AD-08", initials: "AZ", bio: "Collects student voices and shapes them into a magazine that reflects the character of the class.", district: "Kasaragod", handle: "@amina.adab" }
];

export const wings = [
  {
    id: "arts",
    name: "Arts & Cultural Wing",
    icon: "🎨",
    accent: "Creativity",
    objective: "Celebrate visual arts, calligraphy, theatrical performances, and creative exhibitions across the class community.",
    activities: [
      "Visual art & calligraphy workshops",
      "Creative exhibitions & gallery walks",
      "Inter-house stage & artistic showcase"
    ]
  },
  {
    id: "sports",
    name: "Sports & Athletics Club",
    icon: "⚽",
    accent: "Teamwork",
    objective: "Encourage fitness, teamwork, and healthy competition across every house team with inclusive sporting events.",
    activities: [
      "Inter-house football & cricket leagues",
      "Annual athletics meet & sprint cups",
      "Morning fitness & wellness sessions"
    ]
  },
  {
    id: "literary",
    name: "Literary & Debating Society",
    icon: "📖",
    accent: "Expression",
    objective: "Cultivate thoughtful reading, articulate debate, creative writing, and publish the class journal.",
    activities: [
      "Weekly book & reading circles",
      "Parliamentary debating contests",
      "Class magazine editorial desk"
    ]
  },
  {
    id: "tech",
    name: "Tech & Coding Club",
    icon: "💻",
    accent: "Innovation",
    objective: "Build digital literacy, develop software projects, and explore coding, AI, and modern web technologies.",
    activities: [
      "Web development bootcamps",
      "Open-source project showcases",
      "Algorithmic puzzle contests"
    ]
  },
  {
    id: "social",
    name: "Social & Welfare Wing",
    icon: "🤝",
    accent: "Community",
    objective: "Drive student solidarity, mutual peer tutoring, charity drives, and community outreach programs.",
    activities: [
      "Peer-to-peer study circles",
      "Community outreach & charity drives",
      "Student wellbeing & mentoring"
    ]
  },
  {
    id: "media",
    name: "Media & IT Wing",
    icon: "📷",
    accent: "Communication",
    objective: "Document union milestones, manage high-quality photography, and craft official announcements.",
    activities: [
      "Milestone photography & videography",
      "Poster & visual graphic design",
      "Union digital archive management"
    ]
  },
  {
    id: "ethics",
    name: "Ethics & Moral Values Wing",
    icon: "⚖",
    accent: "Integrity",
    objective: "Promote ethical living, character development, reflective dialogue, and responsible leadership.",
    activities: [
      "Character building seminars",
      "Ethics & leadership discussion circles",
      "Values & integrity dialogues"
    ]
  },
  {
    id: "pkv",
    name: "PKV",
    icon: "🎯",
    accent: "PKV",
    objective: "A dedicated wing for PKV programmes, peer collaboration, and class-wide participation.",
    activities: [
      "Weekly PKV sessions",
      "Inter-house PKV competitions",
      "Student-led PKV projects"
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
  initials: student.name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()
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

export const formatEventDate = date => new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
