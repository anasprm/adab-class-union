import { coreMembers, creativeWorks, events, formatEventDate, students, wings } from "./data.js";
import { assetPaths } from "./assets.js";
import { isSupabaseConfigured } from "./supabase.js";

const root = document.querySelector("#view-root");
let currentUser = null;
let loginMode = "signin";
let authFeedback = "";
let authFeedbackType = "error";
let publishedWorks = [];

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
  const upcoming = events.filter(event => event.status === "Upcoming").sort((a, b) => new Date(a.date) - new Date(b.date));
  const flagship = upcoming.find(event => event.id === "union-fest") || upcoming[0];
  return `<section class="hero">
    <div class="hero-copy"><p class="eyebrow">Plus One · Kerala, India</p><h1 class="page-title">A class with a voice.<br>A union with a purpose.</h1>
      <p class="lead">Welcome to the digital home of ADAB Class Union — where we learn together, make things together, and build a community that includes everyone.</p>
      <div class="hero-actions"><a class="button" href="#events">Explore what’s on <span aria-hidden="true">→</span></a><a class="button button-secondary" href="#about">Meet the union</a></div>
    </div>
    <div class="hero-art" aria-hidden="true"><div class="hero-orbit"><img src="${assetPaths.logo}" alt=""></div><span class="orbit-dot orbit-dot-one">✦</span><span class="orbit-dot orbit-dot-two">⌁</span><span class="orbit-dot orbit-dot-three">◈</span></div>
  </section>
  <div class="stat-strip" aria-label="Union at a glance"><div class="stat-item"><span class="stat-number">24</span><span class="stat-label">Class members</span></div><div class="stat-item"><span class="stat-number">4</span><span class="stat-label">Student wings</span></div><div class="stat-item"><span class="stat-number">8</span><span class="stat-label">Union leaders</span></div></div>
  <div class="page-shell">
    ${flagship ? `<section class="section-block countdown-panel" aria-label="Countdown to ${escapeHTML(flagship.title)}">
      <div><p class="eyebrow">Flagship event countdown</p><h2>${escapeHTML(flagship.title)}</h2><p>${escapeHTML(formatEventDate(flagship.date))} · ${escapeHTML(flagship.venue)}</p></div>
      <div class="countdown-values" data-countdown="${escapeHTML(flagship.date)}" aria-live="off"><div class="countdown-unit"><strong data-days>--</strong><span>Days</span></div><div class="countdown-unit"><strong data-hours>--</strong><span>Hours</span></div><div class="countdown-unit"><strong data-minutes>--</strong><span>Minutes</span></div><div class="countdown-unit"><strong data-seconds>--</strong><span>Seconds</span></div></div>
    </section>` : ""}
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
  const sorted = [...events].sort((a, b) => new Date(b.date) - new Date(a.date));
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
  return `<div class="page-shell"><header><p class="eyebrow">Find your way in</p><h1 class="page-title">Four wings. Many ways to belong.</h1><p class="lead">Our student wings turn shared interests into practical, welcoming activities. Pick a starting point and bring your own perspective.</p></header>
    <section class="section-block feature-grid">${wings.map(wingCard).join("")}</section></div>`;
}

function renderMembers() {
  return `<div class="page-shell"><header><p class="eyebrow">Our class, at a glance</p><h1 class="page-title">Every name has a story.</h1><p class="lead">Find a classmate by name, roll number, house team, or district. Select a profile to see more.</p></header>
    <section class="section-block">
      <div class="filter-bar">
        <div class="search-field"><label class="sr-only" for="member-search">Search members by name or roll number</label><input id="member-search" type="search" placeholder="Search name or roll number…" autocomplete="off"><button type="button" class="search-clear" aria-label="Clear search" hidden>×</button></div>
        <label class="sr-only" for="house-filter">Filter by house team</label><select id="house-filter"><option value="">All house teams</option>${[...new Set(students.map(student => student.house))].map(house => `<option>${escapeHTML(house)}</option>`).join("")}</select>
        <label class="sr-only" for="district-filter">Filter by district</label><select id="district-filter"><option value="">All districts</option>${[...new Set(students.map(student => student.district))].sort().map(district => `<option>${escapeHTML(district)}</option>`).join("")}</select>
      </div>
      <p class="result-count" id="member-result-count" aria-live="polite"></p><div class="card-grid" id="member-grid"></div>
    </section></div>`;
}

function renderWorks() {
  const works = [...publishedWorks, ...creativeWorks];
  return `<div class="page-shell"><header><p class="eyebrow">Created in our class</p><h1 class="page-title">Ideas deserve a little space.</h1><p class="lead">Read student writing, explore creative experiments, and revisit the first pages of our class magazine.</p></header>
    <section class="section-block"><div class="card-grid">${works.map(workCard).join("")}</div></section>
    <section class="section-block"><p class="eyebrow">Add your voice</p><h2 class="section-title">Share a creative work.</h2><p class="lead">Submit your writing or artwork for review by the union council.</p>
      ${currentUser ? `<form class="contact-form" id="creative-work-form">
        <div class="form-row"><div class="form-field"><label for="work-title">Work title</label><input id="work-title" name="title" required maxlength="100"></div>
          <div class="form-field"><label for="work-author">Your name</label><input id="work-author" name="author" required maxlength="80"></div></div>
        <div class="form-row"><div class="form-field"><label for="work-type">Type of work</label><select id="work-type" name="type" required><option value="Article">Article</option><option value="Poetry">Poetry</option><option value="Calligraphy">Calligraphy</option><option value="Magazine">Magazine</option></select></div>
          <div class="form-field"><label for="work-excerpt">Short description</label><input id="work-excerpt" name="excerpt" required maxlength="180"></div></div>
        <div class="form-field"><label for="work-content">Your work</label><textarea id="work-content" name="content" required maxlength="5000"></textarea></div>
        <p class="form-note">Submitting as ${escapeHTML(currentUser.email)}. Your work will be private until approved by the union council.</p>
        <div><button class="button" type="submit">Submit for review <span aria-hidden="true">→</span></button></div>
      </form>` : `<div class="auth-required"><p>Sign in with your student account to submit work for council review.</p><a class="button" href="#login">Sign in to submit →</a></div>`}
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
          <p class="eyebrow">Student account</p>
          <h2 id="login-title">Welcome to ADAB.</h2>
          <p class="auth-description">Your student account is connected to the ADAB Union portal.</p>
          <div class="account-detail"><span>Account email</span><strong>${escapeHTML(email)}</strong></div>
          <button class="button button-secondary auth-submit" type="button" data-action="sign-out">Sign out</button>
          <a class="auth-back-link" href="#home">← Back to the union portal</a>
        </div>
      </section>
    </div>`;
  }

  const signUp = loginMode === "signup";
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
    : signUp
      ? `<p class="auth-switch">Already have an account? <button class="auth-mode-link" type="button" data-auth-mode="signin">Sign in</button></p>`
      : `<div class="auth-secondary-actions"><button class="auth-mode-link" type="button" data-auth-mode="recovery">Forgot password?</button><p class="auth-switch">New to ADAB? <button class="auth-mode-link" type="button" data-auth-mode="signup">Create an account</button></p></div>`;

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

const views = {
  home: renderHome,
  about: renderAbout,
  events: renderEvents,
  "core-members": renderCore,
  wings: renderWings,
  members: renderMembers,
  works: renderWorks,
  login: renderLogin
};

export function setCurrentUser(user) {
  if (currentUser?.id === user?.id) return;
  currentUser = user;
  if (getActiveRoute() === "login") renderRoute("login");
}

export function setAuthMode(mode) {
  if (["signin", "signup", "recovery", "update-password"].includes(mode)) {
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
    ...presentation[row.work_type]
  }));
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
  if (accountLink) accountLink.textContent = currentUser ? "Account" : "Sign in";
  window.scrollTo(0, 0);
  root.focus({ preventScroll: true });
  document.dispatchEvent(new CustomEvent("adab:route-rendered", { detail: { route } }));
}

export const routeData = { coreMembers, creativeWorks, events, students };
