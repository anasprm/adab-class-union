const STORAGE_KEY = "award_checkpoint_v1";
const SOURCE_URL = "https://www.scribd.com/document/876387982/CAU-BUA-Criteria-2025-26";

const PROVISIONS = [
  {
    title: "Union activities",
    weight: 50,
    description: "Three weighted categories within the largest provision.",
    categories: [
      ["SRSA · 50% of provision (25% overall)", "Students’ Resource and Social Affairs: guest talks, cultural programmes, social affairs, special days, public welfare, ideal programmes, GK clubs, and literature programmes."],
      ["LIP · 30% of provision (15% overall)", "Language Improvement Programme: debate clubs, multilingual festivals, language clubs and weeks, and daily notes. The notice names Malayalam, English, Arabic, and Urdu."],
      ["Union Awards · 20% of provision (10% overall)", "Student of the year, Islamic fields, writing, speaking, reading, general knowledge, social work, sports, and mental health. The notice emphasizes clear criteria and careful selection."]
    ]
  },
  {
    title: "Outreach programmes",
    weight: 20,
    description: "Union programmes outside campus and student participation in external activities.",
    categories: [
      ["Union outreach", "Seminars, webinars, colloquia, public programmes, literature festivals, competitions, and publications at local through national levels."],
      ["Student outreach skills", "The copy says 40% of marks in this category relate to students’ participation in outside-campus programmes. It does not make the remaining subcategory weights clear."]
    ]
  },
  {
    title: "Publishing bureau",
    weight: 10,
    description: "Campus publications produced by the union.",
    categories: [
      ["Digital mouthpiece · monthly", "The notice calls for one each month and says language mouthpieces receive importance."],
      ["Magazines · at least two per year", "Submit by DSU’s directed date; the copy says additional magazines receive higher marks. Keep PDFs, including scans of handmade magazines."],
      ["Other publications", "Literary periodicals, editorial publications, and language notes."]
    ]
  },
  {
    title: "Inspection",
    weight: 10,
    description: "Direct examination of required facilities and documents; inspection marks are awarded at year-end.",
    categories: [
      ["Mandatory", "Office; Societies Act registration certificate; seal; letter pad; constitution; minutes, event, and report books; student membership; receipts, ledger, vouchers, day book; mobile phone; prospectus; Facebook and Instagram."],
      ["Additional", "Official computer, blog, website, and YouTube. The copy particularly emphasizes clearing documents and financial records."]
    ]
  },
  {
    title: "Bonus point quota",
    weight: 10,
    description: "Additional contributions named by the criteria copy.",
    categories: [
      ["Bonus evidence", "Media coverage and online reach, active union social accounts, and cooperation with DSU."]
    ]
  }
];

const INSPECTION_ITEMS = [
  ["office", "Union office", true],
  ["registration", "Societies Act registration certificate", true],
  ["seal", "Union seal", true],
  ["letter-pad", "Official letter pad", true],
  ["constitution", "Union constitution", true],
  ["minutes", "Minutes book", true],
  ["event-book", "Event book", true],
  ["report-book", "Report book", true],
  ["membership", "Student membership records", true],
  ["receipts", "Receipts", true],
  ["ledger", "Ledger", true],
  ["vouchers", "Vouchers", true],
  ["day-book", "Day book", true],
  ["mobile", "Union mobile phone", true],
  ["prospectus", "Union prospectus", true],
  ["facebook", "Facebook page", true],
  ["instagram", "Instagram account", true],
  ["computer", "Official computer", false],
  ["blog", "Union blog", false],
  ["website", "Union website", false],
  ["youtube", "YouTube channel", false]
];

const BONUS_ITEMS = [
  ["media-coverage", "Media coverage and online reach"],
  ["social-accounts", "Active union social-media accounts"],
  ["dsu-cooperation", "Cooperation and communication with DSU"]
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
  if (!activities.length) return `<p class="award-empty-state">No programmes logged yet. Record each activity with its scope, response, and poster reference.</p>`;
  return `<div class="award-record-list">${[...activities].sort((a, b) => String(b.date).localeCompare(String(a.date))).map(item => {
    const complete = item.title && item.date && item.scope && item.response && item.poster
      && (item.format !== "stage" || (item.clip && Number(item.duration) > 0 && Number(item.duration) <= 1));
    return `<article class="award-record-card">
      <div class="award-record-header"><div><span class="badge">${escapeHTML(item.categoryLabel)}</span><h3>${escapeHTML(item.title)}</h3></div><span class="award-record-status" data-ready="${Boolean(complete)}">${complete ? "Record complete" : "Evidence gap"}</span></div>
      <p class="award-record-meta">${escapeHTML(item.date)} · ${item.format === "stage" ? "Stage" : "Non-stage"}${item.participants ? ` · ${escapeHTML(item.participants)} members` : ""}</p>
      <dl class="award-record-details"><div><dt>Scope</dt><dd>${escapeHTML(item.scope || "Not recorded")}</dd></div><div><dt>Response / outcome</dt><dd>${escapeHTML(item.response || "Not recorded")}</dd></div><div><dt>Poster</dt><dd>${escapeHTML(item.poster || "Missing")}</dd></div>
      ${item.format === "stage" ? `<div><dt>Status clip</dt><dd>${escapeHTML(item.clip || "Missing")}${item.duration ? ` · ${escapeHTML(item.duration)} min` : ""}</dd></div>` : ""}
      ${item.document ? `<div><dt>Report / minutes</dt><dd>${escapeHTML(item.document)}</dd></div>` : ""}</dl>
      <button class="button button-secondary award-remove-button" type="button" data-award-remove="activities" data-award-id="${escapeHTML(item.id)}">Remove record</button>
    </article>`;
  }).join("")}</div>`;
}

function renderReports(reports) {
  if (!reports.length) return `<p class="award-empty-state">No monthly reports logged. The criteria copy asks UG unions to send their programme list to DSU by the 30th of each month; confirm the current deadline and delivery route.</p>`;
  return `<div class="award-record-list">${[...reports].sort((a, b) => String(b.month).localeCompare(String(a.month))).map(item => `<article class="award-compact-record"><div><h3>${escapeHTML(item.month)}</h3><p>${item.status === "submitted" ? `Submitted ${escapeHTML(item.submittedOn || "")}` : "In preparation"}${item.reference ? ` · ${escapeHTML(item.reference)}` : ""}</p></div><button class="button button-secondary award-remove-button" type="button" data-award-remove="reports" data-award-id="${escapeHTML(item.id)}">Remove</button></article>`).join("")}</div>`;
}

function renderPublications(publications, year) {
  const items = publications.filter(item => item.date?.startsWith(`${year}-`));
  if (!items.length) return `<p class="award-empty-state">No publications logged for ${year}. Track one digital mouthpiece each month and at least two magazines in the reporting year.</p>`;
  return `<div class="award-record-list">${[...items].sort((a, b) => String(b.date).localeCompare(String(a.date))).map(item => `<article class="award-compact-record"><div><span class="badge">${item.kind === "mouthpiece" ? "Digital mouthpiece" : item.kind === "magazine" ? "Magazine" : "Other publication"}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.date)}${item.language ? ` · ${escapeHTML(item.language)}` : ""} · ${escapeHTML(item.reference)}</p></div><button class="button button-secondary award-remove-button" type="button" data-award-remove="publications" data-award-id="${escapeHTML(item.id)}">Remove</button></article>`).join("")}</div>`;
}

export function renderAwardPlanner() {
  const state = readPlanner();
  const year = String(new Date().getFullYear());
  const mouthpieces = state.publications.filter(item => item.kind === "mouthpiece" && item.date?.startsWith(`${year}-`));
  const mouthpieceMonths = new Set(mouthpieces.map(item => item.date.slice(0, 7))).size;
  const magazines = state.publications.filter(item => item.kind === "magazine" && item.date?.startsWith(`${year}-`)).length;
  const reportsSubmitted = state.reports.filter(item => item.status === "submitted").length;
  const readyInspection = INSPECTION_ITEMS.filter(([id]) => state.inspection[id]?.ready).length;
  const mandatoryItems = INSPECTION_ITEMS.filter(([, , mandatory]) => mandatory);
  const additionalItems = INSPECTION_ITEMS.filter(([, , mandatory]) => !mandatory);
  const activityCategories = [
    ["SRSA", "Union activities · SRSA"],
    ["LIP", "Union activities · Language improvement"],
    ["Union Awards", "Union activities · Union awards"],
    ["Union outreach", "Outreach · Union programme"],
    ["Student outreach", "Outreach · Student participation"],
    ["Publishing", "Publishing bureau"],
    ["Bonus", "Bonus point quota"]
  ];

  return `<div class="award-ledger">
    <header class="award-ledger-head">
      <p class="eyebrow">Dr. U. Bapputty Haji Best Union Award</p>
      <h1 class="page-title">Turn the notice into a working plan.</h1>
      <p class="lead">Log activities, track monthly reporting and publications, and prepare inspection documents. This page follows the accessible criteria copy linked below—not an official scoring calculator.</p>
      <aside class="award-source-warning"><strong>Verify the current notice before relying on these requirements.</strong><p>The accessible copy’s title says 2023–24 while its URL says 2025–26. The five provisions and percentages below are transcribed from that copy; check any updated CAU/DSU notice, deadlines, and submission instructions with your coordinator.</p><a href="${SOURCE_URL}" target="_blank" rel="noopener noreferrer">Open the criteria copy on Scribd ↗</a></aside>
      ${state.legacyDraft ? `<p class="award-legacy-notice">Your earlier self-rating draft is preserved in this browser but was not converted because its categories do not match these five provisions.</p>` : ""}
      <section class="award-overview" aria-label="Award planning progress">
        <article class="award-overview-card"><span class="award-overview-label">Programme records</span><strong>${state.activities.length}</strong><small>logged in this browser</small></article>
        <article class="award-overview-card"><span class="award-overview-label">Monthly reports</span><strong>${reportsSubmitted}</strong><small>marked submitted</small></article>
        <article class="award-overview-card"><span class="award-overview-label">Publishing · ${year}</span><strong>${mouthpieceMonths}<small>/12 months</small></strong><small>${magazines}/2 magazines logged</small></article>
        <article class="award-overview-card"><span class="award-overview-label">Inspection checklist</span><strong>${readyInspection}<small>/${INSPECTION_ITEMS.length}</small></strong><small>mandatory and additional items</small></article>
      </section>
      <p class="award-save-status" data-award-save-status>${state.wasSaved ? "Planner data is saved in this browser." : "Planner data will be saved in this browser when you make changes."}</p>
    </header>

    <section class="award-workspace" aria-labelledby="award-provisions-title">
      <div class="award-section-heading"><div><p class="eyebrow">Criteria in the accessible copy</p><h2 id="award-provisions-title">Five award provisions</h2></div><p>Weights are reproduced as stated. The document does not provide a complete point-by-point scoring formula.</p></div>
      <div class="award-provision-grid">${PROVISIONS.map((provision, index) => `<article class="award-provision-card"><div class="award-provision-heading"><span class="award-card-number">${String(index + 1).padStart(2, "0")}</span><h3>${escapeHTML(provision.title)}</h3><strong>${provision.weight}<small>%</small></strong></div><p>${escapeHTML(provision.description)}</p><div class="award-category-list">${provision.categories.map(([title, detail]) => `<div><strong>${escapeHTML(title)}</strong><p>${escapeHTML(detail)}</p></div>`).join("")}</div></article>`).join("")}</div>
    </section>

    <section class="award-workspace" aria-labelledby="award-activity-title">
      <div class="award-section-heading"><div><p class="eyebrow">Provisions 1, 2 and 5</p><h2 id="award-activity-title">Programme register</h2></div><p>The notice calls for each programme to be documented with its scope, response, and poster. Keep stage and non-stage events distinct.</p></div>
      <form class="award-form" id="award-activity-form">
        <div class="award-form-grid">
          <div class="award-field"><label for="award-activity-title-input">Programme name</label><input id="award-activity-title-input" name="title" maxlength="120" required></div>
          <div class="award-field"><label for="award-activity-date">Date</label><input id="award-activity-date" name="date" type="date" required></div>
          <div class="award-field"><label for="award-activity-category">Notice category</label><select id="award-activity-category" name="category" required><option value="">Choose category</option>${activityCategories.map(([value, label]) => `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`).join("")}</select></div>
          <div class="award-field"><label for="award-activity-format">Programme format</label><select id="award-activity-format" name="format" required><option value="">Choose format</option><option value="stage">Stage event</option><option value="non-stage">Non-stage event</option></select></div>
        </div>
        <div class="award-field"><label for="award-activity-scope">Scope / purpose</label><textarea id="award-activity-scope" name="scope" maxlength="500" required placeholder="What was the programme intended to do?"></textarea></div>
        <div class="award-field"><label for="award-activity-response">Response / outcome</label><textarea id="award-activity-response" name="response" maxlength="500" required placeholder="What happened, who participated, and what was the result?"></textarea></div>
        <div class="award-form-grid"><div class="award-field"><label for="award-activity-poster">Poster file or photo reference</label><input id="award-activity-poster" name="poster" maxlength="180" required placeholder="File name or shared-folder path"></div><div class="award-field"><label for="award-activity-document">Report / minutes reference <span>Optional</span></label><input id="award-activity-document" name="document" maxlength="180" placeholder="Report, minutes, or archive location"></div></div>
        <fieldset class="award-stage-fields" id="award-stage-fields" hidden><legend>Stage-event evidence</legend><p class="form-note">The notice asks for a status clip of at most one minute showing participating guests, plus the event poster.</p><div class="award-form-grid"><div class="award-field"><label for="award-activity-clip">Status clip file reference</label><input id="award-activity-clip" name="clip" maxlength="180" placeholder="Video file or shared-folder path"></div><div class="award-field"><label for="award-activity-duration">Clip duration (minutes)</label><input id="award-activity-duration" name="duration" type="number" min="0.01" max="1" step="0.01" placeholder="Maximum 1 minute"></div><div class="award-field"><label for="award-activity-participants">Union members involved <span>Optional count</span></label><input id="award-activity-participants" name="participants" type="number" min="0" max="9999"></div></div></fieldset>
        <button class="button" type="submit">Add programme record</button>
      </form>
      <div class="award-record-section"><h3>Logged programmes</h3>${renderActivities(state.activities)}</div>
    </section>

    <section class="award-workspace award-two-column" aria-label="Reporting and publishing">
      <div class="award-subsection"><div class="award-section-heading"><div><p class="eyebrow">Monthly reporting</p><h2>Send the programme list</h2></div></div>
        <p class="award-practical-note">The criteria copy asks UG unions to send their monthly programme list to DSU by the 30th. Confirm the current delivery route and exact deadline, especially for February.</p>
        <form class="award-form" id="award-report-form"><div class="award-form-grid"><div class="award-field"><label for="award-report-month">Report month</label><input id="award-report-month" name="month" type="month" required></div><div class="award-field"><label for="award-report-status">Status</label><select id="award-report-status" name="status"><option value="in-progress">In preparation</option><option value="submitted">Submitted</option></select></div><div class="award-field" id="award-report-date-field" hidden><label for="award-report-date">Submitted on</label><input id="award-report-date" name="submittedOn" type="date"></div></div><div class="award-field"><label for="award-report-reference">Report / receipt reference <span>Optional</span></label><input id="award-report-reference" name="reference" maxlength="180"></div><button class="button" type="submit">Save monthly report</button></form>
        <div class="award-record-section"><h3>Report history</h3>${renderReports(state.reports)}</div>
      </div>
      <div class="award-subsection"><div class="award-section-heading"><div><p class="eyebrow">Publishing bureau · ${year}</p><h2>Track required publications</h2></div></div>
        <p class="award-practical-note">The accessible notice says one digital mouthpiece each month and at least two magazines per year; additional magazines may receive higher marks. The counts here use calendar years—align them with the current award cycle.</p>
        <form class="award-form" id="award-publication-form"><div class="award-form-grid"><div class="award-field"><label for="award-publication-kind">Publication type</label><select id="award-publication-kind" name="kind"><option value="mouthpiece">Digital mouthpiece</option><option value="magazine">Magazine</option><option value="other">Other periodical / editorial</option></select></div><div class="award-field"><label for="award-publication-date">Release date</label><input id="award-publication-date" name="date" type="date" required></div></div><div class="award-form-grid"><div class="award-field"><label for="award-publication-title">Title / issue</label><input id="award-publication-title" name="title" maxlength="120" required></div><div class="award-field"><label for="award-publication-language">Language <span>Optional</span></label><input id="award-publication-language" name="language" maxlength="40"></div></div><div class="award-field"><label for="award-publication-reference">PDF or archive reference</label><input id="award-publication-reference" name="reference" maxlength="180" required placeholder="File name or folder location"></div><button class="button" type="submit">Add publication record</button></form>
        <div class="award-record-section"><h3>${year} · ${mouthpieceMonths}/12 mouthpiece months · ${magazines}/2 magazines</h3>${renderPublications(state.publications, year)}</div>
      </div>
    </section>

    <section class="award-workspace" aria-labelledby="award-inspection-title"><div class="award-section-heading"><div><p class="eyebrow">Provision 4 · Inspection</p><h2 id="award-inspection-title">Prepare the inspection file</h2></div><p>Inspection is by direct examination. The criteria copy says inspection marks are awarded at year-end. Mark items ready only when available to show.</p></div>
      <div class="award-checklist-grid"><section class="award-checklist-panel"><h3>Mandatory facilities and documents</h3><p>Identified as mandatory in the criteria copy.</p>${makeReferenceChecklist(mandatoryItems.map(([id, label]) => [id, label]), state.inspection, "inspection")}</section><section class="award-checklist-panel"><h3>Additional items</h3><p>Listed as additional considerations, not mandatory items.</p>${makeReferenceChecklist(additionalItems.map(([id, label]) => [id, label]), state.inspection, "inspection")}</section></div>
    </section>

    <section class="award-workspace" aria-labelledby="award-bonus-title"><div class="award-section-heading"><div><p class="eyebrow">Provision 5 · Bonus point quota</p><h2 id="award-bonus-title">Keep bonus evidence together</h2></div><p>The notice names media coverage and online reach, active social accounts, and cooperation with DSU.</p></div><div class="award-bonus-grid">${makeReferenceChecklist(BONUS_ITEMS, state.bonus, "bonus")}</div></section>

    <section class="award-rules-panel"><p class="eyebrow">Before submission</p><h2>Document consistently. Report honestly.</h2><ul><li>Submit stage and non-stage programmes separately.</li><li>Include each programme’s scope, response, and poster; keep the poster’s soft copy or a photo of a handmade poster.</li><li>For stage events, retain the requested status clip (maximum one minute) and verify it shows participating guests.</li><li>Keep PDFs of magazines, including scans of handmade magazines.</li><li>The notice warns that bogus programme submissions are a serious offence.</li><li>Document union-award actions in the month the award is announced.</li></ul></section>

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
    const required = ["title", "date", "category", "format", "scope", "response", "poster"];
    if (required.some(key => !String(values[key] || "").trim())) return { handled: true, ok: false, message: "Complete the required programme details and poster reference." };
    if (values.format === "stage" && (!String(values.clip || "").trim() || !(Number(values.duration) > 0 && Number(values.duration) <= 1))) {
      return { handled: true, ok: false, message: "Stage events need a status-clip reference and a clip duration of 1 minute or less." };
    }
    state.activities.push({
      id: createId(),
      ...values,
      categoryLabel: form.elements.category.selectedOptions[0]?.textContent || values.category
    });
  } else if (form.id === "award-report-form") {
    if (!/^\d{4}-\d{2}$/.test(values.month || "")) return { handled: true, ok: false, message: "Choose a valid report month." };
    if (values.status === "submitted" && !values.submittedOn) return { handled: true, ok: false, message: "Enter the submission date for a report marked submitted." };
    state.reports = state.reports.filter(item => item.month !== values.month);
    state.reports.push({ id: createId(), ...values });
  } else if (form.id === "award-publication-form") {
    if (!values.kind || !values.title?.trim() || !values.date || !values.reference?.trim()) return { handled: true, ok: false, message: "Enter the publication type, title, release date, and PDF or archive reference." };
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
  const allowed = section === "inspection"
    ? INSPECTION_ITEMS.some(item => item[0] === id)
    : section === "bonus" && BONUS_ITEMS.some(item => item[0] === id);
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
