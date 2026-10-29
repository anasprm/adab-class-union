import { isSupabaseConfigured, supabase } from "./supabase.js";

export const DEFAULT_CONTENT = {
  // Global Banner
  hero_banner_text: "ADAB Senior Secondary Class Union · Academic Session 2026",
  hero_banner_active: "true",

  // Hero Section
  hero_eyebrow: "Plus One · Kerala, India",
  hero_title: "A class with a voice.\nA union with a purpose.",
  hero_lead: "Welcome to the digital home of ADAB Class Union — where we learn together, make things together, and build an inclusive community that empowers every student.",
  hero_cta_primary: "Explore what’s on →",
  hero_cta_secondary: "Meet the union",

  // About Section
  about_eyebrow: "Who we are",
  about_title: "A union shaped by its students.",
  about_lead: "ADAB Class Union brings our Plus One class together around academic excellence, artistic expression, digital innovation, and shared solidarity.",
  about_heading: "More than a calendar of events",
  about_body_1: "Our union is a student-led space to share ideas, learn from one another, and make class life richer for everyone. Whether you love the stage, the sports ground, a good book, coding, or working behind the scenes, there is a place to contribute.",
  about_body_2: "We believe a strong class is built through curiosity, respect, and the confidence to try something new. The ADAB portal is where we keep those shared moments and opportunities close at hand.",
  about_promise_title: "Our promise",
  about_promise_text: "Make room for every voice. Learn with humility. Celebrate effort as much as achievement. Leave the class community better than we found it.",

  // Events Section
  events_eyebrow: "Save the date",
  events_title: "Time well spent, together.",
  events_lead: "See upcoming union gatherings, house competitions, and look back at milestones our class has already shared.",

  // Wings Section
  wings_eyebrow: "Find your way in",
  wings_title: "7 Dedicated Wings. Many ways to belong.",
  wings_lead: "Our student wings turn shared passions into practical, welcoming activities. Pick a domain and lead with your perspective.",

  // Works Section
  works_eyebrow: "Created in our class",
  works_title: "Ideas deserve a little space.",
  works_lead: "Explore student writing, digital art, coding projects, and creative expressions published by our community.",

  // Finance Section
  finance_eyebrow: "Confidential · Verified Members Only",
  finance_title: "Union Finances & Treasury.",
  finance_lead: "A fully transparent view of class union income, operational spending, budget allocations, and verified invoices.",

  // Footer Section
  footer_tagline: "A home for ideas, friendships, and the next generation of thoughtful leaders.",
  footer_location_title: "Our campus",
  footer_location_text: "Kerala, India\nRooted in learning. Growing together.",
  footer_copyright: "ADAB Senior Secondary Class Union. Crafted with care by the student community."
};

export const CONTENT_SCHEMA = [
  { key: "hero_banner_text", section: "Hero", label: "Announcement Banner Text", type: "text" },
  { key: "hero_banner_active", section: "Hero", label: "Show Announcement Banner (true/false)", type: "select", options: ["true", "false"] },
  { key: "hero_eyebrow", section: "Hero", label: "Hero Eyebrow Label", type: "text" },
  { key: "hero_title", section: "Hero", label: "Hero Main Headline", type: "textarea" },
  { key: "hero_lead", section: "Hero", label: "Hero Introduction Lead", type: "textarea" },
  { key: "hero_cta_primary", section: "Hero", label: "Primary Button Text", type: "text" },
  { key: "hero_cta_secondary", section: "Hero", label: "Secondary Button Text", type: "text" },

  { key: "about_eyebrow", section: "About", label: "About Eyebrow", type: "text" },
  { key: "about_title", section: "About", label: "About Main Title", type: "text" },
  { key: "about_lead", section: "About", label: "About Lead Paragraph", type: "textarea" },
  { key: "about_heading", section: "About", label: "About Section Heading", type: "text" },
  { key: "about_body_1", section: "About", label: "Body Paragraph 1", type: "textarea" },
  { key: "about_body_2", section: "About", label: "Body Paragraph 2", type: "textarea" },
  { key: "about_promise_title", section: "About", label: "Promise Box Title", type: "text" },
  { key: "about_promise_text", section: "About", label: "Promise Box Content", type: "textarea" },

  { key: "events_eyebrow", section: "Events", label: "Events Eyebrow", type: "text" },
  { key: "events_title", section: "Events", label: "Events Page Title", type: "text" },
  { key: "events_lead", section: "Events", label: "Events Lead Description", type: "textarea" },

  { key: "wings_eyebrow", section: "Wings", label: "Wings Eyebrow", type: "text" },
  { key: "wings_title", section: "Wings", label: "Wings Page Title", type: "text" },
  { key: "wings_lead", section: "Wings", label: "Wings Lead Description", type: "textarea" },

  { key: "works_eyebrow", section: "Works", label: "Works Eyebrow", type: "text" },
  { key: "works_title", section: "Works", label: "Works Page Title", type: "text" },
  { key: "works_lead", section: "Works", label: "Works Lead Description", type: "textarea" },

  { key: "finance_eyebrow", section: "Finance", label: "Finance Eyebrow", type: "text" },
  { key: "finance_title", section: "Finance", label: "Finance Page Title", type: "text" },
  { key: "finance_lead", section: "Finance", label: "Finance Lead Description", type: "textarea" },

  { key: "footer_tagline", section: "Footer", label: "Brand Tagline", type: "textarea" },
  { key: "footer_location_title", section: "Footer", label: "Campus Location Title", type: "text" },
  { key: "footer_location_text", section: "Footer", label: "Campus Location Details", type: "textarea" },
  { key: "footer_copyright", section: "Footer", label: "Copyright Statement", type: "text" }
];

const LOCAL_STORAGE_KEY = "adab_portal_dynamic_content";

function getStoredContent() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

let activeContent = { ...DEFAULT_CONTENT, ...getStoredContent() };

export function getContent(key, fallback = null) {
  if (Object.hasOwn(activeContent, key)) {
    return activeContent[key];
  }
  if (fallback !== null) return fallback;
  return DEFAULT_CONTENT[key] ?? "";
}

export function getAllContent() {
  return { ...DEFAULT_CONTENT, ...activeContent };
}

export function setContentInMemory(key, value) {
  activeContent[key] = value;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activeContent));
  } catch (e) {
    console.warn("Could not save to localStorage:", e);
  }
}

export async function loadPortalContent() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("portal_content").select("key, value");
      if (!error && Array.isArray(data) && data.length > 0) {
        data.forEach(item => {
          if (item.key && typeof item.value === "string") {
            activeContent[item.key] = item.value;
          }
        });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activeContent));
      }
    } catch (e) {
      console.warn("Could not load dynamic portal content from Supabase:", e);
    }
  }
  return activeContent;
}

export async function savePortalContentKey(key, value) {
  setContentInMemory(key, value);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id || null;
      await supabase.from("portal_content").upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: userId
      });
    } catch (e) {
      console.error("Failed to sync content to Supabase:", e);
    }
  }

  document.dispatchEvent(new CustomEvent("adab:content-updated", { detail: { key, value } }));
  return true;
}

export async function resetContentToDefaults() {
  activeContent = { ...DEFAULT_CONTENT };
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // ignore
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const updates = Object.entries(DEFAULT_CONTENT).map(([k, v]) => ({
        key: k,
        value: v,
        updated_at: new Date().toISOString()
      }));
      await supabase.from("portal_content").upsert(updates);
    } catch (e) {
      console.warn("Could not reset Supabase content:", e);
    }
  }

  document.dispatchEvent(new CustomEvent("adab:content-updated", { detail: { all: true } }));
}
