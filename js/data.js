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
  { name: "Academic & Dars Wing", icon: "✦", accent: "Learning", objective: "Build strong study habits and make peer learning a shared part of class life.", activities: ["Peer-led revision circles", "Reading and study challenges", "Learning-resource exchange"] },
  { name: "Cultural & Literary Wing", icon: "✍", accent: "Expression", objective: "Celebrate language, culture, and thoughtful expression through creative programmes.", activities: ["Poetry and short-story sessions", "Stage and speaking events", "Literary wall and class magazine"] },
  { name: "Sports & Athletics Club", icon: "⚑", accent: "Teamwork", objective: "Make sport welcoming and energising, with opportunities for every level of experience.", activities: ["Inter-house matches", "Fitness and athletics days", "Friendly team challenges"] },
  { name: "Media & IT Wing", icon: "◉", accent: "Communication", objective: "Document class life and share union information with care and creativity.", activities: ["Event photography and reports", "Digital design workshops", "Union announcements and archive"] }
];

const districts = ["Malappuram", "Kozhikode", "Wayanad", "Kannur", "Palakkad", "Kasaragod", "Thrissur"];
const houses = ["Red Knights", "White Warriors", "Crimson Falcons"];
const studentNames = [
  "Muhammed Riyas", "Fathima Shirin", "Abdul Hadi", "Nida Fathima", "Shamil Basheer",
  "Hiba Nasrin", "Muneeb Rahman", "Amina Zoya", "Safa Mariyam", "Yahya Niyas",
  "Rizwana K", "Aslam P", "Ramees Thaha", "Liyana Noor", "Ashraf Najeeb",
  "Jumana Salim", "Faris Ameen", "Aysha Lubna", "Suhail Kabeer", "Mishal Haneef",
  "Rifa Fathima", "Nihal Shukoor", "Zainab Muneera", "Rashid K"
];
const skills = ["Public speaking", "Calligraphy", "Writing", "Football", "Design", "Quiz", "Photography", "Recitation"];

export const students = studentNames.map((name, index) => ({
  name,
  roll: `AD-${String(index + 1).padStart(2, "0")}`,
  house: houses[index % houses.length],
  district: districts[index % districts.length],
  skills: [skills[index % skills.length], skills[(index + 3) % skills.length]],
  initials: name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()
}));

export const events = [
  { id: "union-fest", title: "ADAB Union Fest", category: "Flagship", date: "2026-12-12T09:00:00+05:30", time: "9:00 AM – 4:00 PM", venue: "Main Campus", status: "Upcoming", description: "A day of house events, student performances, friendly competition, and shared celebration. Bring your ideas, your team spirit, and a friend.", image: "assets/event-preview.svg", imageAlt: "Illustrated ADAB Union Fest poster with red geometric motifs" },
  { id: "reading-circle", title: "Pages & Perspectives", category: "Academic", date: "2026-11-18T10:00:00+05:30", time: "10:00 AM – 11:30 AM", venue: "Reading Room", status: "Upcoming", description: "An easy-going reading circle for sharing a passage, a question, or a book you think others should discover.", image: "assets/event-preview.svg", imageAlt: "Illustrated ADAB event artwork" },
  { id: "house-athletics", title: "House Athletics Meet", category: "Sports", date: "2026-11-05T08:30:00+05:30", time: "8:30 AM – 1:00 PM", venue: "College Grounds", status: "Upcoming", description: "A morning of track events and team challenges. Every house member can take part, support a friend, or cheer from the sidelines.", image: "assets/event-preview.svg", imageAlt: "Illustrated ADAB event artwork" },
  { id: "open-mic", title: "Voices of ADAB", category: "Cultural", date: "2026-10-12T13:30:00+05:30", time: "1:30 PM – 3:30 PM", venue: "Seminar Hall", status: "Completed", description: "An open stage for poetry, short talks, stories, and original performances by students.", image: "assets/event-preview.svg", imageAlt: "Illustrated ADAB event artwork" },
  { id: "welcome-day", title: "A New Chapter", category: "Community", date: "2026-09-20T09:00:00+05:30", time: "9:00 AM – 12:00 PM", venue: "College Auditorium", status: "Completed", description: "A warm welcome to the Plus One class, with introductions, team activities, and a first look at union life.", image: "assets/event-preview.svg", imageAlt: "Illustrated ADAB event artwork" },
  { id: "design-workshop", title: "Make It Clear: Design Basics", category: "Media", date: "2026-08-28T14:00:00+05:30", time: "2:00 PM – 3:30 PM", venue: "Computer Lab", status: "Completed", description: "A practical introduction to making readable posters, thoughtful layouts, and useful digital notices.", image: "assets/event-preview.svg", imageAlt: "Illustrated ADAB event artwork" },
  { id: "quiz-day", title: "Curiosity Quiz", category: "Academic", date: "2026-08-08T10:00:00+05:30", time: "10:00 AM – 12:00 PM", venue: "Class Hall", status: "Completed", description: "A light-hearted team quiz built around curiosity, collaboration, and a few surprising questions.", image: "assets/event-preview.svg", imageAlt: "Illustrated ADAB event artwork" }
];

export const creativeWorks = [
  { id: "small-acts", title: "The Quiet Power of Small Acts", type: "Article", kind: "article", author: "Amina Zoya", date: "October 2026", icon: "✎", image: "assets/article-preview.svg", imageAlt: "Illustrated open notebook and a red pencil", excerpt: "A reflection on how small acts of kindness make a class feel more like a community.", content: "A kind word before a difficult lesson. A seat saved for someone who is late. A classmate who shares their notes without being asked. These small moments rarely make a headline, but they shape the way a place feels. Community is not only built during big events; it is practised in the ordinary minutes we share." },
  { id: "morning-rain", title: "After the Morning Rain", type: "Poetry", kind: "poetry", author: "Safa Mariyam", date: "September 2026", icon: "❝", image: "assets/poetry-preview.svg", imageAlt: "Illustrated rainy morning with a soft crimson sunrise", excerpt: "A short poem about the hush that follows a rain-washed morning.", content: "The courtyard holds a softer sky,\nThe leaves keep little drops of light.\nWe find our voices, one by one,\nAnd carry them into the day." },
  { id: "lettering", title: "Letters in Bloom", type: "Calligraphy", kind: "calligraphy", author: "Hiba Nasrin", date: "September 2026", icon: "۞", image: "assets/calligraphy-preview.svg", imageAlt: "Original abstract calligraphy-inspired floral line art", excerpt: "A student calligraphy study exploring balance, patience, and flowing forms.", content: "This lettering study began as a small practice in patience: one line, one curve, one careful pause at a time. The finished piece celebrates the beauty of learning slowly and giving every detail room to breathe." },
  { id: "first-edition", title: "The ADAB Journal — Issue 01", type: "Magazine", kind: "magazine", author: "Editorial Team", date: "August 2026", icon: "▤", image: "assets/magazine-preview.svg", imageAlt: "Illustrated cover of the first ADAB class magazine", excerpt: "The first collection of student writing, artwork, interviews, and class memories.", content: "Issue 01 brings together student poems, short reflections, creative work, and moments from the beginning of our Plus One year. It is a snapshot of a class finding its voice and making room for many different perspectives." },
  { id: "learning-together", title: "Learning Together", type: "Article", kind: "article", author: "Abdul Hadi", date: "August 2026", icon: "✎", image: "assets/article-preview.svg", imageAlt: "Illustrated open notebook and a red pencil", excerpt: "Why asking questions and sharing what we know makes everyone stronger.", content: "Learning is often pictured as a quiet, individual activity, but some of our best discoveries happen together. A question from one person can open a new path for the whole group. When we share what we understand and stay curious about what we do not, everyone has more room to grow." }
];

export const formatEventDate = date => new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
