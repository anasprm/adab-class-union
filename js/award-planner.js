const STORAGE_KEY = "award_checkpoint_v1";

const AWARD_CRITERIA = [
  {
    id: "class-programmes",
    title: "Class Programmes",
    weight: 15,
    description: "Programmes and activities conducted within the class will be evaluated under this category."
  },
  {
    id: "samia",
    title: "Participation in SAMIA Programmes",
    weight: 10,
    description: "Active participation and achievements in SAMIA programmes will be considered."
  },
  {
    id: "highlight",
    title: "Highlight Programme",
    weight: 10,
    description: "Programmes organized by the Class Union for the entire campus community will be evaluated under this category."
  },
  {
    id: "campus-pubs",
    title: "Publications Within Campus",
    weight: 20,
    description: "Campus-based publications such as magazines, articles, newsletters, podcasts and creative works by the class will be evaluated."
  },
  {
    id: "outreach-pubs",
    title: "Outreach Participation and Publications",
    weight: 25,
    description: "Participation in outreach programs and individual publications of students in magazines, newspaper and blogs is evaluated in this category."
  },
  {
    id: "bimonthly",
    title: "Bonus",
    weight: 10,
    description: "Authenticity and punctuality of bimonthly reports and active performance of class union in tasks assigned by SAMIA."
  },
  {
    id: "assembly",
    title: "Assembly",
    weight: 10,
    description: "Based on frequency and quality of weekly assemblies conducted by class union."
  }
];

const BONUS_ITEMS = [
  ["bimonthly-reports", "Bimonthly reports are authentic and submitted on time"],
  ["samia-tasks", "Class Union tasks assigned by SAMIA are actively completed"]
];

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readPlanner() {
  const initial = {
    version: 2,
    activities: [],
    reports: [],
    publications: [],
    inspection: {},
    bonus: {},
    legacyDraft: null,
    wasSaved: false
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return initial;
    const legacyDraft = isRecord(parsed.legacyDraft)
      ? parsed.legacyDraft
      : (isRecord(parsed.ratings) || isRecord(parsed.evidence))
        ? {
          ratings: parsed.ratings || {},
          evidence: parsed.evidence || {},
          nextActions: parsed.nextActions || {},
          targetDates: parsed.targetDates || {}
        }
        : null;
    return {
      ...initial,
      activities: Array.isArray(parsed.activities) ? parsed.activities.filter(isRecord) : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports.filter(isRecord) : [],
      publications: Array.isArray(parsed.publications) ? parsed.publications.filter(isRecord) : [],
      inspection: isRecord(parsed.inspection) ? parsed.inspection : {},
      bonus: isRecord(parsed.bonus) ? parsed.bonus : {},
      legacyDraft,
      wasSaved: parsed.version === 2 || Boolean(legacyDraft) || Boolean(parsed.activities?.length)
    };
  } catch (error) {
    console.warn("Could not read the award planner.", error);
    return initial;
  }
}

function savePlanner(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      activities: state.activities,
      reports: state.reports,
      publications: state.publications,
      inspection: state.inspection,
      bonus: state.bonus,
      legacyDraft: state.legacyDraft
    }));
    return true;
  } catch (error) {
    console.warn("Could not save the award planner.", error);
    return false;
  }
}

function updateSaveStatus(saved) {
  const status = document.querySelector("[data-award-save-status]");
  if (status) {
    status.textContent = saved
      ? "Saved in this browser."
      : "Could not save. Your browser may have storage disabled.";
    status.dataset.saved = String(saved);
  }
}

function makeReferenceChecklist(items, records, section) {
  return items.map(([id, label]) => {
    const item = records[id] || {};
    return `<article class="award-checklist-item">
      <label class="award-checklist-label"><input type="checkbox" data-award-check="${section}" data-award-id="${id}"${item.ready ? " checked" : ""}><span>${escapeHTML(label)}</span></label>
      <label class="award-reference-field"><span>Evidence location</span><input type="text" maxlength="180" data-award-reference="${section}" data-award-id="${id}" value="${escapeHTML(item.reference || "")}" placeholder="File, folder, or link"></label>
    </article>`;
  }).join("");
}

function renderActivities(activities) {
  if (!activities.length) return `<p class="award-empty-state">No programmes logged yet. Choose the matching notice category and record the activity, outcome, and any useful evidence reference.</p>`;
  return `<div class="award-record-list">${[...activities].sort((a, b) => String(b.date).localeCompare(String(a.date))).map(item => {
    const complete = item.title && item.date && item.category && item.scope && item.response;
    const formatLabel = { stage: "Stage", "non-stage": "Non-stage", "weekly-assembly": "Weekly assembly" }[item.format];
    return `<article class="award-record-card">
      <div class="award-record-header"><div><span class="badge">${escapeHTML(item.categoryLabel)}</span><h3>${escapeHTML(item.title)}</h3></div><span class="award-record-status" data-ready="${Boolean(complete)}">${complete ? "Record complete" : "Evidence gap"}</span></div>
      <p class="award-record-meta">${escapeHTML(item.date)}${formatLabel ? ` · ${formatLabel}` : ""}${item.participants ? ` · ${escapeHTML(item.participants)} members` : ""}</p>
      <dl class="award-record-details"><div><dt>Scope</dt><dd>${escapeHTML(item.scope || "Not recorded")}</dd></div><div><dt>Response / outcome</dt><dd>${escapeHTML(item.response || "Not recorded")}</dd></div>${item.poster ? `<div><dt>Evidence reference</dt><dd>${escapeHTML(item.poster)}</dd></div>` : ""}
      ${item.format === "stage" && item.clip ? `<div><dt>Optional clip reference</dt><dd>${escapeHTML(item.clip)}${item.duration ? ` · ${escapeHTML(item.duration)} min` : ""}</dd></div>` : ""}
      ${item.document ? `<div><dt>Report / minutes</dt><dd>${escapeHTML(item.document)}</dd></div>` : ""}</dl>
      <button class="button button-secondary award-remove-button" type="button" data-award-remove="activities" data-award-id="${escapeHTML(item.id)}">Remove record</button>
    </article>`;
  }).join("")}</div>`;
}

function formatReportPeriod(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
  if (!match) return String(value || "Unknown period");
  const year = Number(match[1]);
  const endMonth = Number(match[2]);
  if (endMonth < 2 || endMonth > 12 || endMonth % 2 !== 0) return `Previous monthly entry · ${value}`;
  const start = new Date(year, endMonth - 2, 1).toLocaleString(undefined, { month: "short" });
  const end = new Date(year, endMonth - 1, 1).toLocaleString(undefined, { month: "short" });
  return `${start}–${end} ${year}`;
}

function renderReports(reports) {
  if (!reports.length) return `<p class="award-empty-state">No bimonthly reports logged yet. The notice includes authenticity and punctuality of these reports under the bonus criterion.</p>`;
  return `<div class="award-record-list">${[...reports].sort((a, b) => String(b.month).localeCompare(String(a.month))).map(item => `<article class="award-compact-record"><div><h3>${escapeHTML(formatReportPeriod(item.month))}</h3><p>${item.status === "submitted" ? `Submitted ${escapeHTML(item.submittedOn || "")}` : "In preparation"}${item.reference ? ` · ${escapeHTML(item.reference)}` : ""}</p></div><button class="button button-secondary award-remove-button" type="button" data-award-remove="reports" data-award-id="${escapeHTML(item.id)}">Remove</button></article>`).join("")}</div>`;
}

function renderPublications(publications) {
  if (!publications.length) return `<p class="award-empty-state">No publications logged yet. Add campus and outreach publications to keep their dates and evidence references together.</p>`;
  const publicationLabels = {
    mouthpiece: "Previous digital mouthpiece entry",
    magazine: "Magazine",
    article: "Article",
    newsletter: "Newsletter",
    podcast: "Podcast",
    "creative-work": "Creative work",
    newspaper: "Newspaper",
    blog: "Blog",
    other: "Other publication"
  };
  return `<div class="award-record-list">${[...publications].sort((a, b) => String(b.date).localeCompare(String(a.date))).map(item => `<article class="award-compact-record"><div><span class="badge">${escapeHTML(item.scope === "campus" ? "Within campus" : item.scope === "outreach" ? "Outreach" : "Previous entry")} · ${escapeHTML(publicationLabels[item.kind] || "Publication")}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.date)}${item.language ? ` · ${escapeHTML(item.language)}` : ""}${item.reference ? ` · ${escapeHTML(item.reference)}` : ""}</p></div><button class="button button-secondary award-remove-button" type="button" data-award-remove="publications" data-award-id="${escapeHTML(item.id)}">Remove</button></article>`).join("")}</div>`;
}

export function renderAwardPlanner() {
  const state = readPlanner();
  const bimonthlyReportsSubmitted = state.reports.filter(item => {
    const month = Number(String(item.month || "").slice(-2));
    return item.status === "submitted" && month >= 2 && month <= 12 && month % 2 === 0;
  }).length;
  const activityCategories = AWARD_CRITERIA.map(criterion => [
    criterion.id,
    `${criterion.title} (${criterion.weight}%)`
  ]);

  return `<div class="award-ledger">
    <header class="award-ledger-head">
      <p class="eyebrow">Dr. U. Bapputty Haji Best Union Award · 2026–27</p>
      <h1 class="page-title">Turn the notice into a working plan.</h1>
      <p class="lead">Track programme records, publications, bimonthly reports, and weekly assemblies against the updated award criteria.</p>
      <aside class="award-source-warning"><strong>2026–27 notice</strong><p>The notice applies to Class Unions from Secondary First Year through Degree Final Year. The criteria below follow the notice image you shared; this planner organizes evidence but does not calculate the official award result.</p></aside>
      ${state.legacyDraft ? `<p class="award-legacy-notice">Your earlier self-rating draft is preserved in this browser and has not been converted to the updated notice criteria.</p>` : ""}
      <section class="award-overview" aria-label="Award planning progress">
        <article class="award-overview-card"><span class="award-overview-label">Programme records</span><strong>${state.activities.length}</strong><small>logged in this browser</small></article>
        <article class="award-overview-card"><span class="award-overview-label">Bimonthly reports</span><strong>${bimonthlyReportsSubmitted}</strong><small>periods marked submitted</small></article>
        <article class="award-overview-card"><span class="award-overview-label">Publication records</span><strong>${state.publications.length}</strong><small>campus and outreach</small></article>
        <article class="award-overview-card"><span class="award-overview-label">Award cycle</span><strong>2026–27</strong><small>seven weighted criteria</small></article>
      </section>
      <p class="award-save-status" data-award-save-status>${state.wasSaved ? "Planner data is saved in this browser." : "Planner data will be saved in this browser when you make changes."}</p>
    </header>

    <section class="award-workspace" aria-labelledby="award-provisions-title">
      <div class="award-section-heading"><div><p class="eyebrow">Updated notice · 2026–27</p><h2 id="award-provisions-title">Seven award criteria</h2></div><p>Criteria and weights are shown as stated in the notice you shared.</p></div>
      <div class="award-provision-grid">${AWARD_CRITERIA.map((criterion, index) => `<article class="award-provision-card"><div class="award-provision-heading"><span class="award-card-number">${String(index + 1).padStart(2, "0")}</span><h3>${escapeHTML(criterion.title)}</h3><strong>${criterion.weight}<small>%</small></strong></div><p>${escapeHTML(criterion.description)}</p></article>`).join("")}</div>
    </section>

    <section class="award-workspace" aria-labelledby="award-activity-title">
      <div class="award-section-heading"><div><p class="eyebrow">Programme and assembly evidence</p><h2 id="award-activity-title">Programme register</h2></div><p>Log activities under the matching notice category. Scope, outcomes, and references are planning fields, not additional award criteria.</p></div>
      <form class="award-form" id="award-activity-form">
        <div class="award-form-grid">
          <div class="award-field"><label for="award-activity-title-input">Programme name</label><input id="award-activity-title-input" name="title" maxlength="120" required></div>
          <div class="award-field"><label for="award-activity-date">Date</label><input id="award-activity-date" name="date" type="date" required></div>
          <div class="award-field"><label for="award-activity-category">Notice category</label><select id="award-activity-category" name="category" required><option value="">Choose category</option>${activityCategories.map(([value, label]) => `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`).join("")}</select></div>
          <div class="award-field"><label for="award-activity-format">Activity format <span>Optional</span></label><select id="award-activity-format" name="format"><option value="">Not specified</option><option value="stage">Stage event</option><option value="non-stage">Non-stage event</option><option value="weekly-assembly">Weekly assembly</option></select></div>
        </div>
        <div class="award-field"><label for="award-activity-scope">Scope / purpose</label><textarea id="award-activity-scope" name="scope" maxlength="500" required placeholder="What was the programme intended to do?"></textarea></div>
        <div class="award-field"><label for="award-activity-response">Response / outcome</label><textarea id="award-activity-response" name="response" maxlength="500" required placeholder="What happened, who participated, and what was the result?"></textarea></div>
        <div class="award-form-grid"><div class="award-field"><label for="award-activity-poster">Evidence reference <span>Optional</span></label><input id="award-activity-poster" name="poster" maxlength="180" placeholder="File name, shared-folder path, or link"></div><div class="award-field"><label for="award-activity-document">Report / minutes reference <span>Optional</span></label><input id="award-activity-document" name="document" maxlength="180" placeholder="Report, minutes, or archive location"></div></div>
        <fieldset class="award-stage-fields" id="award-stage-fields" hidden><legend>Optional stage-event notes</legend><p class="form-note">The updated notice does not specify a status-clip requirement or duration.</p><div class="award-form-grid"><div class="award-field"><label for="award-activity-clip">Clip reference <span>Optional</span></label><input id="award-activity-clip" name="clip" maxlength="180" placeholder="Video file or shared-folder path"></div><div class="award-field"><label for="award-activity-duration">Clip duration in minutes <span>Optional</span></label><input id="award-activity-duration" name="duration" type="number" min="0" step="0.01"></div><div class="award-field"><label for="award-activity-participants">Union members involved <span>Optional count</span></label><input id="award-activity-participants" name="participants" type="number" min="0" max="9999"></div></div></fieldset>
        <button class="button" type="submit">Add programme record</button>
      </form>
      <div class="award-record-section"><h3>Logged programmes</h3>${renderActivities(state.activities)}</div>
    </section>

    <section class="award-workspace award-two-column" aria-label="Reporting and publishing">
      <div class="award-subsection"><div class="award-section-heading"><div><p class="eyebrow">Bonus · Bimonthly reports</p><h2>Track report periods</h2></div></div>
        <p class="award-practical-note">The notice includes authenticity and punctuality of bimonthly reports. This tracker uses two-month periods ending in even months; confirm the reporting calendar with SAMIA.</p>
        <form class="award-form" id="award-report-form"><div class="award-form-grid"><div class="award-field"><label for="award-report-month">Period ending month</label><input id="award-report-month" name="month" type="month" required></div><div class="award-field"><label for="award-report-status">Status</label><select id="award-report-status" name="status"><option value="in-progress">In preparation</option><option value="submitted">Submitted</option></select></div><div class="award-field" id="award-report-date-field" hidden><label for="award-report-date">Submitted on</label><input id="award-report-date" name="submittedOn" type="date"></div></div><div class="award-field"><label for="award-report-reference">Report / receipt reference <span>Optional</span></label><input id="award-report-reference" name="reference" maxlength="180"></div><button class="button" type="submit">Save report period</button></form>
        <div class="award-record-section"><h3>Bimonthly report history</h3>${renderReports(state.reports)}</div>
      </div>
      <div class="award-subsection"><div class="award-section-heading"><div><p class="eyebrow">Campus and outreach publications</p><h2>Track publications</h2></div></div>
        <p class="award-practical-note">The notice covers campus publications and outreach participation and publications. It does not specify publication-count targets.</p>
        <form class="award-form" id="award-publication-form"><div class="award-form-grid"><div class="award-field"><label for="award-publication-scope">Criterion</label><select id="award-publication-scope" name="scope" required><option value="campus">Publications within campus</option><option value="outreach">Outreach publications</option></select></div><div class="award-field"><label for="award-publication-kind">Publication type</label><select id="award-publication-kind" name="kind" required><option value="magazine">Magazine</option><option value="article">Article</option><option value="newsletter">Newsletter</option><option value="podcast">Podcast</option><option value="creative-work">Creative work</option><option value="newspaper">Newspaper</option><option value="blog">Blog</option><option value="other">Other</option></select></div></div><div class="award-form-grid"><div class="award-field"><label for="award-publication-date">Release date</label><input id="award-publication-date" name="date" type="date" required></div><div class="award-field"><label for="award-publication-title">Title / issue</label><input id="award-publication-title" name="title" maxlength="120" required></div></div><div class="award-form-grid"><div class="award-field"><label for="award-publication-language">Language <span>Optional</span></label><input id="award-publication-language" name="language" maxlength="40"></div><div class="award-field"><label for="award-publication-reference">Evidence reference</label><input id="award-publication-reference" name="reference" maxlength="180" required placeholder="PDF, link, file name, or archive location"></div></div><button class="button" type="submit">Add publication record</button></form>
        <div class="award-record-section"><h3>Publication records · ${state.publications.length}</h3>${renderPublications(state.publications)}</div>
      </div>
    </section>

    <section class="award-workspace" aria-labelledby="award-bonus-title"><div class="award-section-heading"><div><p class="eyebrow">Criterion 6 · Bonus · 10%</p><h2 id="award-bonus-title">Keep bonus evidence together</h2></div><p>Track report authenticity and punctuality, along with active performance on tasks assigned by SAMIA.</p></div><div class="award-bonus-grid">${makeReferenceChecklist(BONUS_ITEMS, state.bonus, "bonus")}</div></section>

    <section class="award-rules-panel"><p class="eyebrow">Evidence planning</p><h2>Keep records clear and authentic.</h2><ul><li>Classify activities under the criterion they support and record their scope and outcome.</li><li>Keep copies or references for campus and outreach publications.</li><li>Track bimonthly report periods and when each was submitted.</li><li>Record weekly assemblies so their frequency and quality can be reviewed.</li><li>Use this planner to organize evidence; confirm scoring and submission instructions with the award organizers.</li></ul></section>

    <footer class="award-actions"><p class="award-footnote">All entries and evidence references are saved in this browser only; they are not uploaded or shared. Download a backup before changing devices, and keep original files in your union’s approved shared folder.</p><div class="award-action-buttons"><button type="button" class="button button-secondary" data-award-export>Download planner backup</button><button type="button" class="button button-secondary" data-award-print>Print / save as PDF</button><button type="button" class="button button-secondary" data-award-reset>Clear planner</button></div></footer>
  </div>`;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function submitAwardForm(form) {
  if (!["award-activity-form", "award-report-form", "award-publication-form"].includes(form.id)) return null;
  const state = readPlanner();
  const values = Object.fromEntries(new FormData(form).entries());
  if (form.id === "award-activity-form") {
    const required = ["title", "date", "category", "scope", "response"];
    if (required.some(key => !String(values[key] || "").trim())) return { handled: true, ok: false, message: "Complete the required programme details." };
    state.activities.push({
      id: createId(),
      ...values,
      categoryLabel: form.elements.category.selectedOptions[0]?.textContent || values.category
    });
  } else if (form.id === "award-report-form") {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(values.month || "")) return { handled: true, ok: false, message: "Choose a valid report period ending month." };
    if (Number(values.month.slice(-2)) % 2 !== 0) return { handled: true, ok: false, message: "Choose the ending month of a two-month report period: February, April, June, August, October, or December." };
    if (values.status === "submitted" && !values.submittedOn) return { handled: true, ok: false, message: "Enter the submission date for a report marked submitted." };
    state.reports = state.reports.filter(item => item.month !== values.month);
    state.reports.push({ id: createId(), ...values });
  } else if (form.id === "award-publication-form") {
    if (!values.scope || !values.kind || !values.title?.trim() || !values.date || !values.reference?.trim()) return { handled: true, ok: false, message: "Enter the publication criterion, type, title, release date, and evidence reference." };
    state.publications.push({ id: createId(), ...values });
  }
  const saved = savePlanner(state);
  updateSaveStatus(saved);
  return {
    handled: true,
    ok: saved,
    message: saved ? "Award record saved in this browser." : "Could not save the record. Browser storage may be unavailable."
  };
}

export function updateAwardChecklist(section, id, field, value) {
  const allowed = section === "bonus" && BONUS_ITEMS.some(item => item[0] === id);
  if (!allowed || !["ready", "reference"].includes(field)) return false;
  const state = readPlanner();
  state[section][id] ||= {};
  state[section][id][field] = field === "ready" ? Boolean(value) : String(value).slice(0, 180);
  const saved = savePlanner(state);
  updateSaveStatus(saved);
  return saved;
}

export function removeAwardRecord(collection, id) {
  const state = readPlanner();
  if (!["activities", "reports", "publications"].includes(collection)) return false;
  state[collection] = state[collection].filter(item => item.id !== id);
  return savePlanner(state);
}

export function exportAwardPlanner() {
  return JSON.stringify({ format: "adab-best-union-award-planner", exportedAt: new Date().toISOString(), planner: readPlanner() }, null, 2);
}

export function resetAwardPlanner() {
  const state = readPlanner();
  return savePlanner({ activities: [], reports: [], publications: [], inspection: {}, bonus: {}, legacyDraft: state.legacyDraft });
}
