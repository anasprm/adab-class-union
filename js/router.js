import { coreMembers, creativeWorks, events, formatEventDate, students, wings } from "./data.js";
import { assetPaths } from "./assets.js";
import { isSupabaseConfigured } from "./supabase.js";

const root = document.querySelector("#view-root");
let currentUser = null;
let currentProfile = null;
let portalMembers = null;
let loginMode = "signin";
let authFeedback = "";
let authFeedbackType = "error";
let publishedWorks = [];
let portalWings = wings;
let portalEvents = [];
let announcements = [];
let financeEntries = [];
let adminProfiles = [];
let reviewWorks = [];
let reviewSuggestions = [];
let financeLoading = true;
let adminLoading = true;

const roleNames = {
  developer: "Developer",
  teacher: "Class teacher",
  committee: "Core committee",
  treasurer: "Treasurer",
  student: "Student",
  wing: "Wing account"
};
const rolesAllowedToReview = ["developer", "teacher", "committee"];
const canManageUnion = profile => rolesAllowedToReview.includes(profile?.role);
const canManageContent = profile => canManageUnion(profile) || profile?.role === "wing";
const formatMoney = amount => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(amount) || 0);

const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

const avatar = (initials, extraClass = "") => `<div class="profile-avatar ${extraClass}" aria-hidden="true">${escapeHTML(initials)}</div>`;
const emptyState = (title, message) => `<div class="empty-state"><strong>${escapeHTML(title)}</strong>${escapeHTML(message)}</div>`;

function eventCard(event) {
  const date = new Date(event.date);
  const upcoming = event.status === "Upcoming";
  return `<article class="card event-card" data-event-id="${escapeHTML(event.id)}" tabindex="0" role="button" aria-label="View ${escapeHTML(event.title)} details">
    <div class="card-body">
      <div class="card-topline">
        <div class="event-date"><strong>${new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date)}</strong><span>${new Intl.DateTimeFormat("en", { month: "short" }).format(date)}</span></div>
        <span class="badge ${upcoming ? "" : "badge-neutral"}">${escapeHTML(event.status)}</span>
      </div>
      <h3>${escapeHTML(event.title)}</h3>
      <p>${escapeHTML(event.description)}</p>
      <div class="event-meta"><span>◷ ${escapeHTML(event.time)}</span><span>⌖ ${escapeHTML(event.venue)}</span></div>
      <div class="card-footer"><small>${escapeHTML(event.category)} · ${escapeHTML(formatEventDate(event.date))}</small><span class="text-link">Details →</span></div>
    </div>
  </article>`;
}

function profileCard(member) {
  return `<article class="card profile-card" data-member-roll="${escapeHTML(member.roll)}" tabindex="0" role="button" aria-label="View ${escapeHTML(member.name)} profile">
    <div class="card-body">${avatar(member.initials)}<div><span class="badge">${escapeHTML(member.role)}</span><h3>${escapeHTML(member.name)}</h3><p>${escapeHTML(member.roll)} · ${escapeHTML(member.district)}</p></div></div>
  </article>`;
}

function wingCard(wing) {
  return `<article class="card feature-card">
    <div class="feature-icon" aria-hidden="true">${escapeHTML(wing.icon)}</div>
    <div class="card-topline" style="margin-top:16px"><span class="badge">${escapeHTML(wing.accent)}</span></div>
    <h3>${escapeHTML(wing.name)}</h3><p>${escapeHTML(wing.objective)}</p>
    <ul class="activity-list">${wing.activities.map(activity => `<li>${escapeHTML(activity)}</li>`).join("")}</ul>
  </article>`;
}

function workCard(work) {
  return `<article class="card work-card" data-work-id="${escapeHTML(work.id)}" tabindex="0" role="button" aria-label="Read ${escapeHTML(work.title)}">
    <div class="work-art" data-kind="${escapeHTML(work.kind)}" aria-hidden="true"><img src="${escapeHTML(work.image)}" alt="" loading="lazy"></div>
    <div class="card-body"><div class="card-topline"><span class="badge">${escapeHTML(work.type)}</span><small>${escapeHTML(work.date)}</small></div>
      <h3>${escapeHTML(work.title)}</h3><p>${escapeHTML(work.excerpt)}</p>
      <div class="card-footer"><small>By ${escapeHTML(work.author)}</small><span class="text-link">Read →</span></div>
    </div>
  </article>`;
}

function renderHome() {
  const allEvents = [...portalEvents, ...events];
  const upcoming = allEvents.filter(event => event.status === "Upcoming").sort((a, b) => new Date(a.date) - new Date(b.date));
  const flagship = upcoming.find(event => event.id === "union-fest") || upcoming[0];
  return `<section class="hero">
    <div class="hero-copy"><p class="eyebrow">Plus One · Kerala, India</p><h1 class="page-title">A class with a voice.<br>A union with a purpose.</h1>
      <p class="lead">Welcome to the digital home of ADAB Class Union — where we learn together, make things together, and build a community that includes everyone.</p>
      <div class="hero-actions"><a class="button" href="#events">Explore what’s on <span aria-hidden="true">→</span></a><a class="button button-secondary" href="#about">Meet the union</a></div>
    </div>
    <div class="hero-art" aria-hidden="true"><div class="hero-orbit"><img src="${assetPaths.logo}" alt=""></div><span class="orbit-dot orbit-dot-one">✦</span><span class="orbit-dot orbit-dot-two">⌁</span><span class="orbit-dot orbit-dot-three">◈</span></div>
  </section>
  <div class="stat-strip" aria-label="Union at a glance"><div class="stat-item"><span class="stat-number">24</span><span class="stat-label">Class members</span></div><div class="stat-item"><span class="stat-number">${portalWings.length}</span><span class="stat-label">Student wings</span></div><div class="stat-item"><span class="stat-number">8</span><span class="stat-label">Union leaders</span></div></div>
  <div class="page-shell">
    ${flagship ? `<section class="section-block countdown-panel" aria-label="Countdown to ${escapeHTML(flagship.title)}">
      <div><p class="eyebrow">Flagship event countdown</p><h2>${escapeHTML(flagship.title)}</h2><p>${escapeHTML(formatEventDate(flagship.date))} · ${escapeHTML(flagship.venue)}</p></div>
      <div class="countdown-values" data-countdown="${escapeHTML(flagship.date)}" aria-live="off"><div class="countdown-unit"><strong data-days>--</strong><span>Days</span></div><div class="countdown-unit"><strong data-hours>--</strong><span>Hours</span></div><div class="countdown-unit"><strong data-minutes>--</strong><span>Minutes</span></div><div class="countdown-unit"><strong data-seconds>--</strong><span>Seconds</span></div></div>
    </section>` : ""}
    ${announcements.length ? `<section class="section-block"><div class="section-heading"><div><p class="eyebrow">From the union</p><h2 class="section-title">Latest announcements</h2></div></div><div class="card-grid">${announcements.slice(0, 3).map(item => `<article class="card"><div class="card-body"><div class="card-topline"><span class="badge">${escapeHTML(item.wingName || "Union notice")}</span><small>${escapeHTML(new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(item.created_at)))}</small></div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.message)}</p></div></article>`).join("")}</div></section>` : ""}
    <section class="section-block"><div class="section-heading"><div><p class="eyebrow">Make a date</p><h2 class="section-title">What’s happening</h2></div><a class="text-link" href="#events">All events →</a></div>
      <div class="card-grid">${upcoming.slice(0, 3).map(eventCard).join("") || emptyState("No upcoming events yet", "Check back soon for the next class gathering.")}</div>
    </section>
    <section class="section-block"><div class="section-heading"><div><p class="eyebrow">Student voices</p><h2 class="section-title">Made by our class</h2></div><a class="text-link" href="#works">Explore student works →</a></div>
      <div class="card-grid">${creativeWorks.slice(0, 3).map(workCard).join("")}</div>
    </section>
    <section class="section-block" id="suggestions"><div class="section-heading"><div><p class="eyebrow">Your voice matters</p><h2 class="section-title">Have an idea for the union?</h2></div><p>Share a suggestion, a question, or something you’d love to see happen.</p></div>
      ${suggestionForm()}
    </section>
  </div>`;
}

function suggestionForm() {
  if (!currentUser) {
    return `<div class="auth-required"><p>Sign in with your student account to send a suggestion to the union council.</p><a class="button" href="#login">Sign in to continue →</a></div>`;
  }
  return `<form class="contact-form" id="suggestion-form">
    <div class="form-field"><label for="suggestion-message">Your suggestion</label><textarea id="suggestion-message" name="message" required minlength="5" maxlength="2000"></textarea></div>
    <p class="form-note">Sending as ${escapeHTML(currentUser.email)}. Your suggestion will be stored for the union council.</p>
    <div><button class="button" type="submit">Send suggestion <span aria-hidden="true">→</span></button></div>
  </form>`;
}

function renderAbout() {
  return `<div class="page-shell"><header><p class="eyebrow">Who we are</p><h1 class="page-title">A union shaped by its students.</h1><p class="lead">ADAB Class Union brings our Plus One class together around learning, creativity, wellbeing, and the things we can achieve as a team.</p></header>
    <section class="section-block about-grid"><div class="about-copy"><h2 class="section-title">More than a calendar of events</h2><p>Our union is a student-led space to share ideas, learn from one another, and make class life richer for everyone. Whether you love the stage, the sports ground, a good book, or working behind the scenes, there is a place to contribute.</p><p>We believe a strong class is built through curiosity, respect, and the confidence to try something new. The ADAB portal is where we keep those shared moments and opportunities close at hand.</p></div>
      <aside class="about-note"><strong>Our promise</strong><p>Make room for every voice. Learn with humility. Celebrate effort as much as achievement. Leave the class community better than we found it.</p></aside>
    </section>
    <section class="section-block"><div class="section-heading"><div><p class="eyebrow">The people behind it</p><h2 class="section-title">A student-led team</h2></div><a class="text-link" href="#core-members">Meet the core team →</a></div><div class="card-grid">${coreMembers.slice(0, 3).map(profileCard).join("")}</div></section>
    <section class="section-block"><p class="eyebrow">Say hello</p><h2 class="section-title">Bring your idea to the table.</h2><p class="lead">The best union activities often begin with a small suggestion. Tell us what would make class life more meaningful for you.</p>${suggestionForm()}</section>
  </div>`;
}

function renderEvents() {
  const sorted = [...portalEvents, ...events].sort((a, b) => new Date(b.date) - new Date(a.date));
  return `<div class="page-shell"><header><p class="eyebrow">Save the date</p><h1 class="page-title">Time well spent, together.</h1><p class="lead">See what’s coming up and look back at the moments our class has already shared.</p></header>
    <section class="section-block">
      <div class="filter-bar event-filter-bar">
        <div class="search-field"><label class="sr-only" for="event-search">Search events by title, category, or venue</label><input id="event-search" type="search" placeholder="Search events…" autocomplete="off"><button type="button" class="search-clear" aria-label="Clear event search" hidden>×</button></div>
        <label class="sr-only" for="event-status-filter">Filter events by status</label><select id="event-status-filter"><option value="">All events</option><option value="Upcoming">Upcoming</option><option value="Completed">Past events</option></select>
        <label class="sr-only" for="event-category-filter">Filter events by category</label><select id="event-category-filter"><option value="">All categories</option>${[...new Set(sorted.map(event => event.category))].sort().map(category => `<option>${escapeHTML(category)}</option>`).join("")}</select>
      </div>
      <p class="result-count" id="event-result-count" aria-live="polite"></p><div class="card-grid" id="event-grid">${sorted.map(eventCard).join("")}</div>
    </section></div>`;
}

function renderCore() {
  return `<div class="page-shell"><header><p class="eyebrow">Student leadership</p><h1 class="page-title">Meet the core team.</h1><p class="lead">Eight classmates, one shared commitment: making the union a welcoming place to learn, contribute, and belong.</p></header>
    <section class="section-block"><div class="card-grid">${coreMembers.map(profileCard).join("")}</div></section></div>`;
}

function renderWings() {
  return `<div class="page-shell"><header><p class="eyebrow">Find your way in</p><h1 class="page-title">${portalWings.length} wings. Many ways to belong.</h1><p class="lead">Our student wings turn shared interests into practical, welcoming activities. Pick a starting point and bring your own perspective.</p></header>
    <section class="section-block feature-grid">${portalWings.map(wingCard).join("")}</section></div>`;
}

function renderMembers() {
  const directory = portalMembers || students;
  return `<div class="page-shell"><header><p class="eyebrow">Our class, at a glance</p><h1 class="page-title">Every name has a story.</h1><p class="lead">Find a classmate by name, roll number, house team, or district. Select a profile to see more.</p></header>
    <section class="section-block">
      <div class="filter-bar">
        <div class="search-field"><label class="sr-only" for="member-search">Search members by name or roll number</label><input id="member-search" type="search" placeholder="Search name or roll number…" autocomplete="off"><button type="button" class="search-clear" aria-label="Clear search" hidden>×</button></div>
        <label class="sr-only" for="house-filter">Filter by house team</label><select id="house-filter"><option value="">All house teams</option>${[...new Set(directory.map(student => student.house))].map(house => `<option>${escapeHTML(house)}</option>`).join("")}</select>
        <label class="sr-only" for="district-filter">Filter by district</label><select id="district-filter"><option value="">All districts</option>${[...new Set(directory.map(student => student.district))].sort().map(district => `<option>${escapeHTML(district)}</option>`).join("")}</select>
      </div>
      <p class="result-count" id="member-result-count" aria-live="polite"></p><div class="card-grid" id="member-grid"></div>
    </section></div>`;
}

function renderWorks() {
  const works = [...publishedWorks, ...creativeWorks];
  return `<div class="page-shell"><header><p class="eyebrow">Created in our class</p><h1 class="page-title">Ideas deserve a little space.</h1><p class="lead">Read student writing, explore creative experiments, and revisit the first pages of our class magazine.</p></header>
    <section class="section-block"><div class="card-grid">${works.map(workCard).join("")}</div></section>
    <section class="section-block"><p class="eyebrow">Add your voice</p><h2 class="section-title">Share a creative work.</h2><p class="lead">Submit your writing or artwork for review by the union council.</p>
      ${currentProfile ? `<form class="contact-form" id="creative-work-form">
        <div class="form-row"><div class="form-field"><label for="work-title">Work title</label><input id="work-title" name="title" required maxlength="100"></div>
          <div class="form-field"><label for="work-author">Your name</label><input id="work-author" name="author" required maxlength="80"></div></div>
        <div class="form-row"><div class="form-field"><label for="work-type">Type of work</label><select id="work-type" name="type" required><option value="Article">Article</option><option value="Poetry">Poetry</option><option value="Calligraphy">Calligraphy</option><option value="Magazine">Magazine</option></select></div>
          <div class="form-field"><label for="work-excerpt">Short description</label><input id="work-excerpt" name="excerpt" required maxlength="180"></div></div>
        <div class="form-field"><label for="work-content">Your work</label><textarea id="work-content" name="content" required maxlength="5000"></textarea></div>
        <div class="form-field"><label for="work-image">Artwork or calligraphy image (optional)</label><input id="work-image" name="attachment" type="file" accept="image/jpeg,image/png,image/webp"><small class="form-note">JPEG, PNG, or WebP up to 10 MB. Attachments stay private until a reviewer publishes the work.</small></div>
        <p class="form-note">Submitting as ${escapeHTML(currentUser.email)}. Your work will be private until approved by the union council.</p>
        <div><button class="button" type="submit">Submit for review <span aria-hidden="true">→</span></button></div>
      </form>` : `<div class="auth-required"><p>${currentUser ? "Your account still needs an assigned portal role before you can submit work." : "Sign in with your student account to submit work for council review."}</p><a class="button" href="#${currentUser ? "account" : "login"}">${currentUser ? "View account status →" : "Sign in to submit →"}</a></div>`}
    </section></div>`;
}

function renderLogin() {
  if (currentUser && loginMode !== "update-password") {
    const email = currentUser.email || "";
    const initials = email.slice(0, 2).toUpperCase();
    return `<div class="auth-shell">
      <section class="auth-card auth-card-account">
        <div class="auth-aside">
          <a class="brand brand-auth" href="#home"><img src="${assetPaths.logo}" alt="" width="42" height="42"><span><strong>ADAB</strong><small>CLASS UNION</small></span></a>
          <div class="auth-aside-copy"><p class="eyebrow">Your union, closer</p><h1>A place for every voice.</h1><p>Stay connected to class life, student ideas, and the moments we make together.</p></div>
          <p class="auth-aside-note">YOUR ADAB ACCOUNT</p>
        </div>
        <div class="auth-content">
          <div class="account-avatar" aria-hidden="true">${escapeHTML(initials)}</div>
          <p class="eyebrow">${escapeHTML(currentProfile ? roleNames[currentProfile.role] : "Account access")}</p>
          <h2 id="login-title">Welcome to ADAB.</h2>
          <p class="auth-description">${currentProfile ? "Your approved account is connected to the ADAB Union portal." : "This account has not yet been assigned an active ADAB portal role. Contact the developer to request access."}</p>
          <div class="account-detail"><span>Account email</span><strong>${escapeHTML(email)}</strong></div>
          ${currentProfile ? `<a class="button auth-submit" href="#account">Open your account</a>${currentProfile.role === "developer" || currentProfile.role === "treasurer" ? `<a class="auth-back-link" href="#finance">Open the private finance page</a>` : ""}` : ""}
          <button class="button button-secondary auth-submit" type="button" data-action="sign-out">Sign out</button>
          <a class="auth-back-link" href="#home">← Back to the union portal</a>
        </div>
      </section>
    </div>`;
  }

  const signUp = false;
  const recovery = loginMode === "recovery";
  const updatePassword = loginMode === "update-password";
  const heading = signUp ? "Join the community." : recovery ? "Reset your password." : updatePassword ? "Choose a new password." : "Welcome back.";
  const intro = signUp
    ? "Create your student account to share suggestions and creative work."
    : recovery
      ? "We’ll email you a secure link to reset your account password."
      : updatePassword
        ? "Choose a new password for your student account."
        : "Sign in to take part in your ADAB class community.";
  const configured = isSupabaseConfigured;
  const emailField = !updatePassword
    ? `<div class="form-field"><label for="login-email">Email address</label><input id="login-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="254" required ${configured ? "" : "disabled"}></div>`
    : "";
  const displayNameField = signUp
    ? `<div class="form-field"><label for="login-name">Your name</label><input id="login-name" name="name" autocomplete="name" placeholder="Your full name" maxlength="80" required ${configured ? "" : "disabled"}></div>`
    : "";
  const passwordField = !recovery
    ? `<div class="form-field"><label for="login-password">${updatePassword ? "New password" : "Password"}</label>
        <div class="password-input"><input id="login-password" name="password" type="password" autocomplete="${updatePassword ? "new-password" : "current-password"}" placeholder="${updatePassword ? "At least 8 characters" : "Enter your password"}" minlength="${updatePassword || signUp ? "8" : "1"}" maxlength="128" required ${configured ? "" : "disabled"}><button class="password-toggle" type="button" data-action="toggle-password" aria-label="Show password" aria-pressed="false" ${configured ? "" : "disabled"}>Show</button></div>
      </div>`
    : "";
  const submitLabel = signUp ? "Create account" : recovery ? "Send reset link" : updatePassword ? "Update password" : "Sign in";
  const authControls = recovery || updatePassword
    ? `<button class="auth-mode-link" type="button" data-auth-mode="signin">← Back to sign in</button>`
    : `<div class="auth-secondary-actions"><button class="auth-mode-link" type="button" data-auth-mode="recovery">Forgot password?</button><p class="auth-switch">Account access is invitation-only.</p></div>`;

  return `<div class="auth-shell">
    <section class="auth-card">
      <aside class="auth-aside">
        <a class="brand brand-auth" href="#home"><img src="${assetPaths.logo}" alt="" width="42" height="42"><span><strong>ADAB</strong><small>CLASS UNION</small></span></a>
        <div class="auth-aside-copy"><p class="eyebrow">Your union, closer</p><h1>A place for every voice.</h1><p>Stay connected to class life, student ideas, and the moments we make together.</p></div>
        <div class="auth-decoration" aria-hidden="true"><span>✦</span><span>✳</span><span>◈</span></div>
        <p class="auth-aside-note">LEARN TOGETHER · GROW TOGETHER</p>
      </aside>
      <div class="auth-content">
        <p class="eyebrow">Student portal</p>
        <h2 id="login-title">${heading}</h2>
        <p class="auth-description">${intro}</p>
        <form class="auth-form" id="login-form" data-auth-mode="${loginMode}">
          ${displayNameField}${emailField}${passwordField}
          <p class="auth-error ${authFeedbackType === "success" ? "auth-success" : ""}" id="login-feedback" role="status" aria-live="polite">${escapeHTML(authFeedback)}</p>
          <button class="button auth-submit" type="submit" ${configured ? "" : "disabled"}>${submitLabel} <span aria-hidden="true">→</span></button>
        </form>
        ${configured ? "" : `<div class="demo-notice"><span aria-hidden="true">ⓘ</span><p><strong>Supabase setup needed.</strong> Add the project URL and publishable/anon key to the Vercel environment to enable account features. No passwords are stored in this site’s source.</p></div>`}
        ${configured ? authControls : ""}
        <p class="auth-help">Need help? <a href="#about">Contact the union council</a></p>
      </div>
    </section>
  </div>`;
}

function renderAccount() {
  if (!currentUser) {
    return `<div class="page-shell"><header><p class="eyebrow">Member account</p><h1 class="page-title">Sign in to manage your account.</h1><p class="lead">Your profile and member tools are available to approved ADAB accounts.</p><a class="button" href="#login">Sign in →</a></header></div>`;
  }
  if (!currentProfile) {
    return `<div class="page-shell"><header><p class="eyebrow">Account approval</p><h1 class="page-title">Your portal role is not active yet.</h1><p class="lead">Ask the ADAB developer to send an invitation or reactivate your account. Financial information and member tools remain unavailable until your account is approved.</p><button class="button button-secondary" type="button" data-action="sign-out">Sign out</button></header></div>`;
  }
  const profile = currentProfile;
  const roleDescription = {
    developer: "Manage invited accounts, portal roles, all wing names and descriptions, union content, and the financial ledger.",
    teacher: "Coordinate class-wide union activity, publish announcements and events, and review student works and suggestions.",
    committee: "Coordinate union events and announcements, review student works and suggestions, and support the class community.",
    treasurer: "View the private ledger and manage financial entries and supporting documents.",
    student: "Keep your profile current, see member-only finance information, and submit creative work for review.",
    wing: `Manage announcements and activities for ${portalWings.find(wing => wing.id === profile.wing_id)?.name || "your assigned wing"}, and submit personal works.`
  }[profile.role];
  const contentTools = canManageContent(profile) ? `
    <section class="section-block"><p class="eyebrow">Share with the class</p><h2 class="section-title">Publish an announcement</h2>
      <form class="contact-form" id="announcement-form">
        <div class="form-field"><label for="announcement-title">Announcement title</label><input id="announcement-title" name="title" required maxlength="120"></div>
        <div class="form-field"><label for="announcement-message">Message</label><textarea id="announcement-message" name="message" required maxlength="1500"></textarea></div>
        ${profile.role === "wing" ? `<input type="hidden" name="wing_id" value="${escapeHTML(profile.wing_id)}">` : `<div class="form-field"><label for="announcement-wing">Post for</label><select id="announcement-wing" name="wing_id"><option value="">All members</option>${portalWings.map(wing => `<option value="${escapeHTML(wing.id)}">${escapeHTML(wing.name)}</option>`).join("")}</select></div>`}
        <button class="button" type="submit">Publish announcement</button>
      </form>
    </section>
    <section class="section-block"><p class="eyebrow">Plan together</p><h2 class="section-title">Add a class event</h2>
      <form class="contact-form" id="portal-event-form">
        <div class="form-row"><div class="form-field"><label for="portal-event-title">Event title</label><input id="portal-event-title" name="title" required maxlength="120"></div><div class="form-field"><label for="portal-event-category">Category</label><input id="portal-event-category" name="category" required maxlength="60" placeholder="Academic, Sports, Arts…"></div></div>
        <div class="form-row"><div class="form-field"><label for="portal-event-date">Date and time</label><input id="portal-event-date" name="starts_at" type="datetime-local" required></div><div class="form-field"><label for="portal-event-time">Time shown</label><input id="portal-event-time" name="time_label" required maxlength="80" placeholder="9:00 AM – 12:00 PM"></div></div>
        <div class="form-field"><label for="portal-event-venue">Venue</label><input id="portal-event-venue" name="venue" required maxlength="120"></div>
        <div class="form-field"><label for="portal-event-description">Description</label><textarea id="portal-event-description" name="description" required maxlength="1000"></textarea></div>
        ${profile.role === "wing" ? `<input type="hidden" name="wing_id" value="${escapeHTML(profile.wing_id)}">` : `<div class="form-field"><label for="portal-event-wing">Wing (optional)</label><select id="portal-event-wing" name="wing_id"><option value="">Class-wide event</option>${portalWings.map(wing => `<option value="${escapeHTML(wing.id)}">${escapeHTML(wing.name)}</option>`).join("")}</select></div>`}
        <button class="button" type="submit">Publish event</button>
      </form>
    </section>` : "";
  const reviewTools = canManageUnion(profile) ? `
    <section class="section-block"><p class="eyebrow">Council review</p><h2 class="section-title">Student works awaiting review</h2>
      ${reviewWorks.length ? `<div class="management-list">${reviewWorks.map(work => `<article class="card management-card"><div><span class="badge">${escapeHTML(work.work_type)}</span><h3>${escapeHTML(work.title)}</h3><p>By ${escapeHTML(work.author_name)} · ${escapeHTML(work.excerpt)}</p>${work.attachment_path ? `<p><button class="text-link file-link" type="button" data-work-file="${escapeHTML(work.attachment_path)}">View submitted artwork</button></p>` : ""}</div><form class="review-work-form" data-work-review="${escapeHTML(work.id)}"><label class="sr-only" for="work-status-${escapeHTML(work.id)}">Decision for ${escapeHTML(work.title)}</label><select id="work-status-${escapeHTML(work.id)}" name="status"><option value="published">Publish</option><option value="rejected">Decline</option></select><button class="button" type="submit">Save decision</button></form></article>`).join("")}</div>` : `<p class="form-note">No works are waiting for review.</p>`}
    </section>
    <section class="section-block"><p class="eyebrow">Student feedback</p><h2 class="section-title">Suggestions from the class</h2>
      ${reviewSuggestions.length ? `<div class="management-list">${reviewSuggestions.map(item => `<article class="card management-card"><div><p>${escapeHTML(item.message)}</p><small>${escapeHTML(item.email || "Student")} · ${escapeHTML(new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(item.created_at)))}</small></div></article>`).join("")}</div>` : `<p class="form-note">No suggestions have been submitted.</p>`}
    </section>` : "";
  return `<div class="page-shell"><header><p class="eyebrow">${escapeHTML(roleNames[profile.role])}${profile.role === "wing" ? ` · ${escapeHTML(portalWings.find(wing => wing.id === profile.wing_id)?.name || "")}` : ""}</p><h1 class="page-title">Your ADAB account.</h1><p class="lead">${escapeHTML(roleDescription)}</p></header>
    <section class="section-block account-overview"><div><span class="badge">${escapeHTML(roleNames[profile.role])}</span><h2>${escapeHTML(profile.display_name)}</h2><p>${escapeHTML(currentUser.email || "")}</p></div><a class="button button-secondary" href="#finance">View member finance page →</a></section>
    <section class="section-block"><p class="eyebrow">Your details</p><h2 class="section-title">Update your profile</h2>
      <form class="contact-form" id="profile-form">
        <div class="form-row"><div class="form-field"><label for="profile-name">Display name</label><input id="profile-name" name="display_name" required maxlength="80" value="${escapeHTML(profile.display_name)}"></div><div class="form-field"><label for="profile-roll">Roll number</label><input id="profile-roll" name="roll_number" maxlength="30" value="${escapeHTML(profile.roll_number || "")}"></div></div>
        <div class="form-row"><div class="form-field"><label for="profile-house">House team</label><select id="profile-house" name="house_team"><option value="">Choose a house team</option>${["Red Knights", "White Warriors", "Crimson Falcons"].map(value => `<option ${profile.house_team === value ? "selected" : ""}>${value}</option>`).join("")}</select></div><div class="form-field"><label for="profile-district">District</label><input id="profile-district" name="district" maxlength="60" value="${escapeHTML(profile.district || "")}"></div></div>
        <button class="button" type="submit">Save profile</button>
      </form>
    </section>
    <section class="section-block"><p class="eyebrow">Account security</p><h2 class="section-title">Change your password</h2>
      <form class="contact-form" id="change-password-form">
        <div class="form-field"><label for="new-password">New password</label><input id="new-password" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><small class="form-note">Use a unique password with at least 12 characters.</small></div>
        <div class="form-field"><label for="confirm-password">Confirm new password</label><input id="confirm-password" name="confirm_password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></div>
        <button class="button" type="submit">Update password</button>
      </form>
    </section>${profile.role === "treasurer" || profile.role === "developer" ? `<section class="section-block"><a class="button" href="#finance">Open finance controls →</a></section>` : ""}${contentTools}${reviewTools}</div>`;
}

function renderFinance() {
  if (!currentUser) return `<div class="page-shell"><header><p class="eyebrow">Member-only</p><h1 class="page-title">Sign in to view union finances.</h1><p class="lead">The ADAB financial ledger is available only to approved, signed-in accounts.</p><a class="button" href="#login">Sign in →</a></header></div>`;
  if (!currentProfile) return `<div class="page-shell"><header><p class="eyebrow">Member-only</p><h1 class="page-title">Approved account required.</h1><p class="lead">This account has no active ADAB role. Contact the developer for access; financial data is not available until your role is approved.</p></header></div>`;
  const canEdit = ["developer", "treasurer"].includes(currentProfile.role);
  const income = financeEntries.filter(entry => entry.entry_type === "income").reduce((total, entry) => total + Number(entry.amount), 0);
  const expenses = financeEntries.filter(entry => entry.entry_type === "expense").reduce((total, entry) => total + Number(entry.amount), 0);
  return `<div class="page-shell"><header><p class="eyebrow">Private · ADAB members</p><h1 class="page-title">Union finances.</h1><p class="lead">A transparent view of class union income and spending. Visible only to approved, signed-in accounts.</p></header>
    <section class="section-block finance-summary"><article><span>Total income</span><strong>${formatMoney(income)}</strong></article><article><span>Total expenses</span><strong>${formatMoney(expenses)}</strong></article><article><span>Balance</span><strong>${formatMoney(income - expenses)}</strong></article></section>
    ${financeLoading ? `<p class="form-note">Loading the private ledger…</p>` : ""}
    ${canEdit ? `<section class="section-block"><p class="eyebrow">Treasurer controls</p><h2 class="section-title">Record a transaction</h2><form class="contact-form" id="finance-form">
      <div class="form-row"><div class="form-field"><label for="finance-type">Transaction</label><select id="finance-type" name="entry_type"><option value="income">Income</option><option value="expense">Expense</option></select></div><div class="form-field"><label for="finance-amount">Amount (INR)</label><input id="finance-amount" name="amount" type="number" min="0.01" step="0.01" required></div></div>
      <div class="form-row"><div class="form-field"><label for="finance-category">Category</label><input id="finance-category" name="category" required maxlength="80"></div><div class="form-field"><label for="finance-date">Date</label><input id="finance-date" name="occurred_on" type="date" required></div></div>
      <div class="form-field"><label for="finance-description">Details</label><textarea id="finance-description" name="description" required maxlength="500"></textarea></div>
      <div class="form-field"><label for="finance-file">Receipt or supporting document (optional)</label><input id="finance-file" name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp"><small class="form-note">PDF or image, up to 10 MB. Files are stored privately.</small></div>
      <button class="button" type="submit">Add to ledger</button></form></section>` : ""}
    <section class="section-block"><p class="eyebrow">Ledger</p><h2 class="section-title">Transactions</h2>
      ${financeEntries.length ? `<div class="management-list">${financeEntries.map(entry => `<article class="card management-card finance-entry"><div><div class="card-topline"><span class="badge ${entry.entry_type === "expense" ? "badge-neutral" : ""}">${escapeHTML(entry.entry_type)}</span><strong>${formatMoney(entry.amount)}</strong></div><h3>${escapeHTML(entry.category)}</h3><p>${escapeHTML(entry.description)}</p><small>${escapeHTML(new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${entry.occurred_on}T00:00:00`)))}</small>${entry.attachment_path ? `<p><button class="text-link file-link" type="button" data-finance-file="${escapeHTML(entry.attachment_path)}">View supporting document</button></p>` : ""}</div>
        ${canEdit ? `<form class="finance-update-form" data-finance-update="${escapeHTML(entry.id)}"><label class="sr-only" for="finance-edit-type-${escapeHTML(entry.id)}">Transaction type</label><select id="finance-edit-type-${escapeHTML(entry.id)}" name="entry_type"><option value="income" ${entry.entry_type === "income" ? "selected" : ""}>Income</option><option value="expense" ${entry.entry_type === "expense" ? "selected" : ""}>Expense</option></select><label class="sr-only" for="finance-edit-amount-${escapeHTML(entry.id)}">Amount</label><input id="finance-edit-amount-${escapeHTML(entry.id)}" name="amount" type="number" min="0.01" step="0.01" value="${escapeHTML(entry.amount)}" required><label class="sr-only" for="finance-edit-category-${escapeHTML(entry.id)}">Category</label><input id="finance-edit-category-${escapeHTML(entry.id)}" name="category" maxlength="80" value="${escapeHTML(entry.category)}" required><label class="sr-only" for="finance-edit-description-${escapeHTML(entry.id)}">Description</label><input id="finance-edit-description-${escapeHTML(entry.id)}" name="description" maxlength="500" value="${escapeHTML(entry.description)}" required><label class="sr-only" for="finance-edit-date-${escapeHTML(entry.id)}">Date</label><input id="finance-edit-date-${escapeHTML(entry.id)}" name="occurred_on" type="date" value="${escapeHTML(entry.occurred_on)}" required><button class="button button-secondary" type="submit">Update</button><button class="button button-danger" type="button" data-finance-delete="${escapeHTML(entry.id)}" data-attachment="${escapeHTML(entry.attachment_path || "")}">Delete</button></form>` : ""}</article>`).join("")}</div>` : `<div class="empty-state"><strong>${financeLoading ? "Loading ledger" : "No transactions yet"}</strong>${financeLoading ? "The latest finance entries will appear here." : "The treasurer has not added any entries."}</div>`}
    </section></div>`;
}

function renderAdmin() {
  if (currentProfile?.role !== "developer") return `<div class="page-shell"><header><p class="eyebrow">Restricted</p><h1 class="page-title">Developer access required.</h1><p class="lead">Only the developer account can manage invitations, roles, and portal-wide wing content.</p></header></div>`;
  const roleOptions = Object.keys(roleNames).filter(role => role !== "developer");
  const roleCapacities = { developer: 1, teacher: 1, committee: 1, treasurer: 1, student: 15, wing: 7 };
  const roleCounts = Object.fromEntries(Object.keys(roleCapacities).map(role => [
    role,
    adminProfiles.filter(member => member.role === role && member.is_active).length
  ]));
  return `<div class="page-shell"><header><p class="eyebrow">Portal administration</p><h1 class="page-title">Manage the union portal.</h1><p class="lead">Invite each person to an individual account, assign only the access they need, and edit wing information once for every page that displays it.</p></header>
    <section class="section-block"><p class="eyebrow">Member accounts</p><h2 class="section-title">Invite an account</h2><p class="form-note">Each person needs an individual email invitation to set a private password. Never share one default password across the class. Developer access is bootstrapped separately and cannot be assigned here.</p>
      <form class="contact-form" id="invite-form"><div class="form-row"><div class="form-field"><label for="invite-name">Full name</label><input id="invite-name" name="display_name" required maxlength="80"></div><div class="form-field"><label for="invite-email">Email address</label><input id="invite-email" name="email" type="email" required maxlength="254"></div></div>
        <div class="form-row"><div class="form-field"><label for="invite-role">Account role</label><select id="invite-role" name="role" required>${roleOptions.map(role => `<option value="${role}">${escapeHTML(roleNames[role])}</option>`).join("")}</select></div><div class="form-field" id="invite-wing-field" hidden><label for="invite-wing">Assigned wing</label><select id="invite-wing" name="wing_id">${portalWings.map(wing => `<option value="${escapeHTML(wing.id)}">${escapeHTML(wing.name)}</option>`).join("")}</select></div></div>
        <button class="button" type="submit">Send invitation</button></form>
    </section>
    <section class="section-block"><p class="eyebrow">Account roster</p><h2 class="section-title">Manage access</h2><div class="finance-summary">${Object.entries(roleCapacities).map(([role, limit]) => `<article><span>${escapeHTML(roleNames[role])}</span><strong>${roleCounts[role]} / ${limit}</strong></article>`).join("")}</div>
      ${adminLoading ? `<p class="form-note">Loading account roster…</p>` : adminProfiles.length ? `<div class="management-list">${adminProfiles.map(member => `<article class="card management-card"><div><h3>${escapeHTML(member.display_name)}</h3><p>${escapeHTML(member.email)}${member.wing_id ? ` · ${escapeHTML(portalWings.find(wing => wing.id === member.wing_id)?.name || "")}` : ""}</p><small>${member.is_active ? "Active" : "Suspended"}</small></div>${member.role === "developer" ? `<span class="badge">Developer</span>` : `<form class="account-access-form" data-account-update="${escapeHTML(member.id)}"><label class="sr-only" for="account-role-${escapeHTML(member.id)}">Role for ${escapeHTML(member.display_name)}</label><select id="account-role-${escapeHTML(member.id)}" name="role">${roleOptions.map(role => `<option value="${role}" ${member.role === role ? "selected" : ""}>${escapeHTML(roleNames[role])}</option>`).join("")}</select><label class="sr-only" for="account-wing-${escapeHTML(member.id)}">Wing assignment</label><select id="account-wing-${escapeHTML(member.id)}" name="wing_id" ${member.role === "wing" ? "" : "disabled"}><option value="">No wing</option>${portalWings.map(wing => `<option value="${escapeHTML(wing.id)}" ${member.wing_id === wing.id ? "selected" : ""}>${escapeHTML(wing.name)}</option>`).join("")}</select><label class="checkbox-field"><input type="checkbox" name="is_active" ${member.is_active ? "checked" : ""}> Active</label><button class="button button-secondary" type="submit">Save access</button></form>`}</article>`).join("")}</div>` : `<p class="form-note">No invited accounts yet.</p>`}
    </section>
    <section class="section-block"><p class="eyebrow">Portal-wide content</p><h2 class="section-title">Edit student wings</h2><p class="lead">Changes here update the Wings page, account assignments, class announcements, and wing labels everywhere they appear.</p>
      <div class="wing-editor-grid">${portalWings.map(wing => `<form class="card wing-editor" data-wing-update="${escapeHTML(wing.id)}"><div class="card-body"><div class="form-row"><div class="form-field"><label for="wing-name-${escapeHTML(wing.id)}">Wing name</label><input id="wing-name-${escapeHTML(wing.id)}" name="name" required maxlength="100" value="${escapeHTML(wing.name)}"></div><div class="form-field"><label for="wing-accent-${escapeHTML(wing.id)}">Short label</label><input id="wing-accent-${escapeHTML(wing.id)}" name="accent" required maxlength="40" value="${escapeHTML(wing.accent)}"></div></div><div class="form-field"><label for="wing-icon-${escapeHTML(wing.id)}">Icon</label><input id="wing-icon-${escapeHTML(wing.id)}" name="icon" required maxlength="8" value="${escapeHTML(wing.icon)}"></div><div class="form-field"><label for="wing-objective-${escapeHTML(wing.id)}">Description</label><textarea id="wing-objective-${escapeHTML(wing.id)}" name="objective" maxlength="500" required>${escapeHTML(wing.objective)}</textarea></div><div class="form-field"><label for="wing-activities-${escapeHTML(wing.id)}">Activities (one per line)</label><textarea id="wing-activities-${escapeHTML(wing.id)}" name="activities" maxlength="1000">${escapeHTML(wing.activities.join("\n"))}</textarea></div><button class="button button-secondary" type="submit">Save wing content</button></div></form>`).join("")}</div>
    </section></div>`;
}

const views = {
  home: renderHome,
  about: renderAbout,
  events: renderEvents,
  "core-members": renderCore,
  wings: renderWings,
  members: renderMembers,
  works: renderWorks,
  login: renderLogin,
  account: renderAccount,
  finance: renderFinance,
  admin: renderAdmin
};

export function setCurrentUser(user) {
  if (currentUser?.id === user?.id) return;
  currentUser = user;
  currentProfile = null;
  renderRoute();
}

export function setCurrentProfile(profile) {
  currentProfile = profile;
  renderRoute();
}

export function setAuthMode(mode) {
  if (["signin", "recovery", "update-password"].includes(mode)) {
    loginMode = mode;
    authFeedback = "";
    authFeedbackType = "error";
    renderRoute("login");
  }
}

export function setAuthFeedback(message, type = "error") {
  authFeedback = message;
  authFeedbackType = type;
  if (getActiveRoute() !== "login") return;
  const feedback = document.querySelector("#login-feedback");
  if (feedback) {
    feedback.textContent = message;
    feedback.classList.toggle("auth-success", type === "success");
  } else {
    renderRoute("login");
  }
}

export function setPublishedWorks(rows) {
  const presentation = {
    Article: { kind: "article", icon: "✎", image: assetPaths.article, imageAlt: "Illustrated open notebook and a red pencil" },
    Poetry: { kind: "poetry", icon: "❝", image: assetPaths.poetry, imageAlt: "Illustrated rainy morning with a soft crimson sunrise" },
    Calligraphy: { kind: "calligraphy", icon: "۞", image: assetPaths.calligraphy, imageAlt: "Original abstract calligraphy-inspired floral line art" },
    Magazine: { kind: "magazine", icon: "▤", image: assetPaths.magazine, imageAlt: "Illustrated cover of the first ADAB class magazine" }
  };
  publishedWorks = rows.map(row => ({
    id: row.id,
    title: row.title,
    author: row.author_name,
    type: row.work_type,
    excerpt: row.excerpt,
    content: row.content,
    date: new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(row.created_at)),
    ...presentation[row.work_type],
    image: row.image_url || presentation[row.work_type].image,
    imageAlt: row.image_url ? `Artwork submitted with ${row.title}` : presentation[row.work_type].imageAlt
  }));
}

export function setPortalWings(rows) {
  portalWings = rows.map(wing => ({
    id: wing.id,
    name: wing.name,
    accent: wing.accent,
    objective: wing.objective,
    activities: wing.activities || [],
    icon: wing.icon
  }));
  announcements = announcements.map(item => ({
    ...item,
    wingName: portalWings.find(wing => wing.id === item.wing_id)?.name || null
  }));
  if (["home", "wings", "admin", "account"].includes(getActiveRoute())) renderRoute();
}

export function setPortalMembers(rows) {
  if (!rows) {
    portalMembers = null;
    if (getActiveRoute() === "members") renderRoute();
    return;
  }
  portalMembers = rows.map(row => {
    const name = row.display_name || "ADAB student";
    return {
      id: row.id,
      name,
      initials: name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase(),
      roll: row.roll_number || row.id,
      house: row.house_team || "Student",
      district: row.district || "District not added",
      skills: []
    };
  });
  if (getActiveRoute() === "members") renderRoute();
}

export function setPortalEvents(rows) {
  portalEvents = rows.map(event => ({
    ...event,
    date: event.starts_at,
    status: new Date(event.starts_at).getTime() > Date.now() ? "Upcoming" : "Completed",
    time: event.time_label,
    image: assetPaths.event,
    imageAlt: "Illustrated ADAB event artwork"
  }));
  if (["home", "events"].includes(getActiveRoute())) renderRoute();
}

export function setAnnouncements(rows) {
  announcements = rows.map(item => ({
    ...item,
    wingName: portalWings.find(wing => wing.id === item.wing_id)?.name || null
  }));
  if (getActiveRoute() === "home") renderRoute();
}

export function setFinanceEntries(rows, loading = false) {
  financeEntries = rows;
  financeLoading = loading;
  if (getActiveRoute() === "finance") renderRoute();
}

export function setAdminProfiles(rows, loading = false) {
  adminProfiles = rows;
  adminLoading = loading;
  if (getActiveRoute() === "admin") renderRoute();
}

export function setReviewData(works, suggestions) {
  reviewWorks = works;
  reviewSuggestions = suggestions;
  if (getActiveRoute() === "account") renderRoute();
}

export function getActiveRoute() {
  const route = location.hash.slice(1).split("#")[0];
  return Object.hasOwn(views, route) ? route : "home";
}

export function renderRoute(route = getActiveRoute()) {
  const render = views[route] || views.home;
  root.innerHTML = render();
  root.dataset.route = route;
  document.title = `${route === "home" ? "ADAB Class Union" : `${route.replaceAll("-", " ").replace(/\b\w/g, char => char.toUpperCase())} · ADAB`}`;
  document.querySelectorAll("[data-route]").forEach(link => {
    if (link.dataset.route === route) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  const accountLink = document.querySelector(".account-nav-link");
  if (accountLink) {
    accountLink.textContent = currentUser ? "Account" : "Sign in";
    accountLink.href = currentUser ? "#account" : "#login";
    accountLink.dataset.route = currentUser ? "account" : "login";
  }
  document.querySelectorAll(".member-nav-link").forEach(link => { link.hidden = !currentProfile; });
  const adminLink = document.querySelector(".developer-nav-link");
  if (adminLink) adminLink.hidden = currentProfile?.role !== "developer";
  window.scrollTo(0, 0);
  root.focus({ preventScroll: true });
  document.dispatchEvent(new CustomEvent("adab:route-rendered", { detail: { route } }));
}

export const routeData = { coreMembers, creativeWorks, events, students };
