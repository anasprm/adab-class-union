import { initialBudgetAllocations, initialFinanceEntries, studentSeedData, wings } from "./data.js";

export const DEFAULT_DEMO_PASSWORD = "ayra@123";

export const PRESEEDED_ACCOUNTS = [
  // 1 Developer
  {
    id: "demo-dev-01",
    email: "anasprm390@gmail.com",
    display_name: "Anas PRM (Developer)",
    role: "developer",
    wing_id: null,
    roll_number: "DEV-01",
    district: "Kozhikode",
    bio: "System administrator and platform developer maintaining the ADAB Class Union portal.",
    is_active: true
  },
  // 1 Class Teacher
  {
    id: "demo-tch-01",
    email: "teacher@adab.edu",
    display_name: "Prof. K. Narayanan",
    role: "teacher",
    wing_id: null,
    roll_number: "TCH-01",
    district: "Malappuram",
    bio: "Class Advisor and Senior Secondary mentor overseeing student welfare and class union initiatives.",
    is_active: true
  },
  // 1 Core Committee
  {
    id: "demo-sec-01",
    email: "committee@adab.edu",
    display_name: "Abdul Hadi (General Secretary)",
    role: "committee",
    wing_id: null,
    roll_number: "AD-03",
    house_team: "White Warriors",
    district: "Kannur",
    bio: "Core Committee Secretary coordinating union events, student assemblies, and council updates.",
    is_active: true
  },
  // 1 Treasurer
  {
    id: "demo-trs-01",
    email: "treasurer@adab.edu",
    display_name: "Shamil Basheer (Treasurer)",
    role: "treasurer",
    wing_id: null,
    roll_number: "AD-05",
    house_team: "Crimson Falcons",
    district: "Malappuram",
    bio: "Class Union Treasurer maintaining transparent ledger entries, expense receipts, and budget allocations.",
    is_active: true
  },
  // 15 Students
  ...studentSeedData.map((student, idx) => ({
    id: `demo-std-${String(idx + 1).padStart(2, "0")}`,
    email: student.email,
    display_name: student.name,
    role: "student",
    wing_id: null,
    roll_number: student.roll,
    house_team: student.house,
    district: student.district,
    bio: student.bio,
    avatar_url: null,
    social_links: { github: `https://github.com/${student.roll.toLowerCase()}`, portfolio: "" },
    contact_preferences: { show_email: true },
    is_active: true
  })),
  // 7 Wings
  {
    id: "demo-wing-arts",
    email: "wing.arts@adab.edu",
    display_name: "Arts & Cultural Wing Desk",
    role: "wing",
    wing_id: "arts",
    district: "Kozhikode",
    bio: "Official account for managing Arts & Cultural events, visual art showcases, and creative workshops.",
    is_active: true
  },
  {
    id: "demo-wing-sports",
    email: "wing.sports@adab.edu",
    display_name: "Sports & Athletics Club Desk",
    role: "wing",
    wing_id: "sports",
    district: "Palakkad",
    bio: "Official account for organizing tournaments, fitness challenges, and inter-house matches.",
    is_active: true
  },
  {
    id: "demo-wing-literary",
    email: "wing.literary@adab.edu",
    display_name: "Literary & Debating Society Desk",
    role: "wing",
    wing_id: "literary",
    district: "Wayanad",
    bio: "Official account for publishing literary notices, debating schedules, and magazine editorial updates.",
    is_active: true
  },
  {
    id: "demo-wing-tech",
    email: "wing.tech@adab.edu",
    display_name: "Tech & Coding Club Desk",
    role: "wing",
    wing_id: "tech",
    district: "Malappuram",
    bio: "Official account for coordinating coding bootcamps, hackathons, and software showcases.",
    is_active: true
  },
  {
    id: "demo-wing-social",
    email: "wing.social@adab.edu",
    display_name: "Social & Welfare Wing Desk",
    role: "wing",
    wing_id: "social",
    district: "Kozhikode",
    bio: "Official account managing mutual assistance, student mentoring, and community outreach drives.",
    is_active: true
  },
  {
    id: "demo-wing-media",
    email: "wing.media@adab.edu",
    display_name: "Media & IT Wing Desk",
    role: "wing",
    wing_id: "media",
    district: "Kannur",
    bio: "Official account for documenting union moments, poster releases, and digital communications.",
    is_active: true
  },
  {
    id: "demo-wing-ethics",
    email: "wing.ethics@adab.edu",
    display_name: "Ethics & Values Wing Desk",
    role: "wing",
    wing_id: "ethics",
    district: "Malappuram",
    bio: "Official account for ethical discourses, moral guidance circles, and leadership seminars.",
    is_active: true
  }
];

const STORAGE_KEYS = {
  CURRENT_USER: "adab_demo_current_user",
  ACCOUNTS: "adab_demo_accounts",
  FINANCE: "adab_demo_finance",
  BUDGETS: "adab_demo_budgets",
  INVITES: "adab_demo_invites",
  WORKS: "adab_demo_works"
};

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Storage write failed:", e);
  }
}

export function getDemoAccounts() {
  return readStorage(STORAGE_KEYS.ACCOUNTS, PRESEEDED_ACCOUNTS);
}

export function saveDemoAccounts(accounts) {
  writeStorage(STORAGE_KEYS.ACCOUNTS, accounts);
}

export function getDemoCurrentUser() {
  return readStorage(STORAGE_KEYS.CURRENT_USER, null);
}

export function setDemoCurrentUser(user) {
  writeStorage(STORAGE_KEYS.CURRENT_USER, user);
}

export function clearDemoCurrentUser() {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  } catch {
    // ignore
  }
}

export function getDemoFinanceEntries() {
  return readStorage(STORAGE_KEYS.FINANCE, initialFinanceEntries);
}

export function saveDemoFinanceEntries(entries) {
  writeStorage(STORAGE_KEYS.FINANCE, entries);
}

export function getDemoBudgets() {
  return readStorage(STORAGE_KEYS.BUDGETS, initialBudgetAllocations);
}

export function saveDemoBudgets(budgets) {
  writeStorage(STORAGE_KEYS.BUDGETS, budgets);
}

export function getDemoInvites() {
  return readStorage(STORAGE_KEYS.INVITES, [
    {
      id: "inv-pre-01",
      email: "new.student@adab.edu",
      display_name: "New Student Invitee",
      role: "student",
      wing_id: null,
      token: "inv_9b8f2c3e1a0d4e5f6a7b8c9d",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      expires_at: new Date(Date.now() + 6 * 86400000).toISOString(),
      status: "pending"
    }
  ]);
}

export function saveDemoInvites(invites) {
  writeStorage(STORAGE_KEYS.INVITES, invites);
}

export function authenticateDemoUser(email, password = "") {
  const accounts = getDemoAccounts();
  const lower = email.trim().toLowerCase();
  const match = accounts.find(a => a.email.toLowerCase() === lower);
  if (!match) return { user: null, profile: null, error: "No account found with this email." };
  if (!match.is_active) return { user: null, profile: null, error: "This account has been suspended by the administrator." };
  
  const user = {
    id: match.id,
    email: match.email,
    user_metadata: { display_name: match.display_name }
  };
  setDemoCurrentUser({ user, profile: match });
  return { user, profile: match, error: null };
}

export function switchDemoRole(roleKey, wingId = null) {
  const accounts = getDemoAccounts();
  let match = null;
  if (roleKey === "wing") {
    match = accounts.find(a => a.role === "wing" && (!wingId || a.wing_id === wingId));
    if (!match) match = accounts.find(a => a.role === "wing");
  } else {
    match = accounts.find(a => a.role === roleKey);
  }

  if (match) {
    const user = { id: match.id, email: match.email, user_metadata: { display_name: match.display_name } };
    setDemoCurrentUser({ user, profile: match });
    return { user, profile: match };
  }
  return null;
}
