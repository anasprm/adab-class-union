import {
  coreMembers,
  creativeWorks,
  events,
  formatEventDate,
  initialBudgetAllocations,
  initialFinanceEntries,
  students,
  wings
} from "./data.js";
import { assetPaths } from "./assets.js";
import { isSupabaseConfigured, supabase } from "./supabase.js";
import {
  CONTENT_SCHEMA,
  DEFAULT_CONTENT,
  getAllContent,
  getContent,
  resetContentToDefaults,
  savePortalContentKey
} from "./content.js";
import { renderMonthlyFundTracker, setMonthlyFundDirectory } from "./monthly-funds.js";
import { renderAwardPlanner } from "./award-planner.js";
import {
  authenticateDemoUser,
  getDemoAccounts,
  getDemoBudgets,
  getDemoCurrentUser,
  getDemoFinanceEntries,
  getDemoInvites,
  PRESEEDED_ACCOUNTS,
  saveDemoAccounts,
  saveDemoBudgets,
  saveDemoFinanceEntries,
  saveDemoInvites,
  setDemoCurrentUser,
  switchDemoRole
} from "./demo-accounts.js";

const root = document.querySelector("#view-root");
let currentUser = null;
let currentProfile = null;
let portalMembers = null;
let loginMode = "signin";
let authFeedback = "";
let authFeedbackType = "error";
let publishedWorks = [];
let portalWings = wings;
export let portalEvents = [];
let announcements = [];
let financeEntries = initialFinanceEntries;
let budgetAllocations = initialBudgetAllocations;
let budgetLoading = false;
let adminProfiles = PRESEEDED_ACCOUNTS;
let reviewWorks = [];
let reviewSuggestions = [];
let programPosters = [];
let financeLoading = false;
let adminLoading = false;
let adminActiveTab = "create"; // 'create', 'invites', 'roster', 'content', 'wings'
let lastCreatedAccount = null;
let financeFilterType = "all"; // 'all', 'income', 'expense'
let financeSearchQuery = "";
let contentSearchQuery = "";
let contentCategoryFilter = "all";

export const roleNames = {
  developer: "Developer",
  teacher: "Class Teacher",
  committee: "Core Committee",
  treasurer: "Treasurer",
  student: "Student",
  wing: "Wing Account"
};

export const rolesAllowedToReview = ["developer", "teacher", "committee"];
export const canManageUnion = profile => rolesAllowedToReview.includes(profile?.role);
export const canManageContent = profile => canManageUnion(profile) || profile?.role === "wing";
export const isTreasurerOrDev = profile => ["developer", "treasurer"].includes(profile?.role);
export const isVerifiedMember = profile => Boolean(profile && profile.is_active && roleNames[profile.role]);

export const formatMoney = amount =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(amount) || 0);

export const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

export const avatar = (initials, extraClass = "") =>
  `<div class="profile-avatar ${extraClass}" aria-hidden="true">${escapeHTML(initials)}</div>`;

export const emptyState = (title, message) =>
  `<div class="empty-state"><strong>${escapeHTML(title)}</strong>${escapeHTML(message)}</div>`;

export function eventCard(event) {
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
      <div class="event-meta"><span>${escapeHTML(event.time)}</span><span>${escapeHTML(event.venue)}</span></div>
      <div class="card-footer"><small>${escapeHTML(event.category)} · ${escapeHTML(formatEventDate(event.date))}</small><span class="text-link">Details →</span></div>
    </div>
  </article>`;
}

function profileCard(member) {
  const details = [member.roll, member.district].filter(Boolean).map(escapeHTML).join(" · ");
  return `<article class="card profile-card" data-member-id="${escapeHTML(member.id || "")}" tabindex="0" role="button" aria-label="View ${escapeHTML(member.name)} profile">
    <div class="card-body">${avatar(member.initials)}<div><span class="badge">${escapeHTML(member.role || "Member")}</span><h3>${escapeHTML(member.name)}</h3><p>${details}</p></div></div>
  </article>`;
}

function financeRecorder(entry) {
  return entry.created_by
    ? portalMembers?.find(member => member.id === entry.created_by)?.name || "Portal account"
    : "Treasurer account";
}

function wingCard(wing) {
  return `<article class="card feature-card wing-card-item">
    <div class="feature-icon" aria-hidden="true">${escapeHTML(wing.icon)}</div>
    <div class="card-topline" style="margin-top:16px"><span class="badge">${escapeHTML(wing.accent)}</span></div>
    <h3>${escapeHTML(wing.name)}</h3>
    <p>${escapeHTML(wing.objective)}</p>
    <ul class="activity-list">${(wing.activities || []).map(activity => `<li>${escapeHTML(activity)}</li>`).join("")}</ul>
  </article>`;
}

function workCard(work) {
  const isCode = work.type === "Code" || work.codeSnippet;
  const verifiedAuthor = work.user_id
    ? portalMembers?.find(member => member.id === work.user_id)?.name
    : null;
  return `<article class="card work-card" data-work-id="${escapeHTML(work.id)}" tabindex="0" role="button" aria-label="Read ${escapeHTML(work.title)}">
    <div class="work-art" data-kind="${escapeHTML(work.kind || "work")}" aria-hidden="true"><img src="${escapeHTML(work.image || assetPaths.article)}" alt="" loading="lazy"></div>
    <div class="card-body">
      <div class="card-topline"><span class="badge">${escapeHTML(work.type || "Article")}</span><small>${escapeHTML(work.date || "Recent")}</small></div>
      <h3>${escapeHTML(work.title)}</h3>
      <p>${escapeHTML(work.excerpt)}</p>
      ${isCode && work.codeSnippet ? `<pre class="work-code-preview"><code>${escapeHTML(work.codeSnippet.split("\n").slice(0, 4).join("\n"))}</code></pre>` : ""}
      ${work.projectUrl ? `<p class="work-link-preview"><a class="text-link" href="${escapeHTML(work.projectUrl)}" target="_blank" rel="noopener">Explore Project ↗</a></p>` : ""}
      <div class="card-footer"><small>By ${escapeHTML(verifiedAuthor || work.author_name || "Account not listed")}</small><span class="text-link">Explore →</span></div>
    </div>
  </article>`;
}

function renderHome() {
  const allEvents = [...portalEvents, ...events];
  const upcoming = allEvents.filter(event => event.status === "Upcoming").sort((a, b) => new Date(a.date) - new Date(b.date));
  const flagship = upcoming.find(event => event.id === "union-fest") || upcoming[0];
  const allWorks = [...publishedWorks, ...creativeWorks];
  const bannerActive = getContent("hero_banner_active") === "true";

  return `
  ${bannerActive ? `<div class="announcement-banner" role="banner"><div class="announcement-banner-content"><span class="banner-pill">Notice</span> <span>${escapeHTML(getContent("hero_banner_text"))}</span></div></div>` : ""}
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">${escapeHTML(getContent("hero_eyebrow"))}</p>
      <h1 class="page-title">${escapeHTML(getContent("hero_title")).replaceAll("\n", "<br>")}</h1>
      <p class="lead">${escapeHTML(getContent("hero_lead"))}</p>
      <div class="hero-actions">
        <a class="button" href="#events">${escapeHTML(getContent("hero_cta_primary"))}</a>
        <a class="button button-secondary" href="#about">${escapeHTML(getContent("hero_cta_secondary"))}</a>
      </div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="hero-orbit"><img src="${assetPaths.logo}" alt="ADAB Logo"></div>
    </div>
  </section>
  <div class="stat-strip" aria-label="Union at a glance">
    <div class="stat-item"><span class="stat-number">24</span><span class="stat-label">Class members</span></div>
    <div class="stat-item"><span class="stat-number">${portalWings.length}</span><span class="stat-label">Dedicated wings</span></div>
    <div class="stat-item"><span class="stat-number">8</span><span class="stat-label">Union leaders</span></div>
  </div>
  <div class="page-shell">
    ${flagship ? `<section class="section-block countdown-panel" aria-label="Countdown to ${escapeHTML(flagship.title)}">
      <div><p class="eyebrow">Flagship event countdown</p><h2>${escapeHTML(flagship.title)}</h2><p>${escapeHTML(formatEventDate(flagship.date))} · ${escapeHTML(flagship.venue)}</p></div>
      <div class="countdown-values" data-countdown="${escapeHTML(flagship.date)}" aria-live="off"><div class="countdown-unit"><strong data-days>--</strong><span>Days</span></div><div class="countdown-unit"><strong data-hours>--</strong><span>Hours</span></div><div class="countdown-unit"><strong data-minutes>--</strong><span>Minutes</span></div><div class="countdown-unit"><strong data-seconds>--</strong><span>Seconds</span></div></div>
    </section>` : ""}

    ${announcements.length ? `<section class="section-block"><div class="section-heading"><div><p class="eyebrow">From the union</p><h2 class="section-title">Latest announcements</h2></div></div><div class="card-grid">${announcements.slice(0, 3).map(item => `<article class="card"><div class="card-body"><div class="card-topline"><span class="badge">${escapeHTML(item.wingName || "Union notice")}</span><small>${escapeHTML(new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(item.created_at || Date.now())))}</small></div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.message)}</p></div></article>`).join("")}</div></section>` : ""}

    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">${escapeHTML(getContent("events_eyebrow"))}</p><h2 class="section-title">${escapeHTML(getContent("events_title"))}</h2></div><a class="text-link" href="#events">All events →</a></div>
      <div class="card-grid">${upcoming.slice(0, 3).map(eventCard).join("") || emptyState("No upcoming events yet", "Check back soon for the next class gathering.")}</div>
    </section>

    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">${escapeHTML(getContent("wings_eyebrow"))}</p><h2 class="section-title">${escapeHTML(getContent("wings_title"))}</h2></div><a class="text-link" href="#wings">Explore all wings →</a></div>
      <div class="card-grid">${portalWings.slice(0, 3).map(wingCard).join("")}</div>
    </section>

    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">${escapeHTML(getContent("works_eyebrow"))}</p><h2 class="section-title">${escapeHTML(getContent("works_title"))}</h2></div><a class="text-link" href="#works">Explore student works →</a></div>
      <div class="card-grid">${allWorks.slice(0, 3).map(workCard).join("")}</div>
    </section>

    <section class="section-block" id="suggestions">
      <div class="section-heading"><div><p class="eyebrow">Your voice matters</p><h2 class="section-title">Have an idea for the union?</h2></div><p>Share a suggestion, a question, or something you’d love to see happen.</p></div>
      ${suggestionForm()}
    </section>
  </div>`;
}

function suggestionForm() {
  if (!currentUser) {
    return `<div class="auth-required"><p>Sign in with your student account to send a suggestion to the union council.</p><a class="button" href="#login">Sign in to continue →</a></div>`;
  }
  return `<form class="contact-form" id="suggestion-form">
    <div class="form-field"><label for="suggestion-message">Your suggestion</label><textarea id="suggestion-message" name="message" required minlength="5" maxlength="2000" placeholder="Type your suggestion or feedback for the union council..."></textarea></div>
    <p class="form-note">Sending as <strong>${escapeHTML(currentUser.email)}</strong>. Stored securely for council review.</p>
    <div><button class="button" type="submit">Send suggestion <span aria-hidden="true">→</span></button></div>
  </form>`;
}

function renderAbout() {
  return `<div class="page-shell">
    <header>
      <p class="eyebrow">${escapeHTML(getContent("about_eyebrow"))}</p>
      <h1 class="page-title">${escapeHTML(getContent("about_title"))}</h1>
      <p class="lead">${escapeHTML(getContent("about_lead"))}</p>
    </header>
    <section class="section-block about-grid">
      <div class="about-copy">
        <h2 class="section-title">${escapeHTML(getContent("about_heading"))}</h2>
        <p>${escapeHTML(getContent("about_body_1"))}</p>
        <p>${escapeHTML(getContent("about_body_2"))}</p>
      </div>
      <aside class="about-note">
        <strong>${escapeHTML(getContent("about_promise_title"))}</strong>
        <p>${escapeHTML(getContent("about_promise_text"))}</p>
      </aside>
    </section>
    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">The people behind it</p><h2 class="section-title">A student-led team</h2></div><a class="text-link" href="#core-members">Meet the full leadership →</a></div>
      <div class="card-grid">${coreMembers.slice(0, 3).map(profileCard).join("")}</div>
    </section>
    <section class="section-block">
      <p class="eyebrow">Say hello</p>
      <h2 class="section-title">Bring your idea to the table.</h2>
      <p class="lead">The best union activities often begin with a small suggestion. Tell us what would make class life more meaningful for you.</p>
      ${suggestionForm()}
    </section>
  </div>`;
}

function renderPrograms() {
  const programsList = programPosters.map(item => ({
    id: item.id,
    title: item.title,
    wing: portalWings.find(wing => wing.id === item.wing_id)?.name || item.category || "Union Program",
    author: portalMembers?.find(member => member.id === item.created_by)?.name || null,
    venue: item.venue,
    date: item.time_label,
    image: item.poster_url,
    video: item.video_url || null,
    likes: 0,
    comments: [],
    caption: item.description,
    result: [
      item.first_prize && { position: "1st Prize", recipient: item.first_prize },
      item.second_prize && { position: "2nd Prize", recipient: item.second_prize },
      item.third_prize && { position: "3rd Prize", recipient: item.third_prize }
    ].filter(Boolean)
  })).map(program => ({ ...program, hasResult: program.result.length > 0 }));
  const posterPrograms = programsList.filter(program => !program.video);
  const videoPrograms = programsList.filter(program => program.video);
  const renderProgramCards = programs => programs.map(prog => `
        <article class="ig-post-card program-card" data-post-id="${escapeHTML(prog.id)}" aria-label="${escapeHTML(prog.title)} ${prog.video ? "video reel" : "poster"}">
          <div class="ig-card-inner">
            <div class="ig-card-front">
              <div class="ig-media-area">
                ${prog.video
                  ? `<video class="program-reel-video" src="${escapeHTML(prog.video)}" autoplay muted loop playsinline preload="metadata" aria-label="${escapeHTML(prog.title)} video"></video>`
                  : prog.image
                    ? `<img src="${escapeHTML(prog.image)}" alt="${escapeHTML(prog.title)}" loading="lazy">`
                    : `<div class="program-media-placeholder" role="img" aria-label="Poster unavailable for ${escapeHTML(prog.title)}">Poster unavailable</div>`}
                <div class="program-poster-overlay">
                  <span class="program-poster-category">${escapeHTML(prog.wing)}</span>
                  <strong>${escapeHTML(prog.title)}</strong>
                  <small>${escapeHTML(prog.date)} · ${escapeHTML(prog.venue)}</small>
                  ${prog.author ? `<small>By ${escapeHTML(prog.author)}</small>` : ""}
                  ${prog.video ? `<span class="program-media-kind">Video reel</span>` : ""}
                  ${prog.hasResult ? `<button type="button" class="program-result-trigger" data-action="flip-card">View 1st–3rd prizes</button>` : ""}
                </div>
              </div>
            </div>

            <div class="ig-card-back">
              <div class="ig-result-header">
                <h3 class="ig-result-title">${escapeHTML(prog.title)} · Results</h3>
                <button type="button" class="icon-button modal-close" data-action="flip-card" aria-label="Flip back">×</button>
              </div>
              <div class="ig-result-content">
                <ol class="program-prize-list">
                  ${prog.result.map(prize => `<li class="program-prize-row"><span class="ig-winner-badge">${escapeHTML(prize.position)}</span><strong>${escapeHTML(prize.recipient || "")}</strong></li>`).join("")}
                </ol>
              </div>
              <div class="ig-result-footer">
                <small>Published program results</small>
                <button type="button" class="text-link" data-action="flip-card">← Back to poster</button>
              </div>
            </div>
          </div>
        </article>`).join("");
  const canPublishProgram = currentProfile?.is_active
    && ["developer", "committee", "wing"].includes(currentProfile.role);
  const assignedWing = portalWings.find(wing => wing.id === currentProfile?.wing_id);
  const wingField = currentProfile?.role === "wing"
    ? `<input type="hidden" name="wing_id" value="${escapeHTML(currentProfile.wing_id)}"><p class="form-note">Posting for <strong>${escapeHTML(assignedWing?.name || "your assigned wing")}</strong>.</p>`
    : `<div class="form-field">
        <label for="program-wing">Publishing wing</label>
        <select id="program-wing" name="wing_id">
          <option value="">Union-wide program</option>
          ${portalWings.map(wing => `<option value="${escapeHTML(wing.id)}">${escapeHTML(wing.name)}</option>`).join("")}
        </select>
      </div>`;

  return `<div class="page-shell programs-page">
    <header>
      <p class="eyebrow">Program archive</p>
      <h1 class="page-title">Programs</h1>
      <p class="lead">Browse program posters, video reels, and published competition results.</p>
    </header>

    <div class="program-grid-tabs" role="tablist" aria-label="Program media">
      <button class="program-grid-tab is-active" id="program-posters-tab" type="button" role="tab" aria-selected="true" aria-controls="program-posters-panel" data-program-tab="poster">Posters <span>${posterPrograms.length}</span></button>
      <button class="program-grid-tab" id="program-videos-tab" type="button" role="tab" tabindex="-1" aria-selected="false" aria-controls="program-videos-panel" data-program-tab="video">Videos <span>${videoPrograms.length}</span></button>
    </div>
    <section class="section-block program-tab-panel" id="program-posters-panel" role="tabpanel" aria-labelledby="program-posters-tab" data-program-panel="poster">
      <div class="ig-feed-grid">
        ${renderProgramCards(posterPrograms)}
      </div>
      ${posterPrograms.length ? "" : `<div class="program-empty-state"><strong>No posters yet</strong><p>Published program posters will appear here.</p></div>`}
    </section>
    <section class="section-block program-tab-panel" id="program-videos-panel" role="tabpanel" aria-labelledby="program-videos-tab" data-program-panel="video" hidden>
      <div class="ig-feed-grid">
        ${renderProgramCards(videoPrograms)}
      </div>
      ${videoPrograms.length ? "" : `<div class="program-empty-state"><strong>No videos yet</strong><p>Published program videos will appear here.</p></div>`}
    </section>
    ${canPublishProgram ? `
    <section class="section-block program-publisher">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Developer · Core Committee · Wing Accounts</p>
          <h2 class="section-title" id="program-publisher-title">Publish a poster</h2>
          <p class="lead" id="program-publisher-lead">Add a poster and the recipients for 1st, 2nd, and 3rd prize.</p>
        </div>
      </div>
      <form class="contact-form" id="program-poster-form">
        <div class="form-row">
          <div class="form-field"><label for="program-title">Program title</label><input id="program-title" name="title" required maxlength="120"></div>
          <div class="form-field">
            <label for="program-category">Category</label>
            <select id="program-category" name="category" required>
              <option value="Academic">Academic</option>
              <option value="Cultural">Cultural</option>
              <option value="Sports">Sports</option>
              <option value="Arts">Arts</option>
              <option value="Social">Social</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-field"><label for="program-date">Program date and time</label><input id="program-date" name="starts_at" type="datetime-local" required></div>
          <div class="form-field"><label for="program-time-label">Time shown on poster card</label><input id="program-time-label" name="time_label" required maxlength="80" placeholder="e.g. 10:00 AM – 1:00 PM"></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label for="program-venue">Venue</label><input id="program-venue" name="venue" required maxlength="120"></div>
          ${wingField}
        </div>
        <div class="form-field"><label for="program-description">Description</label><textarea id="program-description" name="description" required maxlength="1000"></textarea></div>
        <div class="form-field">
          <label id="program-media-label" for="program-media">Poster image</label>
          <input id="program-media" name="media" type="file" accept="image/jpeg,image/png,image/webp" required>
          <input id="program-media-kind" name="media_kind" type="hidden" value="poster">
          <small class="form-note" id="program-media-hint">Upload a JPEG, PNG, or WebP poster up to 10 MB.</small>
        </div>
        <fieldset class="program-prize-fields">
          <legend>Program results</legend>
          <div class="form-row">
            <div class="form-field"><label for="program-first-prize">1st prize recipient / team</label><input id="program-first-prize" name="first_prize" required maxlength="120"></div>
            <div class="form-field"><label for="program-second-prize">2nd prize recipient / team</label><input id="program-second-prize" name="second_prize" required maxlength="120"></div>
            <div class="form-field"><label for="program-third-prize">3rd prize recipient / team</label><input id="program-third-prize" name="third_prize" required maxlength="120"></div>
          </div>
        </fieldset>
        <button class="button" id="program-publish-button" type="submit">Publish poster and results</button>
      </form>
    </section>` : ""}
  </div>`;
}

function renderEvents() {
  const allEvents = [...portalEvents, ...events].sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcoming = allEvents.filter(e => e.status === "Upcoming");
  const past = allEvents.filter(e => e.status === "Completed");

  const canCreate = currentProfile && ["developer", "committee", "wing"].includes(currentProfile.role);

  return `<div class="page-shell">
    <header>
      <p class="eyebrow">${escapeHTML(getContent("events_eyebrow"))}</p>
      <h1 class="page-title">${escapeHTML(getContent("events_title"))}</h1>
      <p class="lead">${escapeHTML(getContent("events_lead"))}</p>
    </header>

    <div class="event-tabs" role="tablist">
      <button type="button" class="event-tab-btn is-active" data-event-tab="upcoming" role="tab" aria-selected="true">Upcoming Events (${upcoming.length})</button>
      <button type="button" class="event-tab-btn" data-event-tab="past" role="tab" aria-selected="false">Past Events Archive (${past.length})</button>
    </div>

    <section class="section-block" id="events-list-container">
      <div class="card-grid" id="event-grid">
        ${upcoming.map(eventCard).join("") || emptyState("No upcoming events", "Check back soon for new scheduled activities.")}
      </div>
    </section>

    ${canCreate ? `
    <section class="section-block event-create-box">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Committee & Wing Management</p>
          <h2 class="section-title">Schedule a new event</h2>
        </div>
      </div>
      <form class="contact-form" id="create-event-form">
        <div class="form-row">
          <div class="form-field"><label for="ev-title">Event Title</label><input id="ev-title" name="title" required maxlength="100" placeholder="e.g. Inter-House Debate Championship"></div>
          <div class="form-field">
            <label for="ev-category">Category</label>
            <select id="ev-category" name="category" required>
              <option value="Academic">Academic</option>
              <option value="Cultural">Cultural</option>
              <option value="Sports">Sports</option>
              <option value="Social">Social</option>
              <option value="Flagship">Flagship</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="ev-status">Classification</label>
            <select id="ev-status" name="status" required>
              <option value="Upcoming">Upcoming Event</option>
              <option value="Completed">Past Event / Archive</option>
            </select>
          </div>
          <div class="form-field"><label for="ev-date">Date & Time</label><input id="ev-date" name="date" type="datetime-local" required></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label for="ev-venue">Venue</label><input id="ev-venue" name="venue" required maxlength="100" placeholder="e.g. Main Auditorium"></div>
          <div class="form-field"><label for="ev-time">Time Label</label><input id="ev-time" name="time" required maxlength="50" placeholder="e.g. 10:00 AM – 1:00 PM"></div>
        </div>
        <div class="form-field"><label for="ev-desc">Description</label><textarea id="ev-desc" name="description" required maxlength="500" placeholder="Describe the event objectives and schedule..."></textarea></div>
        <button class="button" type="submit">Publish Event to Schedule <span aria-hidden="true">→</span></button>
      </form>
    </section>` : `
    <section class="section-block" style="text-align: center; padding: 24px; border: 1px dashed var(--border-color); border-radius: var(--radius);">
      <p class="form-note">Event creation is restricted to Core Committee and Wing Account holders. Switch your role above to test creating events.</p>
    </section>`}
  </div>`;
}

function renderCore() {
  const members = coreMembers.flatMap(member => {
    const account = portalMembers?.find(student => student.roll === member.roll);
    return account ? [{ ...member, id: account.id, name: account.name, district: account.district }] : [];
  });
  return `<div class="page-shell">
    <header>
      <p class="eyebrow">Student leadership</p>
      <h1 class="page-title">Meet the core team.</h1>
      <p class="lead">Four core leaders, one shared commitment: making the union a welcoming place to learn, contribute, and belong.</p>
    </header>
    <section class="section-block">${members.length
      ? `<div class="card-grid">${members.map(profileCard).join("")}</div>`
      : emptyState("Student accounts are not available", "The core team will appear here when the active student directory is available.")}</section>
  </div>`;
}

function renderWings() {
  return `<div class="page-shell">
    <header>
      <p class="eyebrow">${escapeHTML(getContent("wings_eyebrow"))}</p>
      <h1 class="page-title">${escapeHTML(getContent("wings_title"))}</h1>
      <p class="lead">${escapeHTML(getContent("wings_lead"))}</p>
    </header>
    <section class="section-block feature-grid">${portalWings.map(wingCard).join("")}</section>
  </div>`;
}

function renderMembers() {
  const directory = (portalMembers || []).filter(student => student.role === "student");
  return `<div class="page-shell">
    <header>
      <p class="eyebrow">Our class, at a glance</p>
      <h1 class="page-title">Every name has a story.</h1>
      <p class="lead">Find a classmate by name, roll number, house team, or district. Select a profile to see details.</p>
    </header>
    <section class="section-block">
      <div class="filter-bar">
        <div class="search-field"><label class="sr-only" for="member-search">Search members by name or roll number</label><input id="member-search" type="search" placeholder="Search name or roll number…" autocomplete="off"><button type="button" class="search-clear" aria-label="Clear search" hidden>×</button></div>
        <label class="sr-only" for="house-filter">Filter by house team</label><select id="house-filter"><option value="">All house teams</option>${[...new Set(directory.map(student => student.house).filter(Boolean))].map(house => `<option>${escapeHTML(house)}</option>`).join("")}</select>
        <label class="sr-only" for="district-filter">Filter by district</label><select id="district-filter"><option value="">All districts</option>${[...new Set(directory.map(student => student.district).filter(Boolean))].sort().map(district => `<option>${escapeHTML(district)}</option>`).join("")}</select>
      </div>
      <p class="result-count" id="member-result-count" aria-live="polite"></p>
      <div class="card-grid" id="member-grid"></div>
      ${directory.length ? "" : `<p class="form-note">Active student accounts will appear here when the directory is available.</p>`}
    </section>
  </div>`;
}

function renderWorks() {
  const works = [...publishedWorks, ...creativeWorks];
  return `<div class="page-shell">
    <header>
      <p class="eyebrow">${escapeHTML(getContent("works_eyebrow"))}</p>
      <h1 class="page-title">${escapeHTML(getContent("works_title"))}</h1>
      <p class="lead">${escapeHTML(getContent("works_lead"))}</p>
    </header>
    <section class="section-block">
      <div class="card-grid">${works.map(workCard).join("")}</div>
    </section>
    <section class="section-block">
      <p class="eyebrow">Work upload portal</p>
      <h2 class="section-title">Submit your creative or technical work.</h2>
      <p class="lead">Submit an article, poem, calligraphy, visual art, science project, or software code for union review.</p>
      ${currentProfile ? `
      <form class="contact-form" id="creative-work-form">
        <div class="form-row">
          <div class="form-field"><label for="work-title">Work title</label><input id="work-title" name="title" required maxlength="100" placeholder="e.g. Horizons of Hope"></div>
          <div class="form-field"><label for="work-author">Your account name</label><input id="work-author" name="author" readonly required maxlength="80" value="${escapeHTML(currentProfile.display_name || "")}"></div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="work-type">Category of work</label>
            <select id="work-type" name="type" required>
              <option value="Article">Article (Essay, reflection)</option>
              <option value="Poetry">Poetry</option>
              <option value="Calligraphy">Calligraphy</option>
              <option value="Art">Visual Art (Painting, Illustration)</option>
              <option value="Project">Science / Tech Project</option>
              <option value="Code">Code / Software Experiment</option>
              <option value="Magazine">Magazine Entry</option>
            </select>
          </div>
          <div class="form-field"><label for="work-excerpt">Short description / summary</label><input id="work-excerpt" name="excerpt" required maxlength="180" placeholder="Brief summary of your piece..."></div>
        </div>
        <div class="form-field" id="work-url-field">
          <label for="work-url">Project demo or repository URL (optional)</label>
          <input id="work-url" name="project_url" type="url" placeholder="https://github.com/..." maxlength="500">
        </div>
        <div class="form-field">
          <label for="work-content">Full text or code snippet</label>
          <textarea id="work-content" name="content" required maxlength="5000" placeholder="Type or paste your work, essay, poem, or code here..."></textarea>
        </div>
        <div class="form-field">
          <label for="work-image">Artwork image or PDF attachment (optional)</label>
          <input id="work-image" name="attachment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf">
          <small class="form-note">PNG, JPG, WebP, or PDF up to 10 MB. Submissions remain private until published by reviewers.</small>
        </div>
        <p class="form-note">Submitting as <strong>${escapeHTML(currentUser.email)}</strong>. Your work will be queued for union moderator review.</p>
        <div><button class="button" type="submit">Submit for review <span aria-hidden="true">→</span></button></div>
      </form>` : `
      <div class="auth-required">
        <p>${currentUser ? "Your account needs an active portal role before submitting works." : "Sign in with your student account to submit works to the union portal."}</p>
        <a class="button" href="#${currentUser ? "account" : "login"}">${currentUser ? "Check account status →" : "Sign in to submit →"}</a>
      </div>`}
    </section>
  </div>`;
}

function renderFinance() {
  // STRICT ACCESS CONTROL: Completely inaccessible to unauthenticated visitors
  if (!currentUser || !currentProfile || !currentProfile.is_active) {
    return `<div class="page-shell">
      <div class="restricted-gate-card">
        <span class="badge badge-restricted">Confidential Financial Ledger</span>
        <h1 class="page-title">Restricted to authenticated members.</h1>
        <p class="lead">The ADAB Senior Secondary Class Union financial ledger contains sensitive student dues, itemized expenditures, receipts, and treasury balances. In compliance with union policy, this page is strictly restricted to verified, signed-in class accounts.</p>
        <div class="gate-actions">
          <a class="button" href="#login">Sign in to access ledger →</a>
          <button class="button button-secondary" type="button" data-action="open-demo-switcher">Preview using demo accounts</button>
        </div>
      </div>
    </div>`;
  }

  const canEdit = isTreasurerOrDev(currentProfile);
  const activeEntries = financeEntries || [];
  let filtered = activeEntries;
  if (financeFilterType !== "all") {
    filtered = filtered.filter(e => e.entry_type === financeFilterType);
  }
  if (financeSearchQuery.trim()) {
    const q = financeSearchQuery.toLowerCase();
    filtered = filtered.filter(e =>
      (e.category && e.category.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      financeRecorder(e).toLowerCase().includes(q)
    );
  }

  const income = activeEntries.filter(e => e.entry_type === "income").reduce((acc, e) => acc + Number(e.amount), 0);
  const expenses = activeEntries.filter(e => e.entry_type === "expense").reduce((acc, e) => acc + Number(e.amount), 0);
  const balance = income - expenses;

  return `<div class="page-shell">
    <header>
      <div class="finance-header-badge-row">
        <span class="badge">${escapeHTML(roleNames[currentProfile.role] || "Member")}</span>
        <span class="badge badge-verified">Verified Union Member</span>
      </div>
      <p class="eyebrow">${escapeHTML(getContent("finance_eyebrow"))}</p>
      <h1 class="page-title">${escapeHTML(getContent("finance_title"))}</h1>
      <p class="lead">${escapeHTML(getContent("finance_lead"))}</p>
    </header>

    <!-- Public Ledger View (Authenticated Only) -->
    <section class="section-block finance-summary">
      <article class="finance-stat-card">
        <span>Total Collected Funds</span>
        <strong class="stat-green">${formatMoney(income)}</strong>
        <small class="stat-subtitle">From student dues, sponsorships & PTA</small>
      </article>
      <article class="finance-stat-card">
        <span>Total Expenditures</span>
        <strong class="stat-red">${formatMoney(expenses)}</strong>
        <small class="stat-subtitle">Authorized events, sports & magazines</small>
      </article>
      <article class="finance-stat-card">
        <span>Net Treasury Balance</span>
        <strong class="stat-accent">${formatMoney(balance)}</strong>
        <small class="stat-subtitle">Available in union treasury</small>
      </article>
    </section>

    <!-- Budget Allocations View -->
    <section class="section-block">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Budget allocations</p>
          <h2 class="section-title">Class budget utilization</h2>
          ${canEdit ? `<p>Update category limits from the treasury desk.</p>` : ""}
        </div>
      </div>
      ${budgetLoading
        ? emptyState("Loading budgets", "Retrieving the current category allocations.")
        : (budgetAllocations || []).length
          ? `<div class="budget-allocation-grid">
        ${(budgetAllocations || []).map((b, index) => {
          const spent = activeEntries
            .filter(entry => entry.entry_type === "expense" && entry.category === b.category)
            .reduce((sum, entry) => sum + Number(entry.amount), 0);
          const allocated = Number(b.allocated_amount ?? b.allocated ?? 0);
          const pct = allocated > 0
            ? Math.min(100, Math.round((spent / allocated) * 100))
            : spent > 0 ? 100 : 0;
          const inputId = `budget-allocation-${index}`;
          return `<div class="budget-card">
            <div class="budget-card-header">
              <strong>${escapeHTML(b.category)}</strong>
              <span>${pct}% used</span>
            </div>
            <div class="budget-progress-track">
              <div class="budget-progress-bar ${pct > 85 ? "progress-warning" : ""}" style="width: ${pct}%"></div>
            </div>
            <div class="budget-card-footer">
              <small>Spent: ${formatMoney(spent)}</small>
              <small>Budget: ${formatMoney(allocated)}</small>
            </div>
            ${canEdit ? `<form class="budget-edit-form" data-budget-category="${escapeHTML(b.category)}">
              <label class="sr-only" for="${inputId}">Budget allocation for ${escapeHTML(b.category)}</label>
              <div class="budget-edit-controls">
                <input id="${inputId}" name="allocated_amount" type="number" min="0" max="9999999999.99" step="0.01" value="${allocated}" required>
                <button class="button button-secondary" type="submit">Save budget</button>
              </div>
            </form>` : ""}
          </div>`;
        }).join("")}
      </div>`
          : emptyState("No budgets available", "Category allocations will appear here when they are configured.")}
    </section>

    <!-- Monthly Fund Tracker & Student Dues Management -->
    ${renderMonthlyFundTracker(currentProfile)}

    <!-- Treasurer Control View (Treasurer & Developer Only) -->
    ${canEdit ? `
    <section class="section-block treasurer-control-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Treasurer management desk</p>
          <h2 class="section-title">Record a new ledger transaction</h2>
        </div>
      </div>
      <form class="contact-form" id="finance-form">
        <div class="form-row">
          <div class="form-field">
            <label for="finance-type">Transaction type</label>
            <select id="finance-type" name="entry_type">
              <option value="income">Income (+) Cash In</option>
              <option value="expense">Expense (-) Cash Out</option>
            </select>
          </div>
          <div class="form-field">
            <label for="finance-amount">Amount (INR)</label>
            <input id="finance-amount" name="amount" type="number" min="0.01" step="0.01" required placeholder="e.g. 5000.00">
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="finance-category">Category</label>
            <select id="finance-category" name="category" required>
              <option value="Student Union Dues">Student Union Dues</option>
              <option value="Alumni Sponsorship">Alumni Sponsorship</option>
              <option value="PTA Special Contribution">PTA Special Contribution</option>
              <option value="Events & Festivities">Events & Festivities</option>
              <option value="Sports Equipment & Meets">Sports Equipment & Meets</option>
              <option value="Arts & Creative Showcase">Arts & Creative Showcase</option>
              <option value="Literary & Class Magazine">Literary & Class Magazine</option>
              <option value="Tech & Digital Infrastructure">Tech & Digital Infrastructure</option>
              <option value="Refreshments & Hospitality">Refreshments & Hospitality</option>
              <option value="General Administration">General Administration</option>
            </select>
          </div>
          <div class="form-field">
            <label for="finance-date">Transaction date</label>
            <input id="finance-date" name="occurred_on" type="date" required value="${new Date().toISOString().slice(0, 10)}">
          </div>
        </div>
        <div class="form-field">
          <label for="finance-description">Itemized transaction details</label>
          <textarea id="finance-description" name="description" required maxlength="500" placeholder="Payee name, purpose, voucher reference number..."></textarea>
        </div>
        <div class="form-field">
          <label for="finance-file">Supporting invoice or receipt document (optional PDF/image)</label>
          <input id="finance-file" name="attachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp">
          <small class="form-note">PDF, JPG, or PNG up to 10 MB. Encrypted in private ledger storage.</small>
        </div>
        <button class="button" type="submit">Record to official ledger <span aria-hidden="true">→</span></button>
      </form>
    </section>` : ""}

    <!-- Itemized Ledger View -->
    <section class="section-block">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Audited transaction records</p>
          <h2 class="section-title">Itemized ledger entries</h2>
        </div>
      </div>
      <div class="filter-bar">
        <div class="search-field">
          <label class="sr-only" for="ledger-search">Search transactions</label>
          <input id="ledger-search" type="search" placeholder="Search by details, category, or recorder…" value="${escapeHTML(financeSearchQuery)}">
        </div>
        <select id="ledger-type-filter">
          <option value="all" ${financeFilterType === "all" ? "selected" : ""}>All transactions</option>
          <option value="income" ${financeFilterType === "income" ? "selected" : ""}>Income only</option>
          <option value="expense" ${financeFilterType === "expense" ? "selected" : ""}>Expenses only</option>
        </select>
      </div>

      ${financeLoading ? emptyState("Loading ledger entries", "Retrieving the latest finance records.") : filtered.length ? `
      <div class="ledger-table-wrapper">
        <table class="ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Details & Payee</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Receipt</th>
              ${canEdit ? `<th>Actions</th>` : ""}
            </tr>
          </thead>
          <tbody>
            ${filtered.map(entry => `
            <tr>
              <td><small>${escapeHTML(entry.occurred_on || "")}</small></td>
              <td><span class="badge ${entry.entry_type === "income" ? "badge-income" : "badge-expense"}">${escapeHTML(entry.category || "General")}</span></td>
              <td>
                <strong>${escapeHTML(entry.description || "")}</strong>
                <div class="text-muted"><small>Recorded by: ${escapeHTML(financeRecorder(entry))}</small></div>
              </td>
              <td><span class="badge ${entry.entry_type === "income" ? "badge-income" : "badge-expense"}">${entry.entry_type === "income" ? "+ Income" : "- Expense"}</span></td>
              <td class="${entry.entry_type === "income" ? "text-income" : "text-expense"}"><strong>${entry.entry_type === "income" ? "+" : "-"}${formatMoney(entry.amount)}</strong></td>
              <td>
                ${entry.attachment_path || entry.attachment_name ? `<button type="button" class="text-link" data-view-receipt="${escapeHTML(entry.attachment_path || entry.attachment_name)}">View receipt</button>` : `<span class="text-muted">None</span>`}
              </td>
              ${canEdit ? `
              <td>
                <div class="table-actions">
                  <button type="button" class="button-icon-del" data-finance-delete="${escapeHTML(entry.id)}" aria-label="Delete entry">Delete</button>
                </div>
              </td>` : ""}
            </tr>`).join("")}
          </tbody>
        </table>
      </div>` : emptyState("No transactions found", "No financial entries match your active filters.")}
    </section>
  </div>`;
}

function renderLogin() {
  if (currentUser && loginMode !== "update-password") {
    const email = currentUser.email || "";
    const initials = email.slice(0, 2).toUpperCase();
    return `<div class="auth-shell">
      <section class="auth-card auth-card-account">
        <div class="auth-aside">
          <a class="brand brand-auth" href="#home"><img src="${assetPaths.logo}" alt="" width="42" height="42"><span><strong>ADAB</strong><small>CLASS UNION</small></span></a>
          <div class="auth-aside-copy"><p class="eyebrow">Authenticated Member</p><h1>Connected to ADAB Portal.</h1><p>Active authenticated session for ${escapeHTML(email)}.</p></div>
          <p class="auth-aside-note">RBAC SESSION ACTIVE</p>
        </div>
        <div class="auth-content">
          <div class="account-avatar" aria-hidden="true">${escapeHTML(initials)}</div>
          <p class="eyebrow">${escapeHTML(currentProfile ? roleNames[currentProfile.role] : "Member Access")}</p>
          <h2 id="login-title">Welcome back, ${escapeHTML(currentProfile?.display_name || "Member")}.</h2>
          <p class="auth-description">Your authenticated role grants access to class announcements, private finance records, and student portals.</p>
          <div class="account-detail">
            <span>Account email</span><strong>${escapeHTML(email)}</strong>
            <span>Assigned role</span><strong>${escapeHTML(currentProfile ? roleNames[currentProfile.role] : "Pending Role")}</strong>
          </div>
          <div class="account-action-buttons">
            <a class="button auth-submit" href="#account">Open your role dashboard</a>
            <a class="button button-secondary auth-submit" href="#finance">Open private finance page</a>
            ${currentProfile?.role === "developer" ? `<a class="button button-secondary auth-submit" href="#admin">Open developer admin portal</a>` : ""}
            <button class="button button-secondary auth-submit" type="button" data-action="sign-out">Sign out of account</button>
          </div>
          <a class="auth-back-link" href="#home">← Back to union homepage</a>
        </div>
      </section>
    </div>`;
  }

  const recovery = loginMode === "recovery";
  const updatePassword = loginMode === "update-password";
  const heading = recovery ? "Reset your password." : updatePassword ? "Choose a new password." : "Sign in to ADAB.";
  const intro = recovery
    ? "We’ll email you a secure link to reset your account password."
    : updatePassword
      ? "Choose a secure password with at least 8 characters."
      : "Enter your registered class union credentials to access member features.";

  return `<div class="auth-shell">
    <section class="auth-card">
      <aside class="auth-aside">
        <a class="brand brand-auth" href="#home"><img src="${assetPaths.logo}" alt="" width="42" height="42"><span><strong>ADAB</strong><small>CLASS UNION</small></span></a>
        <div class="auth-aside-copy">
          <p class="eyebrow">Member portal</p>
          <h1>A place for every voice.</h1>
          <p>Strict role-based access for Developer, Teacher, Core Committee, Treasurer, Students, and Wings.</p>
        </div>
        <p class="auth-aside-note">LEARN TOGETHER · GROW TOGETHER</p>
      </aside>
      <div class="auth-content">
        <img class="auth-lockup" src="${assetPaths.lockup}" alt="ADAB — Association for Development and Progress" width="150" height="150">
        <p class="eyebrow">Portal access</p>
        <h2 id="login-title">${heading}</h2>
        <p class="auth-description">${intro}</p>
        <form class="auth-form" id="login-form" data-auth-mode="${loginMode}">
          ${!updatePassword ? `<div class="form-field"><label for="login-email">Username or email</label><input id="login-email" name="email" type="text" autocomplete="username" placeholder="e.g. anasprm" maxlength="254" required></div>` : ""}
          ${!recovery ? `<div class="form-field"><label for="login-password">${updatePassword ? "New password" : "Password"}</label>
            <div class="password-input"><input id="login-password" name="password" type="password" autocomplete="${updatePassword ? "new-password" : "current-password"}" placeholder="${updatePassword ? "At least 8 characters" : "Enter password"}" minlength="${updatePassword ? "8" : "1"}" required><button class="password-toggle" type="button" data-action="toggle-password" aria-label="Show password" aria-pressed="false">Show</button></div>
          </div>` : ""}
          <p class="auth-error ${authFeedbackType === "success" ? "auth-success" : ""}" id="login-feedback" role="status" aria-live="polite">${escapeHTML(authFeedback)}</p>
          <button class="button auth-submit" type="submit">${recovery ? "Send reset link" : updatePassword ? "Update password" : "Sign in"} <span aria-hidden="true">→</span></button>
        </form>

        <!-- Quick 1-Click Test Accounts Modal Trigger (Hidden) -->
        <div class="demo-login-box" style="display: none;">
          <div class="demo-login-box-header">
            <span class="badge">Pre-Seeded Accounts</span>
            <strong>Quick Role Switcher (1-Click Test)</strong>
          </div>
          <p>Instant access to all 6 account tiers (Default password: <code>ayra@123</code>):</p>
          <div class="demo-quick-buttons">
            <button type="button" class="button-demo-quick" data-demo-role="developer">Developer (Root)</button>
            <button type="button" class="button-demo-quick" data-demo-role="teacher">Class Teacher</button>
            <button type="button" class="button-demo-quick" data-demo-role="committee">Core Committee</button>
            <button type="button" class="button-demo-quick" data-demo-role="treasurer">Treasurer</button>
            <button type="button" class="button-demo-quick" data-demo-role="student">Student (AD-01)</button>
            <button type="button" class="button-demo-quick" data-demo-role="wing" data-demo-wing="tech">Tech Wing</button>
          </div>
        </div>

        <div class="auth-secondary-actions">
          ${recovery || updatePassword ? `<button class="auth-mode-link" type="button" data-auth-mode="signin">← Back to sign in</button>` : `<button class="auth-mode-link" type="button" data-auth-mode="recovery">Forgot password?</button><p class="auth-switch">Accounts are created by the Developer.</p>`}
        </div>
      </div>
    </section>
  </div>`;
}

function renderAccount() {
  if (!currentUser) {
    return `<div class="page-shell"><header><p class="eyebrow">Member account</p><h1 class="page-title">Sign in to manage your account.</h1><p class="lead">Your personalized profile and union tools are available to approved accounts.</p><a class="button" href="#login">Sign in →</a></header></div>`;
  }
  if (!currentProfile) {
    return `<div class="page-shell"><header><p class="eyebrow">Account approval</p><h1 class="page-title">Your portal role is not active yet.</h1><p class="lead">Ask the ADAB developer to assign your portal role or confirm your invitation.</p><button class="button button-secondary" type="button" data-action="sign-out">Sign out</button></header></div>`;
  }

  const profile = currentProfile;
  const roleTitle = roleNames[profile.role] || "Member";

  // Student Dashboard
  if (profile.role === "student") {
    return `<div class="page-shell account-dashboard-shell">
      <!-- Top Hero Welcome Banner -->
      <section class="account-hero-banner">
        <div class="account-hero-left">
          <div class="finance-header-badge-row">
            <span class="badge badge-red">${escapeHTML(roleTitle)}</span>
            <span class="badge badge-neutral">${escapeHTML(profile.roll_number || "Student")}</span>
            <span class="badge badge-neutral">${escapeHTML(profile.house_team || "No House")}</span>
          </div>
          <h1 class="page-title">Welcome back, ${escapeHTML(profile.display_name)}.</h1>
          <p class="lead">${escapeHTML(currentUser.email)} · ${escapeHTML(profile.district || "Kerala")}</p>
          ${profile.bio ? `<p class="profile-bio-card"><em>"${escapeHTML(profile.bio)}"</em></p>` : ""}
        </div>
        <div class="account-hero-actions">
          <a class="button" href="#finance">View Private Finance Ledger <span aria-hidden="true">→</span></a>
          <a class="button button-secondary" href="#works">Explore Student Works</a>
          <button class="button button-secondary button-danger-subtle" type="button" data-action="sign-out">Sign out of account</button>
        </div>
      </section>

      <!-- Profile Customization & Details -->
      <section class="section-block account-content-grid">
        <div class="account-main-card">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Personal profile</p>
              <h2 class="section-title">Update your details & preferences</h2>
            </div>
          </div>
          <form class="contact-form" id="profile-form">
            <div class="form-row">
              <div class="form-field">
                <label for="profile-name">Display name</label>
                <input id="profile-name" name="display_name" required maxlength="80" value="${escapeHTML(profile.display_name)}">
              </div>
              <div class="form-field">
                <label for="profile-roll">Roll number</label>
                <input id="profile-roll" name="roll_number" maxlength="30" value="${escapeHTML(profile.roll_number || "")}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label for="profile-house">House team</label>
                <select id="profile-house" name="house_team">
                  <option value="">Select house</option>
                  ${["Red Knights", "White Warriors", "Crimson Falcons"].map(h => `<option ${profile.house_team === h ? "selected" : ""}>${h}</option>`).join("")}
                </select>
              </div>
              <div class="form-field">
                <label for="profile-district">District</label>
                <input id="profile-district" name="district" maxlength="60" value="${escapeHTML(profile.district || "")}">
              </div>
            </div>
            <div class="form-field">
              <label for="profile-bio">Student bio (interests, skills, aspirations)</label>
              <textarea id="profile-bio" name="bio" maxlength="500" placeholder="A brief note about yourself, your interests, and your role in the class...">${escapeHTML(profile.bio || "")}</textarea>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label for="profile-github">GitHub / Code profile link</label>
                <input id="profile-github" name="github_url" type="url" placeholder="https://github.com/..." value="${escapeHTML(profile.social_links?.github || "")}">
              </div>
              <div class="form-field">
                <label for="profile-portfolio">Portfolio or personal website</label>
                <input id="profile-portfolio" name="portfolio_url" type="url" placeholder="https://..." value="${escapeHTML(profile.social_links?.portfolio || "")}">
              </div>
            </div>
            <div class="form-submit-row">
              <button class="button" type="submit">Save profile details</button>
            </div>
          </form>
        </div>

        <div class="account-sidebar">
          <div class="card card-body account-sidebar-card">
            <h3>Creative & code submissions</h3>
            <p>Submit your articles, poetry, Arabic/English calligraphy, digital art, science projects, or coding repositories for union moderation.</p>
            <a class="button button-secondary" href="#works">Go to work upload form →</a>
          </div>
        </div>
      </section>
    </div>`;
  }

  // Teacher & Committee Dashboard (Supervisory / Union Operations)
  if (canManageUnion(profile)) {
    return `<div class="page-shell account-dashboard-shell">
      <section class="account-hero-banner">
        <div class="account-hero-left">
          <div class="finance-header-badge-row">
            <span class="badge badge-red">${escapeHTML(roleTitle)}</span>
            <span class="badge badge-neutral">${escapeHTML(profile.role === "teacher" ? "Class Supervisor" : "Core Leadership")}</span>
          </div>
          <h1 class="page-title">${escapeHTML(profile.display_name)}</h1>
          <p class="lead">${escapeHTML(currentUser.email)} · ${profile.role === "teacher" ? "Supervising student activities & approvals" : "Managing union publications & events"}</p>
        </div>
        <div class="account-hero-actions">
          <a class="button" href="#finance">Review Financial Ledger <span aria-hidden="true">→</span></a>
          ${profile.role === "developer" ? `<a class="button button-secondary" href="#admin">Open Manage Portal</a>` : ""}
          <button class="button button-secondary button-danger-subtle" type="button" data-action="sign-out">Sign out</button>
        </div>
      </section>

      <!-- Pending Creative Submissions Moderation -->
      <section class="section-block">
        <div class="section-heading"><div><p class="eyebrow">Submissions moderation</p><h2 class="section-title">Student works awaiting review</h2></div></div>
        ${reviewWorks.length ? `
        <div class="management-list">
          ${reviewWorks.map(work => `
          <article class="card management-card">
            <div>
              <span class="badge">${escapeHTML(work.work_type || "Work")}</span>
              <h3>${escapeHTML(work.title)}</h3>
              <p>By <strong>${escapeHTML(work.author_name || "Student")}</strong> · ${escapeHTML(work.excerpt || "")}</p>
              ${work.project_url ? `<p><a class="text-link" href="${escapeHTML(work.project_url)}" target="_blank" rel="noopener">Inspect Project Link ↗</a></p>` : ""}
              ${work.attachment_path ? `<p><button class="text-link" type="button" data-work-file="${escapeHTML(work.attachment_path)}">View submitted attachment</button></p>` : ""}
            </div>
            <form class="review-work-form" data-work-review="${escapeHTML(work.id)}">
              <select name="status">
                <option value="published">Approve & Publish</option>
                <option value="rejected">Decline / Reject</option>
              </select>
              <button class="button" type="submit">Submit decision</button>
            </form>
          </article>`).join("")}
        </div>` : `<p class="form-note">No student submissions are currently pending moderation.</p>`}
      </section>

      <!-- Publish Official Announcements -->
      <section class="section-block">
        <div class="section-heading"><div><p class="eyebrow">Class communication</p><h2 class="section-title">Publish an official announcement</h2></div></div>
        <form class="contact-form" id="announcement-form">
          <div class="form-field"><label for="announcement-title">Announcement title</label><input id="announcement-title" name="title" required maxlength="120" placeholder="e.g. Schedule Update for Arts Week"></div>
          <div class="form-field"><label for="announcement-message">Message</label><textarea id="announcement-message" name="message" required maxlength="1500" placeholder="Detailed announcement text..."></textarea></div>
          <div class="form-field">
            <label for="announcement-wing">Target Wing or Class-Wide</label>
            <select id="announcement-wing" name="wing_id">
              <option value="">Class-Wide (All students & visitors)</option>
              ${portalWings.map(w => `<option value="${escapeHTML(w.id)}">${escapeHTML(w.name)}</option>`).join("")}
            </select>
          </div>
          <button class="button" type="submit">Publish announcement</button>
        </form>
      </section>

      <!-- Plan Class Event -->
      <section class="section-block">
        <div class="section-heading"><div><p class="eyebrow">Calendar management</p><h2 class="section-title">Add a class event or meeting</h2></div></div>
        <form class="contact-form" id="portal-event-form">
          <div class="form-row">
            <div class="form-field"><label for="portal-event-title">Event title</label><input id="portal-event-title" name="title" required maxlength="120" placeholder="e.g. Debate Finals"></div>
            <div class="form-field"><label for="portal-event-category">Category</label><input id="portal-event-category" name="category" required maxlength="60" placeholder="Academic, Sports, Arts, Tech..."></div>
          </div>
          <div class="form-row">
            <div class="form-field"><label for="portal-event-date">Date & time</label><input id="portal-event-date" name="starts_at" type="datetime-local" required></div>
            <div class="form-field"><label for="portal-event-time">Time display label</label><input id="portal-event-time" name="time_label" required maxlength="80" placeholder="9:30 AM – 12:00 PM"></div>
          </div>
          <div class="form-field"><label for="portal-event-venue">Venue</label><input id="portal-event-venue" name="venue" required maxlength="120" placeholder="e.g. Seminar Hall"></div>
          <div class="form-field"><label for="portal-event-description">Description</label><textarea id="portal-event-description" name="description" required maxlength="1000" placeholder="Details of the event, agenda items..."></textarea></div>
          <button class="button" type="submit">Publish event to calendar</button>
        </form>
      </section>
    </div>`;
  }

  // Treasurer Dashboard
  if (profile.role === "treasurer") {
    return `<div class="page-shell">
      <header>
        <div class="finance-header-badge-row"><span class="badge">Treasurer Desk</span></div>
        <h1 class="page-title">Treasury Management.</h1>
        <p class="lead">Maintain the private class union ledger, upload receipts and invoices, manage category budgets, and ensure complete transparency.</p>
      </header>
      <section class="section-block account-overview">
        <div>
          <span class="badge">Treasurer</span>
          <h2>${escapeHTML(profile.display_name)}</h2>
          <p>${escapeHTML(currentUser.email)}</p>
        </div>
        <div class="overview-buttons">
          <a class="button" href="#finance">Open Private Finance Ledger →</a>
          <button class="button button-secondary" type="button" data-action="sign-out">Sign out</button>
        </div>
      </section>
    </div>`;
  }

  // Wing Account Dashboard
  if (profile.role === "wing") {
    const assignedWing = portalWings.find(w => w.id === profile.wing_id) || portalWings[0];
    return `<div class="page-shell">
      <header>
        <div class="finance-header-badge-row"><span class="badge">Wing Management</span></div>
        <h1 class="page-title">${escapeHTML(assignedWing?.name || "Wing Desk")}.</h1>
        <p class="lead">Manage announcements, events, and descriptions for your assigned wing.</p>
      </header>

      <section class="section-block account-overview">
        <div>
          <span class="badge">${escapeHTML(assignedWing?.accent || "Wing")}</span>
          <h2>${escapeHTML(assignedWing?.name)}</h2>
          <p>${escapeHTML(currentUser.email)}</p>
        </div>
        <div class="overview-buttons">
          <a class="button" href="#finance">View Private Finance Ledger →</a>
          <button class="button button-secondary" type="button" data-action="sign-out">Sign out</button>
        </div>
      </section>

      <!-- Wing Profile & Content Editor -->
      <section class="section-block">
        <div class="section-heading"><div><p class="eyebrow">Wing configuration</p><h2 class="section-title">Edit wing details & activities</h2></div></div>
        <form class="contact-form wing-editor" data-wing-update="${escapeHTML(assignedWing.id)}">
          <div class="form-row">
            <div class="form-field"><label for="wing-name-${escapeHTML(assignedWing.id)}">Wing name</label><input id="wing-name-${escapeHTML(assignedWing.id)}" name="name" required maxlength="100" value="${escapeHTML(assignedWing.name)}"></div>
            <div class="form-field"><label for="wing-accent-${escapeHTML(assignedWing.id)}">Short label / tag</label><input id="wing-accent-${escapeHTML(assignedWing.id)}" name="accent" required maxlength="40" value="${escapeHTML(assignedWing.accent)}"></div>
          </div>
          <div class="form-field"><label for="wing-icon-${escapeHTML(assignedWing.id)}">Icon / Emoji</label><input id="wing-icon-${escapeHTML(assignedWing.id)}" name="icon" required maxlength="8" value="${escapeHTML(assignedWing.icon)}"></div>
          <div class="form-field"><label for="wing-objective-${escapeHTML(assignedWing.id)}">Mission & objective</label><textarea id="wing-objective-${escapeHTML(assignedWing.id)}" name="objective" maxlength="500" required>${escapeHTML(assignedWing.objective)}</textarea></div>
          <div class="form-field"><label for="wing-activities-${escapeHTML(assignedWing.id)}">Activities (one per line)</label><textarea id="wing-activities-${escapeHTML(assignedWing.id)}" name="activities" maxlength="1000">${escapeHTML((assignedWing.activities || []).join("\n"))}</textarea></div>
          <button class="button" type="submit">Save wing details</button>
        </form>
      </section>

      <!-- Wing Announcement -->
      <section class="section-block">
        <div class="section-heading"><div><p class="eyebrow">Wing announcements</p><h2 class="section-title">Post a notice for ${escapeHTML(assignedWing.name)}</h2></div></div>
        <form class="contact-form" id="announcement-form">
          <input type="hidden" name="wing_id" value="${escapeHTML(assignedWing.id)}">
          <div class="form-field"><label for="wing-announce-title">Title</label><input id="wing-announce-title" name="title" required maxlength="120" placeholder="e.g. Workshop Registration Open"></div>
          <div class="form-field"><label for="wing-announce-message">Message</label><textarea id="wing-announce-message" name="message" required maxlength="1500" placeholder="Write announcement..."></textarea></div>
          <button class="button" type="submit">Publish wing notice</button>
        </form>
      </section>
    </div>`;
  }

  // Developer Dashboard
  return `<div class="page-shell">
    <header>
      <div class="finance-header-badge-row"><span class="badge">Root Developer</span></div>
      <h1 class="page-title">Developer Administrative Hub.</h1>
      <p class="lead">Unrestricted root access across authentication, invitations, dynamic copy, and the financial ledger.</p>
    </header>
    <section class="section-block account-overview">
      <div>
        <span class="badge">Developer</span>
        <h2>${escapeHTML(profile.display_name)}</h2>
        <p>${escapeHTML(currentUser.email)}</p>
      </div>
      <div class="overview-buttons">
        <a class="button" href="#admin">Open Manage Portal & RBAC →</a>
        <a class="button button-secondary" href="#finance">Open Private Finance Ledger</a>
        <button class="button button-secondary" type="button" data-action="sign-out">Sign out</button>
      </div>
    </section>
  </div>`;
}

function renderAdmin() {
  if (currentProfile?.role !== "developer") {
    return `<div class="page-shell"><header><p class="eyebrow">Restricted area</p><h1 class="page-title">Developer access required.</h1><p class="lead">Only the Developer account can manage user invitations, dynamic UI copy, role assignments, and wing configurations.</p></header></div>`;
  }

  const roleCapacities = { developer: 1, teacher: 1, committee: 1, treasurer: 1, student: 15, wing: 8 };
  const accounts = adminProfiles || PRESEEDED_ACCOUNTS;
  const roleCounts = Object.fromEntries(Object.keys(roleCapacities).map(role => [
    role,
    accounts.filter(m => m.role === role && m.is_active).length
  ]));

  const invites = getDemoInvites();

  return `<div class="page-shell admin-page">
    <header class="admin-header">
      <div class="admin-header-copy">
        <span class="admin-kicker"><span class="admin-kicker-dot" aria-hidden="true"></span> Developer control</span>
        <h1 class="page-title">Manage the union portal.</h1>
        <p class="lead">Create accounts, manage access, customise every word, and keep the eight wings up to date — all from one place.</p>
      </div>
      <div class="admin-identity">
        <span class="admin-identity-avatar" aria-hidden="true">A</span>
        <div>
          <small>Signed in as</small>
          <strong>@${escapeHTML(currentProfile?.username || "developer")}</strong>
          <span>Root administrator</span>
        </div>
      </div>
    </header>

    <!-- Admin Navigation Tabs -->
    <div class="admin-tab-nav" role="tablist" aria-label="Admin sections">
      <a class="admin-tab-btn ${adminActiveTab === "create" ? "is-active" : ""}" href="#admin?tab=create" data-admin-tab="create" role="tab" aria-selected="${adminActiveTab === "create"}">
        <span class="admin-tab-copy"><strong>Create account</strong><small>Username &amp; password</small></span>
      </a>
      <a class="admin-tab-btn ${adminActiveTab === "invites" ? "is-active" : ""}" href="#admin?tab=invites" data-admin-tab="invites" role="tab" aria-selected="${adminActiveTab === "invites"}">
        <span class="admin-tab-copy"><strong>Email invites</strong><small>Single-use links</small></span>
      </a>
      <a class="admin-tab-btn ${adminActiveTab === "roster" ? "is-active" : ""}" href="#admin?tab=roster" data-admin-tab="roster" role="tab" aria-selected="${adminActiveTab === "roster"}">
        <span class="admin-tab-copy"><strong>Account roster</strong><small>Roles &amp; lifecycles</small></span>
      </a>
      <a class="admin-tab-btn ${adminActiveTab === "content" ? "is-active" : ""}" href="#admin?tab=content" data-admin-tab="content" role="tab" aria-selected="${adminActiveTab === "content"}">
        <span class="admin-tab-copy"><strong>Page copy</strong><small>Headlines &amp; text</small></span>
      </a>
      <a class="admin-tab-btn ${adminActiveTab === "wings" ? "is-active" : ""}" href="#admin?tab=wings" data-admin-tab="wings" role="tab" aria-selected="${adminActiveTab === "wings"}">
        <span class="admin-tab-copy"><strong>Wings</strong><small>7 student domains</small></span>
      </a>
    </div>

    <!-- TAB 0: Direct account creation with username and password -->
    ${adminActiveTab === "create" ? `
    <div class="admin-grid">
      <section class="admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2>Create an account</h2>
            <p>No email address needed. Pick a username and password, share them with the person, and they can sign in immediately.</p>
          </div>
        </div>

        <form class="admin-form" id="create-account-form">
          <div class="admin-field-grid">
            <div class="form-field">
              <label for="create-username">Username</label>
              <input id="create-username" name="username" required minlength="3" maxlength="30" pattern="[a-z0-9][a-z0-9._\\-]{2,29}" placeholder="e.g. riyas" autocomplete="off">
              <small class="form-note">3–30 characters. Lowercase letters, numbers, dots, underscores, or hyphens.</small>
            </div>
            <div class="form-field">
              <label for="create-name">Display name</label>
              <input id="create-name" name="display_name" required maxlength="80" placeholder="e.g. Muhammed Riyas">
              <small class="form-note">Full name shown across portal rosters and works.</small>
            </div>
            <div class="form-field">
              <label for="create-password">Initial password</label>
              <input id="create-password" name="password" type="text" required minlength="8" maxlength="72" placeholder="At least 8 characters" autocomplete="new-password">
              <small class="form-note">Share this password with the account holder.</small>
            </div>
            <div class="form-field">
              <label for="create-role">Account role</label>
              <select id="create-role" name="role" required>
                <option value="student">Student</option>
                <option value="teacher">Class Teacher</option>
                <option value="committee">Core Committee</option>
                <option value="treasurer">Treasurer</option>
                <option value="wing">Wing Account</option>
              </select>
              <small class="form-note">Controls access permissions across all sections.</small>
            </div>
          </div>
          <div class="form-field admin-wing-field" id="create-wing-field" hidden>
            <label for="create-wing">Assigned wing</label>
            <select id="create-wing" name="wing_id">
              ${portalWings.map(w => `<option value="${escapeHTML(w.id)}">${escapeHTML(w.name)}</option>`).join("")}
            </select>
          </div>
          <div class="admin-form-actions">
            <button class="button" type="submit">Create account <span aria-hidden="true">→</span></button>
            <span class="admin-form-hint">The account is active as soon as it is created.</span>
          </div>
        </form>

        <div id="create-result-container" class="admin-result ${lastCreatedAccount ? "" : "is-hidden"}" ${lastCreatedAccount ? "" : "hidden"}>
          <div class="admin-result-body">
            <strong>Account created</strong>
            <p id="create-result-message">${lastCreatedAccount ? escapeHTML(lastCreatedAccount.message || "") : ""}</p>
            <div class="invite-link-row">
              <input type="text" id="create-result-credentials" readonly value="${lastCreatedAccount ? escapeHTML(`Username: ${lastCreatedAccount.username}    Password: ${lastCreatedAccount.password}`) : ""}">
              <button type="button" class="button button-secondary" id="copy-credentials-btn">Copy</button>
            </div>
            <p class="form-note">Sign in at <strong>/#login</strong> with this username and password.</p>
          </div>
        </div>
      </section>

      <aside class="admin-side">
        <section class="admin-panel admin-panel-compact">
          <div class="admin-panel-head">
            <div><h2>Account slots</h2><p>Active accounts against each role limit.</p></div>
          </div>
          <div class="admin-role-list">
            ${Object.entries(roleCapacities).map(([r, limit]) => {
              const used = roleCounts[r] || 0;
              const pct = Math.min(100, Math.round((used / limit) * 100));
              return `<div class="admin-role-row">
                <div class="admin-role-label"><span>${escapeHTML(roleNames[r] || r)}</span><strong>${used}<small>/${limit}</small></strong></div>
                <div class="admin-role-bar"><span style="width:${pct}%"></span></div>
              </div>`;
            }).join("")}
          </div>
        </section>

        <section class="admin-note">
          <span class="admin-note-icon" aria-hidden="true">i</span>
          <div>
            <strong>How sign-in works</strong>
            <p>Accounts created here sign in with their username — no email address required. Open the roster to suspend, reactivate, reset a password, or revoke access.</p>
          </div>
        </section>
      </aside>
    </div>` : ""}

    <!-- TAB 1: User Invitations (/admin/invite) -->
    ${adminActiveTab === "invites" ? `
    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">Dedicated invite system</p><h2 class="section-title">Invite a user & generate single-use link</h2></div></div>
      <p class="form-note">Enter the recipient’s email address and assign their designated account role. The system generates a single-use onboarding token link that can be shared or emailed directly.</p>
      
      <form class="contact-form" id="invite-form">
        <div class="form-row">
          <div class="form-field"><label for="invite-name">Invitee full name</label><input id="invite-name" name="display_name" required maxlength="80" placeholder="e.g. Aslam P"></div>
          <div class="form-field"><label for="invite-email">Invitee email address</label><input id="invite-email" name="email" type="email" required maxlength="254" placeholder="e.g. aslam@adab.edu"></div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="invite-role">Account role</label>
            <select id="invite-role" name="role" required>
              <option value="student">Student (1 of 15)</option>
              <option value="teacher">Class Teacher</option>
              <option value="committee">Core Committee</option>
              <option value="treasurer">Treasurer</option>
              <option value="wing">Wing Account (1 of 7)</option>
            </select>
          </div>
          <div class="form-field" id="invite-wing-field" hidden>
            <label for="invite-wing">Assigned wing</label>
            <select id="invite-wing" name="wing_id">
              ${portalWings.map(w => `<option value="${escapeHTML(w.id)}">${escapeHTML(w.name)}</option>`).join("")}
            </select>
          </div>
        </div>
        <button class="button" type="submit">Generate invitation link <span aria-hidden="true">→</span></button>
      </form>

      <div id="invite-result-container" class="invite-result-container" hidden>
        <div class="invite-result-card">
          <span class="badge badge-success">Single-Use Invitation Token Created</span>
          <p id="invite-result-message"></p>
          <div class="invite-link-row">
            <input type="text" id="invite-link-input" readonly>
            <button type="button" class="button" id="copy-invite-link-btn">Copy Link</button>
          </div>
        </div>
      </div>

      <div class="section-block">
        <div class="section-heading"><div><p class="eyebrow">Pending invitations</p><h2 class="section-title">Active onboarding invitations</h2></div></div>
        ${invites.length ? `
        <div class="ledger-table-wrapper">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Invitee</th>
                <th>Role</th>
                <th>Token</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${invites.map(inv => `
              <tr>
                <td><strong>${escapeHTML(inv.display_name || inv.email)}</strong><br><small class="text-muted">${escapeHTML(inv.email)}</small></td>
                <td><span class="badge">${escapeHTML(roleNames[inv.role] || inv.role)}</span></td>
                <td><code>${escapeHTML(inv.token ? inv.token.slice(0, 16) + "…" : "")}</code></td>
                <td><span class="badge ${inv.status === "accepted" ? "badge-income" : inv.status === "revoked" ? "badge-expense" : ""}">${escapeHTML(inv.status)}</span></td>
                <td>
                  <div class="table-actions">
                    <button type="button" class="text-link" data-copy-token="${escapeHTML(inv.token)}">Copy URL</button>
                    ${inv.status === "pending" ? `<button type="button" class="button-icon-del" data-revoke-invite="${escapeHTML(inv.id || inv.token)}" title="Revoke invite">×</button>` : ""}
                  </div>
                </td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>` : `<p class="form-note">No pending invitations.</p>`}
      </div>
    </section>` : ""}

    <!-- TAB 2: Account Roster & Lifecycles -->
    ${adminActiveTab === "roster" ? `
    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">Account lifecycle management</p><h2 class="section-title">Portal roster & active accounts</h2></div></div>
      <div class="finance-summary">${Object.entries(roleCapacities).map(([r, limit]) => `<article class="capacity-card"><span>${escapeHTML(roleNames[r] || r)}</span><strong>${roleCounts[r]} / ${limit}</strong></article>`).join("")}</div>
      <div class="management-list" style="margin-top: 24px">
        ${accounts.map(member => `
        <article class="card management-card">
          <div>
            <div class="card-topline">
              <span class="badge">${escapeHTML(roleNames[member.role] || member.role)}</span>
              <span class="badge ${member.is_active ? "badge-income" : "badge-expense"}">${member.is_active ? "Active" : "Suspended"}</span>
            </div>
            <h3>${escapeHTML(member.display_name)}</h3>
            <p>${member.username ? `<strong>@${escapeHTML(member.username)}</strong> · ` : ""}${escapeHTML(member.email)}${member.roll_number ? ` · ${escapeHTML(member.roll_number)}` : ""}${member.wing_id ? ` · ${escapeHTML(portalWings.find(w => w.id === member.wing_id)?.name || member.wing_id)}` : ""}</p>
          </div>
          ${member.role === "developer" ? `<div class="developer-tag">Root Administrator</div>` : `
          <div class="account-lifecycle-actions">
            <button type="button" class="button button-secondary" data-set-password="${escapeHTML(member.id)}" data-set-password-name="${escapeHTML(member.username || member.email)}">Set New Password</button>
            <button type="button" class="button button-secondary" data-toggle-suspend="${escapeHTML(member.id)}" data-role="${escapeHTML(member.role)}" data-wing="${escapeHTML(member.wing_id || "")}" data-active="${member.is_active ? "true" : "false"}">${member.is_active ? "Suspend User" : "Reactivate User"}</button>
            <button type="button" class="button button-secondary" data-force-reset="${escapeHTML(member.email)}">Force Password Reset</button>
            <button type="button" class="button button-danger" data-revoke-user="${escapeHTML(member.id)}" data-user-name="${escapeHTML(member.display_name)}">Revoke Access</button>
          </div>`}
        </article>`).join("")}
      </div>
    </section>` : ""}

    <!-- TAB 3: Dynamic Copy & Content Editor -->
    ${adminActiveTab === "content" ? `
    <section class="section-block">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Global dynamic copy editor</p>
          <h2 class="section-title">Edit text, headlines & banners across all pages</h2>
        </div>
        <button type="button" class="button button-secondary" id="reset-content-defaults-btn">Reset All to Defaults</button>
      </div>
      <p class="lead">Changes made here are stored in the database state layer and immediately override UI copy on all pages without redeploying code.</p>

      <div class="filter-bar" style="margin: 20px 0;">
        <select id="content-category-filter">
          <option value="all">All sections</option>
          <option value="Hero">Hero & Banner</option>
          <option value="About">About Us</option>
          <option value="Events">Events</option>
          <option value="Wings">Wings</option>
          <option value="Works">Student Works</option>
          <option value="Finance">Finance</option>
          <option value="Footer">Footer</option>
        </select>
      </div>

      <div class="content-editor-grid">
        ${CONTENT_SCHEMA.filter(item => contentCategoryFilter === "all" || item.section === contentCategoryFilter).map(item => {
          const val = getContent(item.key);
          return `<div class="card content-editor-card">
            <div class="content-editor-header">
              <span class="badge">${escapeHTML(item.section)}</span>
              <strong>${escapeHTML(item.label)}</strong>
              <code>${escapeHTML(item.key)}</code>
            </div>
            <form class="dynamic-content-form" data-content-key="${escapeHTML(item.key)}">
              ${item.type === "textarea" ? `<textarea name="value" rows="3" required>${escapeHTML(val)}</textarea>` : item.type === "select" ? `<select name="value">${(item.options || []).map(opt => `<option value="${escapeHTML(opt)}" ${val === opt ? "selected" : ""}>${escapeHTML(opt)}</option>`).join("")}</select>` : `<input name="value" type="text" required value="${escapeHTML(val)}">`}
              <div class="form-actions-inline">
                <button class="button button-secondary" type="submit">Save copy override</button>
              </div>
            </form>
          </div>`;
        }).join("")}
      </div>
    </section>` : ""}

    <!-- TAB 4: Student Wings Editor (8 Wings) -->
    ${adminActiveTab === "wings" ? `
    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">Portal-wide domain management</p><h2 class="section-title">Edit student wings (8 wings)</h2></div></div>
      <p class="lead">Update wing titles, objectives, icons, and activities. Changes reflect instantly on the Wings page, announcement wing dropdowns, and member assignments.</p>
      <div class="wing-editor-grid">
        ${portalWings.map(wing => `
        <form class="card wing-editor" data-wing-update="${escapeHTML(wing.id)}">
          <div class="card-body">
            <div class="form-row">
              <div class="form-field"><label for="wing-name-${escapeHTML(wing.id)}">Wing name</label><input id="wing-name-${escapeHTML(wing.id)}" name="name" required maxlength="100" value="${escapeHTML(wing.name)}"></div>
              <div class="form-field"><label for="wing-accent-${escapeHTML(wing.id)}">Short label</label><input id="wing-accent-${escapeHTML(wing.id)}" name="accent" required maxlength="40" value="${escapeHTML(wing.accent)}"></div>
            </div>
            <div class="form-field"><label for="wing-icon-${escapeHTML(wing.id)}">Icon / Symbol</label><input id="wing-icon-${escapeHTML(wing.id)}" name="icon" required maxlength="8" value="${escapeHTML(wing.icon)}"></div>
            <div class="form-field"><label for="wing-objective-${escapeHTML(wing.id)}">Mission & description</label><textarea id="wing-objective-${escapeHTML(wing.id)}" name="objective" maxlength="500" required>${escapeHTML(wing.objective)}</textarea></div>
            <div class="form-field"><label for="wing-activities-${escapeHTML(wing.id)}">Activities (one per line)</label><textarea id="wing-activities-${escapeHTML(wing.id)}" name="activities" maxlength="1000">${escapeHTML((wing.activities || []).join("\n"))}</textarea></div>
            <button class="button button-secondary" type="submit">Save wing details</button>
          </div>
        </form>`).join("")}
      </div>
    </section>` : ""}
  </div>`;
}

function renderInviteOnboarding() {
  const hash = location.hash;
  const tokenMatch = hash.match(/token=([^&]+)/);
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : "";
  const invites = getDemoInvites();
  const found = invites.find(i => i.token === token);

  return `<div class="auth-shell">
    <section class="auth-card">
      <aside class="auth-aside">
        <a class="brand brand-auth" href="#home"><img src="${assetPaths.logo}" alt="" width="42" height="42"><span><strong>ADAB</strong><small>CLASS UNION</small></span></a>
        <div class="auth-aside-copy"><p class="eyebrow">Account Onboarding</p><h1>Welcome to ADAB Class Union.</h1><p>You have received an authorized invitation to join the ADAB digital portal.</p></div>
        <p class="auth-aside-note">VERIFIED INVITATION</p>
      </aside>
      <div class="auth-content">
        <p class="eyebrow">Account setup</p>
        <h2>Complete your registration.</h2>
        <p class="auth-description">Set your password and personal profile details to activate your account.</p>

        <form class="auth-form" id="onboarding-form">
          <input type="hidden" name="token" value="${escapeHTML(token)}">
          <div class="form-field">
            <label for="onboard-email">Email address</label>
            <input id="onboard-email" name="email" type="email" readonly value="${escapeHTML(found?.email || "invitee@adab.edu")}">
          </div>
          <div class="form-field">
            <label for="onboard-name">Your full name</label>
            <input id="onboard-name" name="display_name" required maxlength="80" value="${escapeHTML(found?.display_name || "")}" placeholder="Full Name">
          </div>
          <div class="form-field">
            <label for="onboard-role">Assigned role</label>
            <input id="onboard-role" readonly value="${escapeHTML(roleNames[found?.role] || found?.role || "Student")}">
          </div>
          <div class="form-field">
            <label for="onboard-password">Choose password</label>
            <input id="onboard-password" name="password" type="password" required minlength="8" placeholder="At least 8 characters">
          </div>
          <div class="form-field">
            <label for="onboard-confirm">Confirm password</label>
            <input id="onboard-confirm" name="confirm_password" type="password" required minlength="8" placeholder="Re-enter password">
          </div>
          <button class="button auth-submit" type="submit">Activate your account <span aria-hidden="true">→</span></button>
        </form>
      </div>
    </section>
  </div>`;
}

function renderOutreach() {
  const initiatives = [
    {
      title: "Inter-school collaborations",
      detail: "Joint literary, cultural, and science programmes with neighbouring higher secondary schools, arranged with the class teacher's approval."
    },
    {
      title: "Community service drives",
      detail: "Blood donation camps, study-material distribution, and campus clean-up drives staffed by wing volunteers."
    },
    {
      title: "SAMIA outreach reporting",
      detail: "Every external activity is logged under the SAMIA outreach category so participation counts towards award readiness."
    },
    {
      title: "Public relations desk",
      detail: "The PRO publishes announcements, press notes, and invitations for external events on behalf of the union."
    }
  ];

  return `<div class="page-shell">
    <header>
      <p class="eyebrow">Outreach &amp; External Relations</p>
      <h1 class="page-title">Carrying ADAB beyond the classroom.</h1>
      <p class="lead">Outreach covers everything the union does outside its own wings — inter-school collaborations, community service, and public programmes. Each activity is documented so members receive recognition for it.</p>
    </header>

    <section class="section-block">
      <div class="card-grid">
        ${initiatives.map(item => `
          <article class="card">
            <div class="card-body">
              <span class="badge">Outreach</span>
              <h3>${escapeHTML(item.title)}</h3>
              <p>${escapeHTML(item.detail)}</p>
            </div>
          </article>`).join("")}
      </div>
    </section>

    <section class="section-block">
      <p class="eyebrow">How to participate</p>
      <h2 class="section-title">Propose an outreach activity</h2>
      <p class="lead">Bring your proposal to a core committee member before the weekly review. Approved activities are announced on the portal and counted in the SAMIA outreach record.</p>
      <div class="auth-required">
        <p>${currentUser ? "Open your account to review the outreach activities credited to you." : "Sign in with your student account to track the outreach work credited to you."}</p>
        <a class="button" href="#${currentUser ? "account" : "login"}">${currentUser ? "Open your account →" : "Sign in →"}</a>
      </div>
    </section>
  </div>`;
}

function renderSamia() {
  const tracks = [
    {
      title: "SAMIA outreach cycle",
      detail: "Outreach participation is collected each cycle, verified by the wing lead, and reported to the class teacher before it is entered in the union record."
    },
    {
      title: "Bimonthly union digest",
      detail: "Every second month the union publishes a digest of programmes, results, and financial highlights so members can follow what the council has done."
    },
    {
      title: "Participation credit",
      detail: "Members named in a verified outreach report receive participation credit that appears in their achievement summary."
    }
  ];

  return `<div class="page-shell">
    <header>
      <p class="eyebrow">SAMIA &amp; Bimonthly</p>
      <h1 class="page-title">Structured outreach, reported on time.</h1>
      <p class="lead">This section explains how SAMIA outreach activities are recorded and how the bimonthly union digest is compiled and published.</p>
    </header>

    <section class="section-block">
      <div class="card-grid">
        ${tracks.map(item => `
          <article class="card">
            <div class="card-body">
              <span class="badge">SAMIA</span>
              <h3>${escapeHTML(item.title)}</h3>
              <p>${escapeHTML(item.detail)}</p>
            </div>
          </article>`).join("")}
      </div>
    </section>

    <section class="section-block">
      <p class="eyebrow">Reporting window</p>
      <h2 class="section-title">What to submit each cycle</h2>
      <p class="lead">Activity name, date, venue, the members who attended, and a photograph or signed attendance sheet. Incomplete entries are sent back to the wing lead before verification.</p>
      <div class="auth-required">
        <p>${currentUser ? "Your account shows the outreach entries already credited to you." : "Sign in to see the outreach entries credited to your account."}</p>
        <a class="button" href="#${currentUser ? "account" : "login"}">${currentUser ? "Open your account →" : "Sign in →"}</a>
      </div>
    </section>
  </div>`;
}

function renderAssemblies() {
  const assemblyTypes = [
    {
      title: "General assembly",
      detail: "The full class meets to hear announcements from the president, secretary, and treasurer, and to approve upcoming programmes."
    },
    {
      title: "Wing review assembly",
      detail: "Wing holders report progress on their activities, review pending tasks, and hand over completed work to the core committee."
    },
    {
      title: "Finance assembly",
      detail: "The treasurer presents the union fund position, including monthly student contributions and every recorded expense."
    }
  ];

  return `<div class="page-shell">
    <header>
      <p class="eyebrow">Assemblies</p>
      <h1 class="page-title">Where the class takes its decisions.</h1>
      <p class="lead">Assemblies are the union's decision-making forum. Agendas are circulated in advance, minutes are recorded by the secretary, and every resolution is published here.</p>
    </header>

    <section class="section-block">
      <div class="card-grid">
        ${assemblyTypes.map(item => `
          <article class="card">
            <div class="card-body">
              <span class="badge">Assembly</span>
              <h3>${escapeHTML(item.title)}</h3>
              <p>${escapeHTML(item.detail)}</p>
            </div>
          </article>`).join("")}
      </div>
    </section>

    <section class="section-block">
      <p class="eyebrow">Procedure</p>
      <h2 class="section-title">How an assembly runs</h2>
      <p class="lead">The president opens the meeting and confirms quorum. Each wing reports in turn, the treasurer presents the fund position, and open points are debated before a vote. The secretary uploads the minutes within two days of the meeting.</p>
      <div class="auth-required">
        <p>${currentUser ? "Minutes and resolutions are published through the account dashboard." : "Sign in to read the minutes and resolutions passed in previous assemblies."}</p>
        <a class="button" href="#${currentUser ? "account" : "login"}">${currentUser ? "Open your account →" : "Sign in →"}</a>
      </div>
    </section>
  </div>`;
}

const AWARD_CHECKPOINT_KEY = "award_checkpoint_v1";

const AWARD_CRITERIA = [
  {
    id: "class-programmes",
    label: "Class Programmes",
    weight: 15,
    hint: "Union-organised programmes: debates, quizzes, cultural evenings, and inter-house events.",
    evidenceExamples: "Programme plans, posters, attendance records, minutes, and completion reports."
  },
  {
    id: "samia",
    label: "SAMIA",
    weight: 10,
    hint: "Participation and reporting under the SAMIA activity category.",
    evidenceExamples: "Activity plans, participation records, reports, and dated supporting material."
  },
  {
    id: "highlight",
    label: "Highlight",
    weight: 10,
    hint: "The union's flagship highlight programme, from planning through execution.",
    evidenceExamples: "The approved brief, schedule, assigned responsibilities, and completion report."
  },
  {
    id: "campus-pubs",
    label: "Campus Publications",
    weight: 20,
    hint: "Editorial and creative publications circulated on campus: magazine, wall journal, newsletters.",
    evidenceExamples: "Copies of each issue, publication dates, editorial records, and circulation details."
  },
  {
    id: "outreach-pubs",
    label: "Outreach Publications",
    weight: 25,
    hint: "Outreach publications and external visibility — the heaviest single criterion.",
    evidenceExamples: "Publication copies, release dates, intended audience, distribution channel, and reach."
  },
  {
    id: "bimonthly",
    label: "Bonus Bimonthly Reports",
    weight: 10,
    hint: "Bimonthly reports filed on schedule, each accepted as bonus evidence.",
    evidenceExamples: "Dated report copies and submission or receipt confirmations."
  },
  {
    id: "assembly",
    label: "Assembly",
    weight: 10,
    hint: "General assemblies convened, minuted, and followed up on.",
    evidenceExamples: "Agendas, attendance records, approved minutes, resolutions, and follow-up notes."
  }
];

const AWARD_RATING_LABELS = [
  "No evidence yet",
  "Minimal",
  "Partial",
  "Adequate",
  "Strong",
  "Exemplary"
];

function readAwardCheckpoint() {
  const empty = { ratings: {}, evidence: {}, nextActions: {}, targetDates: {}, wasSaved: false };
  try {
    const raw = localStorage.getItem(AWARD_CHECKPOINT_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    const asRecord = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      ratings: asRecord(parsed?.ratings),
      evidence: asRecord(parsed?.evidence),
      nextActions: asRecord(parsed?.nextActions),
      targetDates: asRecord(parsed?.targetDates),
      wasSaved: true
    };
  } catch (error) {
    console.warn("Could not read the award checkpoint.", error);
    return empty;
  }
}

function writeAwardCheckpoint(state) {
  try {
    const checkpoint = {
      ratings: state.ratings,
      evidence: state.evidence,
      nextActions: state.nextActions,
      targetDates: state.targetDates
    };
    localStorage.setItem(AWARD_CHECKPOINT_KEY, JSON.stringify(checkpoint));
    return true;
  } catch (error) {
    console.warn("Could not save the award checkpoint.", error);
    return false;
  }
}

function getAwardRating(state, criterionId) {
  const rating = state.ratings[criterionId];
  return Number.isInteger(rating) && rating >= 0 && rating <= 5 ? rating : null;
}

function getAwardCounts(state) {
  return {
    assessed: AWARD_CRITERIA.filter(criterion => getAwardRating(state, criterion.id) !== null).length,
    evidence: AWARD_CRITERIA.filter(criterion => String(state.evidence[criterion.id] || "").trim()).length
  };
}

function computeAwardScore(state) {
  return AWARD_CRITERIA.reduce((total, criterion) => {
    const rating = getAwardRating(state, criterion.id) ?? 0;
    return total + (rating / 5) * criterion.weight;
  }, 0);
}

function awardCriterionPoints(state, criterion) {
  const rating = getAwardRating(state, criterion.id) ?? 0;
  return Math.round((rating / 5) * criterion.weight);
}

function awardReadiness(state) {
  const counts = getAwardCounts(state);
  if (!counts.assessed) {
    return { key: "not-started", label: "Not started", detail: "Start by assessing the evidence you already have for each criterion." };
  }
  if (counts.assessed < AWARD_CRITERIA.length) {
    return { key: "in-progress", label: "Assessment in progress", detail: `${AWARD_CRITERIA.length - counts.assessed} criteria still need an assessment.` };
  }
  if (counts.evidence < AWARD_CRITERIA.length) {
    return { key: "evidence-gaps", label: "Evidence references needed", detail: `${AWARD_CRITERIA.length - counts.evidence} criteria still need a reference to supporting evidence.` };
  }
  return { key: "final-review", label: "Ready for a final check", detail: "All criteria have an assessment and evidence reference. Verify the documents against the current official rubric before submission." };
}

function buildAwardRecommendations(state) {
  return AWARD_CRITERIA
    .map(criterion => {
      const rating = getAwardRating(state, criterion.id);
      const evidence = String(state.evidence[criterion.id] || "").trim();
      const nextAction = String(state.nextActions[criterion.id] || "").trim();
      const targetDate = String(state.targetDates[criterion.id] || "").trim();
      const potentialPoints = Math.round(((5 - (rating ?? 0)) / 5) * criterion.weight);
      return {
        ...criterion,
        rating,
        evidence,
        nextAction,
        targetDate,
        potentialPoints,
        priority: potentialPoints + (evidence ? 0 : 0.5) + (rating === null ? 0.25 : 0)
      };
    })
    .filter(criterion => criterion.rating !== 5 || !criterion.evidence)
    .sort((a, b) => (b.priority - a.priority) || (b.weight - a.weight))
    .slice(0, 3)
    .map(criterion => ({
      id: criterion.id,
      title: criterion.rating === null
        ? `Assess ${criterion.label}`
        : !criterion.evidence
          ? `Add an evidence reference for ${criterion.label}`
          : `Strengthen ${criterion.label}`,
      detail: criterion.rating === null
        ? `${criterion.weight}% of the weighting is still unassessed. Review the current evidence, then choose a rating.`
        : !criterion.evidence
          ? `Rated ${criterion.rating}/5. Record where the supporting material is stored; the estimate does not verify evidence quality.`
          : `Rated ${criterion.rating}/5, with up to ${criterion.potentialPoints} weighted points still available in this estimate.`,
      action: criterion.nextAction,
      targetDate: criterion.targetDate
    }));
}

function renderAwardRecommendations(recommendations) {
  if (!recommendations.length) {
    return `<li class="award-recommendation-empty">Every criterion has a rating and an evidence reference. Review the source documents and confirm current requirements with your advisor.</li>`;
  }
  return recommendations.map(item => `<li>
    <div>
      <strong>${escapeHTML(item.title)}</strong>
      <p>${escapeHTML(item.detail)}</p>
      ${item.action ? `<p class="award-recommendation-action">Next action: ${escapeHTML(item.action)}${item.targetDate ? ` · Target ${escapeHTML(item.targetDate)}` : ""}</p>` : ""}
    </div>
    <button class="button button-secondary award-focus-button" type="button" data-award-focus="${escapeHTML(item.id)}">Review</button>
  </li>`).join("");
}

function renderAwardScorecardSelfEvaluation() {
  const state = readAwardCheckpoint();
  const score = computeAwardScore(state);
  const percent = Math.round(score);
  const recommendations = buildAwardRecommendations(state);
  const counts = getAwardCounts(state);
  const readiness = awardReadiness(state);

  return `<div class="award-ledger">
    <header class="award-ledger-head">
      <p class="eyebrow">Best Union Award · Working checklist</p>
      <h1 class="page-title">Build a stronger award submission.</h1>
      <p class="lead">Assess the seven criteria, note where evidence is stored, and set a next step for any gaps. Your estimate is a planning aid—not an official score or a prediction of the result.</p>

      <section class="award-overview" aria-label="Award checklist progress">
        <article class="award-overview-card award-overview-score">
          <span class="award-overview-label">Self-rating estimate</span>
          <strong><span data-award-score>${counts.assessed ? percent : "—"}</span><small> / 100</small></strong>
          <div class="award-meter-track" role="progressbar" aria-label="Estimated weighted score" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
            <span class="award-meter-fill" data-award-bar style="width:${percent}%"></span>
          </div>
        </article>
        <article class="award-overview-card">
          <span class="award-overview-label">Criteria assessed</span>
          <strong><span data-award-assessed>${counts.assessed}</span><small> / ${AWARD_CRITERIA.length}</small></strong>
        </article>
        <article class="award-overview-card">
          <span class="award-overview-label">Evidence references</span>
          <strong><span data-award-evidence-count>${counts.evidence}</span><small> / ${AWARD_CRITERIA.length}</small></strong>
        </article>
      </section>
      <p class="award-save-status" data-award-save-status data-saved="${state.wasSaved}" role="status">${state.wasSaved ? "Saved in this browser." : "Changes are saved in this browser when you edit the checklist."}</p>

      <section class="award-status" data-award-status data-state="${readiness.key}" aria-live="polite">
        <div><span class="award-status-label">Checklist status</span><strong class="award-status-value" data-award-status-label>${escapeHTML(readiness.label)}</strong></div>
        <p class="award-status-detail">${escapeHTML(readiness.detail)}</p>
      </section>
    </header>

    <section class="award-workspace" aria-labelledby="award-criteria-title">
      <div class="award-section-heading">
        <div><p class="eyebrow">The checklist</p><h2 id="award-criteria-title">Assess each criterion</h2></div>
        <p>Use your current evidence to rate each item. Examples are prompts only; confirm requirements with the official rubric.</p>
      </div>
      <details class="award-rating-guide">
        <summary>How to choose a rating <span>Working guide, not the official rubric</span></summary>
        <ol>
          <li><strong>0 · No evidence yet</strong><span>No supporting material is currently available.</span></li>
          <li><strong>1 · Minimal</strong><span>Only a small amount of evidence exists; major gaps remain.</span></li>
          <li><strong>2 · Partial</strong><span>Some activity is documented, but coverage is inconsistent.</span></li>
          <li><strong>3 · Adequate</strong><span>Most activity is documented, with a few gaps to close.</span></li>
          <li><strong>4 · Strong</strong><span>Evidence is organized and supports most of the work.</span></li>
          <li><strong>5 · Exemplary</strong><span>Evidence is complete, clearly organized, and shows outcomes.</span></li>
        </ol>
      </details>
      <div class="award-criteria-grid">
        ${AWARD_CRITERIA.map((criterion, index) => {
          const rating = getAwardRating(state, criterion.id);
          const evidence = String(state.evidence[criterion.id] || "");
          const nextAction = String(state.nextActions[criterion.id] || "");
          const targetDate = String(state.targetDates[criterion.id] || "");
          return `<article class="award-criterion-card" data-award-row="${criterion.id}">
            <div class="award-card-heading">
              <span class="award-card-number">${String(index + 1).padStart(2, "0")}</span>
              <div><h3>${escapeHTML(criterion.label)}</h3><span class="award-weight">${criterion.weight}% of estimate</span></div>
              <strong class="award-card-points" data-award-points data-award-weight="${criterion.weight}">${rating === null ? "—" : awardCriterionPoints(state, criterion)}<small>/${criterion.weight}</small></strong>
            </div>
            <p class="award-hint">${escapeHTML(criterion.hint)}</p>
            <details class="award-evidence-guide">
              <summary>Possible evidence to look for</summary>
              <p>${escapeHTML(criterion.evidenceExamples)} Confirm what is accepted in the current award rules.</p>
            </details>
            <div class="award-field">
              <label for="award-rating-${criterion.id}">Current assessment</label>
              <select id="award-rating-${criterion.id}" class="award-select" data-award-rating="${criterion.id}">
                <option value=""${rating === null ? " selected" : ""}>Choose a rating</option>
                ${AWARD_RATING_LABELS.map((label, value) =>
                  `<option value="${value}"${value === rating ? " selected" : ""}>${value} — ${label}</option>`
                ).join("")}
              </select>
            </div>
            <div class="award-field">
              <label for="award-evidence-${criterion.id}">Evidence reference <span>Where is the document or record?</span></label>
              <input id="award-evidence-${criterion.id}" class="award-input" type="text" maxlength="160" data-award-evidence="${criterion.id}" value="${escapeHTML(evidence)}" placeholder="Folder, file name, or link">
            </div>
            <div class="award-action-fields">
              <div class="award-field">
                <label for="award-action-${criterion.id}">Next action <span>One concrete step to close the gap</span></label>
                <input id="award-action-${criterion.id}" class="award-input" type="text" maxlength="240" data-award-action="${criterion.id}" value="${escapeHTML(nextAction)}" placeholder="e.g. Collect the approved event report">
              </div>
              <div class="award-field award-date-field">
                <label for="award-date-${criterion.id}">Target date</label>
                <input id="award-date-${criterion.id}" class="award-input" type="date" data-award-due-date="${criterion.id}" value="${escapeHTML(targetDate)}">
              </div>
            </div>
          </article>`;
        }).join("")}
      </div>
    </section>

    <section class="award-next-steps" aria-labelledby="award-next-steps-title">
      <div class="award-section-heading">
        <div><p class="eyebrow">Work in priority order</p><h2 id="award-next-steps-title">Your next steps</h2></div>
        <p>Prioritized by the largest estimated gap and missing evidence references. This is a planning aid, not an official ranking.</p>
      </div>
      <ol class="award-recommendation-list" data-award-recommendations>
        ${renderAwardRecommendations(recommendations)}
      </ol>
    </section>

    <footer class="award-actions">
      <p class="award-footnote">Ratings, references, and action dates stay in this browser; they are not submitted or shared. Keep original documents in your team’s approved shared folder.</p>
      <div class="award-action-buttons">
        <button type="button" class="button button-secondary" data-award-print>Print / save as PDF</button>
        <button type="button" class="button button-secondary" data-award-reset>Clear checklist</button>
      </div>
    </footer>
  </div>`;
}

export function applyAwardCheckpointChange({ field, id, value }) {
  const criterionExists = AWARD_CRITERIA.some(criterion => criterion.id === id);
  if (!criterionExists) return null;
  const state = readAwardCheckpoint();

  if (field === "rating") {
    if (value === "") {
      delete state.ratings[id];
    } else {
      const rating = Number(value);
      if (!Number.isInteger(rating) || rating < 0 || rating > 5) return null;
      state.ratings[id] = rating;
    }
  } else if (field === "evidence") {
    state.evidence[id] = String(value).slice(0, 160);
  } else if (field === "action") {
    state.nextActions[id] = String(value).slice(0, 240);
  } else if (field === "targetDate") {
    const date = String(value);
    state.targetDates[id] = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  } else {
    return null;
  }

  const saved = writeAwardCheckpoint(state);
  const score = computeAwardScore(state);
  const counts = getAwardCounts(state);
  const readiness = awardReadiness(state);

  return {
    percent: Math.round(score),
    assessedCount: counts.assessed,
    evidenceCount: counts.evidence,
    recommendations: buildAwardRecommendations(state),
    status: readiness.label,
    statusKey: readiness.key,
    statusDetail: readiness.detail,
    saved,
    points: field === "rating"
      ? getAwardRating(state, id) === null
        ? "—"
        : String(awardCriterionPoints(state, AWARD_CRITERIA.find(criterion => criterion.id === id)))
      : null
  };
}

export function resetAwardCheckpoint() {
  return writeAwardCheckpoint({ ratings: {}, evidence: {}, nextActions: {}, targetDates: {} });
}

export { AWARD_CRITERIA, AWARD_CHECKPOINT_KEY };

const views = {
  home: renderHome,
  about: renderAbout,
  programs: renderPrograms,
  events: renderEvents,
  "core-members": renderCore,
  wings: renderWings,
  members: renderMembers,
  works: renderWorks,
  login: renderLogin,
  account: renderAccount,
  finance: renderFinance,
  admin: renderAdmin,
  invite: renderInviteOnboarding,
  outreach: renderOutreach,
  samia: renderSamia,
  assemblies: renderAssemblies,
  awardScorecard: renderAwardPlanner
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
    feedback.className = `auth-error ${type === "success" ? "auth-success" : ""}`;
  } else {
    renderRoute("login");
  }
}

export function setPublishedWorks(rows) {
  const presentation = {
    Article: { kind: "article", image: assetPaths.article, imageAlt: "Article preview" },
    Poetry: { kind: "poetry", image: assetPaths.poetry, imageAlt: "Poetry preview" },
    Calligraphy: { kind: "calligraphy", image: assetPaths.calligraphy, imageAlt: "Calligraphy preview" },
    Magazine: { kind: "magazine", image: assetPaths.magazine, imageAlt: "Magazine preview" },
    Art: { kind: "art", image: assetPaths.calligraphy, imageAlt: "Art preview" },
    Project: { kind: "project", image: assetPaths.event, imageAlt: "Project preview" },
    Code: { kind: "code", image: assetPaths.event, imageAlt: "Code preview" }
  };
  publishedWorks = (rows || []).map(row => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    author: row.author_name,
    type: row.work_type,
    excerpt: row.excerpt,
    content: row.content,
    projectUrl: row.project_url,
    codeSnippet: row.code_snippet,
    date: new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(row.created_at || Date.now())),
    ...(presentation[row.work_type] || presentation.Article),
    image: row.image_url || (presentation[row.work_type] || presentation.Article).image
  }));
}

export function setPortalWings(rows) {
  portalWings = (rows || []).map(wing => ({
    id: wing.id,
    name: wing.name,
    accent: wing.accent,
    objective: wing.objective,
    activities: wing.activities || [],
    icon: wing.icon
  }));
  announcements = announcements.map(item => ({
    ...item,
    wingName: portalWings.find(w => w.id === item.wing_id)?.name || null
  }));
  if (["home", "wings", "admin", "account", "programs"].includes(getActiveRoute())) renderRoute();
}

export function setPortalMembers(rows) {
  if (!rows) {
    portalMembers = [];
    setMonthlyFundDirectory([]);
    if (["members", "core", "works", "home", "programs", "finance"].includes(getActiveRoute())) renderRoute();
    return;
  }
  portalMembers = rows.map(row => {
    const name = row.display_name || row.roll_number || "Unnamed account";
    return {
      id: row.id,
      role: row.role,
      name,
      initials: name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase(),
      roll: row.roll_number || "",
      house: row.house_team || "Student",
      district: row.district || "District not added",
      bio: row.bio || "",
      skills: []
    };
  });
  setMonthlyFundDirectory(portalMembers);
  if (["members", "core", "works", "home", "programs", "finance", "account"].includes(getActiveRoute())) renderRoute();
}

export function setPortalEvents(rows) {
  portalEvents = (rows || []).map(event => ({
    ...event,
    date: event.starts_at,
    status: new Date(event.starts_at).getTime() > Date.now() ? "Upcoming" : "Completed",
    time: event.time_label,
    image: assetPaths.event,
    imageAlt: "Illustrated ADAB event artwork"
  }));
  if (["home", "events", "programs"].includes(getActiveRoute())) renderRoute();
}

export function setProgramPosters(rows) {
  programPosters = (rows || []).map(poster => ({
    ...poster,
    poster_url: poster.poster_url || null
  }));
  if (getActiveRoute() === "programs") renderRoute();
}

export function setAnnouncements(rows) {
  announcements = (rows || []).map(item => ({
    ...item,
    wingName: portalWings.find(w => w.id === item.wing_id)?.name || null
  }));
  if (getActiveRoute() === "home") renderRoute();
}

export function setFinanceEntries(rows, loading = false) {
  financeEntries = rows || [];
  financeLoading = loading;
  if (getActiveRoute() === "finance") renderRoute();
}

export function setBudgetAllocations(rows, loading = false) {
  budgetAllocations = rows || [];
  budgetLoading = loading;
  if (getActiveRoute() === "finance") renderRoute();
}

export function setAdminProfiles(rows, loading = false) {
  adminProfiles = rows || [];
  adminLoading = loading;
  if (getActiveRoute() === "admin") renderRoute();
}

export function setReviewData(works, suggestions) {
  reviewWorks = works || [];
  reviewSuggestions = suggestions || [];
  if (getActiveRoute() === "account") renderRoute();
}

export function setLastCreatedAccount(account) {
  lastCreatedAccount = account;
}

export function setAdminActiveTab(tab) {
  adminActiveTab = tab;
  if (getActiveRoute() === "admin") renderRoute();
}

export function setFinanceFilter(type, search = "") {
  financeFilterType = type;
  financeSearchQuery = search;
  if (getActiveRoute() !== "finance") return;
  const activeElement = document.activeElement;
  const selectionStart = activeElement instanceof HTMLInputElement
    ? activeElement.selectionStart
    : null;
  renderRoute();
  if (activeElement?.id === "ledger-search") {
    const searchInput = document.querySelector("#ledger-search");
    searchInput?.focus();
    if (searchInput instanceof HTMLInputElement && selectionStart !== null) {
      searchInput.setSelectionRange(selectionStart, selectionStart);
    }
  }
}

export function setContentCategory(cat) {
  contentCategoryFilter = cat;
  if (getActiveRoute() === "admin") renderRoute();
}

export function getActiveRoute() {
  const fullHash = location.hash.slice(1);
  const [baseRoute, queryString] = fullHash.split("?");
  const route = baseRoute.split("#")[0];
  const normalizedRoute = route.replace(/-\w/g, c => c[1].toUpperCase());

  if (route === "admin" && queryString) {
    const params = new URLSearchParams(queryString);
    const tabParam = params.get("tab");
    if (tabParam && ["create", "invites", "roster", "content", "wings"].includes(tabParam)) {
      adminActiveTab = tabParam;
    }
  }

  if (route.startsWith("admin/invite") || route === "admin-invite") {
    adminActiveTab = "invites";
    return "admin";
  }
  return Object.hasOwn(views, route) ? route
    : Object.hasOwn(views, normalizedRoute) ? normalizedRoute
    : "home";
}

export function renderRoute(route = getActiveRoute()) {
  if (!root) {
    console.error("Critical: #view-root container not found in DOM.");
    return;
  }

  try {
    const render = views[route] || views.home;
    root.innerHTML = render() || "";
    root.dataset.route = route;
    const activeHash = location.hash.slice(1).split("?")[0].split("#")[0];
    const displayRoute = route
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replaceAll("-", " ")
      .replace(/\b\w/g, character => character.toUpperCase());
    document.title = route === "home" ? "ADAB Class Union" : `${displayRoute} · ADAB`;

    // Update navigation links
    document.querySelectorAll("[data-route]").forEach(link => {
      if (link.dataset.route === route || link.dataset.route === activeHash) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    const accountLink = document.querySelector(".account-nav-link");
    if (accountLink) {
      accountLink.textContent = currentUser ? "Account" : "Sign in";
      accountLink.href = currentUser ? "#account" : "#login";
      accountLink.dataset.route = currentUser ? "account" : "login";
    }

    // Finance link in nav: STRICTLY HIDDEN to unauthenticated visitors
    document.querySelectorAll(".member-nav-link").forEach(link => {
      link.hidden = !currentProfile || !currentProfile.is_active;
    });

    // Admin link in nav: Shown only to Developer
    const adminLink = document.querySelector(".developer-nav-link");
    if (adminLink) {
      adminLink.hidden = currentProfile?.role !== "developer";
    }

    // Update dynamic footer copy
    const footerTagline = document.querySelector(".footer-brand p");
    if (footerTagline) footerTagline.textContent = getContent("footer_tagline");
    const footerLocation = document.querySelector(".footer-main div:nth-child(4) p");
    if (footerLocation) footerLocation.innerHTML = escapeHTML(getContent("footer_location_body")).replaceAll("\n", "<br>");
    const footerCopyright = document.querySelector("#footer-copyright-text");
    if (footerCopyright) footerCopyright.textContent = getContent("footer_copyright");

    window.scrollTo(0, 0);
    root.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent("adab:route-rendered", { detail: { route } }));
  } catch (error) {
    console.error(`Error rendering route [${route}]:`, error);
    root.innerHTML = `<div class="page-shell"><div class="empty-state"><strong>Unable to load section</strong><p>Please check your connection or refresh the page.</p><a class="button" href="#home">Return Home</a></div></div>`;
  }
}

export const routeData = { coreMembers, creativeWorks, events, students };
