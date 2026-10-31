import { students, studentProfiles, getStudentAchievementSummary, avatarOptions, achievementRecords } from "./data.js";

const backdrop = document.querySelector("#modal-backdrop");
const content = document.querySelector("#modal-content");
const closeButton = document.querySelector(".modal-close");
let previouslyFocused;
let publishedWorks = [];
let portalEvents = [];
let portalMembers = [];

const escapeHTML = value => 
  String(value).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, '"').replace(/'/g, "''");

function openModal(markup) {
  previouslyFocused = document.activeElement;
  content.innerHTML = markup;
  backdrop.hidden = false;
  document.body.style.overflow = "hidden";
  closeButton.focus();
}

export function closeModal() {
  if (backdrop.hidden) return;
  backdrop.hidden = true;
  content.replaceChildren();
  document.body.style.overflow = "";
  if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
}

function showEvent(event) {
  openModal("<img class=\"modal-preview modal-event-preview\" src=\"" + escapeHTML(event.image) + "\" alt=\"" + escapeHTML(event.imageAlt) + "\"><p class=\"eyebrow\">" + escapeHTML(event.category) + " · " + escapeHTML(event.status) + "</p><h2 id=\"modal-title\">" + escapeHTML(event.title) + "</h2><p>" + escapeHTML(event.description) + "</p><div class=\"event-meta\"><span>◷ " + escapeHTML(event.time) + "</span><span>⌖ " + escapeHTML(event.venue) + "</span><span>▣ " + escapeHTML(new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(event.date))) + "</span></div>");
}

function showWork(work) {
  openModal("<img class=\"modal-preview modal-work-preview\" src=\"" + escapeHTML(work.image) + "\" alt=\"" + escapeHTML(work.imageAlt) + "\"><p class=\"eyebrow\">" + escapeHTML(work.type) + " · " + escapeHTML(work.date) + "</p><h2 id=\"modal-title\">" + escapeHTML(work.title) + "</h2><p><strong>By " + escapeHTML(work.author) + "</strong></p><p>" + escapeHTML(work.content).replace(/\n/g, "<br>") + "</p>");
}

function showMember(member) {
  const profile = studentProfiles[member.id] || { avatarBase64: "", bio: "", tagline: "", achievements: [] };
  const summary = getStudentAchievementSummary(member.id);

  // Build achievement list HTML
  let achievementsHtml = "";
  if (summary.count > 0) {
    const studentAchievements = studentProfiles[member.id]?.achievements || achievementRecords.filter(a => a.studentId === member.id);
    achievementsHtml = "<div style=\"margin-top: 12px; max-height: 150px; overflow-y: auto; border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px;\">" + studentAchievements.map(ach => {
      const levelColors = { Campus: "#10B981", District: "#F59E0B", State: "#EF4444", College: "#A5F3FC" };
      const levelLabels = { Campus: "Campus", District: "District", State: "State", College: "College" };
      const categoryColors = { Academic: "#3B82F6", Cultural: "#84CC16", Sports: "#F97316", "SAMIA Outreach": "#EC4899" };
      const categoryLabels = { Academic: "Academic", Cultural: "Cultural", Sports: "Sports", "SAMIA Outreach": "SAMIA Outreach" };
      return "<div style=\"background: #F9FAFB; padding: 6px 8px; margin: 4px 0; border-radius: 6px; font-size: .68rem;\"><strong style=\"color: #111827;\">" + escapeHTML(ach.title) + "</strong><span style=\"color: #6B7280; font-size: .62rem; margin-left: 4px;\">" + (levelLabels[ach.awardLevel] || ach.awardLevel) + " · " + (categoryLabels[ach.category] || ach.category) + "</span></div>";
    }).join("") + "</div>";
  }

  // Avatar HTML
  let avatarHtml = "";
  if (profile.avatarBase64) {
    avatarHtml = "<img class=\"modal-profile-avatar\" src=\"data:image/png;base64," + profile.avatarBase64 + "\" alt=\"" + escapeHTML(member.name) + "\" style=\"width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #DC2626; margin-bottom: 12px;\">";
  } else {
    const avatarOpt = avatarOptions.find(a => a.id === "avatar-1") || avatarOptions[0];
    avatarHtml = "<div class=\"modal-profile-avatar-placeholder\" style=\"width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(145deg, #DC2626, #991B1B); display: grid; place-items: center; color: #fff; font-size: 1.2rem; font-weight: 800; border: 3px solid #DC2626; margin-bottom: 12px;\">" + avatarOpt.icon + "</div>";
  }

  // Avatar badges HTML
  let achievementBadges = "";
  if (summary.count > 0) {
    achievementBadges = "<div style=\"margin-top: 12px;\"><strong style=\"color: #DC2626; font-size: .72rem;\">🏆 " + summary.count + " Achievement" + (summary.count !== 1 ? "s" : "") + "</strong></div>";
  }

  openModal("<div class=\"modal-profile-container\">" + avatarHtml + "<div style=\"flex: 1; min-width: 0;\"><h2 id=\"modal-profile-title\" style=\"color: #111827; margin-bottom: 8px;\">" + escapeHTML(member.name) + "</h2><div style=\"display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #E5E7EB;\"><span class=\"badge\" style=\"font-size: .72rem; padding: 4px 8px; background: #F9FAFB; color: #111827;\">" + escapeHTML(member.house) + "</span><span style=\"font-size: .68rem; color: #6B7280;\">" + escapeHTML(member.roll) + "</span></div><p style=\"color: #6B7280; font-size: .82rem; margin: 8px 0;\">" + escapeHTML(member.district) + "</p>" + (profile.tagline ? "<p style=\"color: #DC2626; font-size: .78rem; font-weight: 600; margin: 4px 0;\">" + escapeHTML(profile.tagline) + "</p>" : "") + "<p style=\"color: #6B7280; font-size: .82rem; line-height: 1.5;\">" + escapeHTML(profile.bio) + "</p>" + achievementBadges + achievementsHtml + "</div><div style=\"margin-top: 20px; text-align: right;\"><button type=\"button\" class=\"button\" onclick=\"document.querySelector('#modal-backdrop').hidden = true\">Close</button></div></div>");
}

function showProgram(program) {
  const hasResult = program.hasResult || program.result !== undefined;
  const resultHtml = hasResult ? `
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #E5E7EB;">
      <strong style="color: #DC2626; font-size: .8rem;">Results</strong>
      <p style="color: #111827; margin: 4px 0;">${program.result ? program.result.position : "Position pending"}</p>
      <p style="color: #6B7280; font-size: .72rem;">Score: ${program.score || "—"} / 100</p>
      <p style="color: #6B7280; font-size: .72rem;">${program.notes || "—"}</p>
    </div>` : "";

  const commentsHtml = program.comments && program.comments.length > 0 ? `
    <div style="margin-top: 12px; max-height: 150px; overflow-y: auto; border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px;">
      ${program.comments.map(c => "<div style=\"font-size: .82rem; margin-bottom: 8px;\"><strong>" + escapeHTML(c.user) + "</strong>" + escapeHTML(c.text) + "</div>").join("")}
    </div>` : "<p style=\"color: #6B7280; font-size: .78rem;\">No comments yet.</p>";

  openModal(`<div class="modal-profile-container" style="max-width: 600px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img class="modal-profile-avatar" src="${program.image}" alt="${escapeHTML(program.title)}" style="width: 200px; height: 200px; border-radius: 12px; object-fit: cover; border: 3px solid #DC2626; margin: 0 auto;">
      <h2 id="modal-profile-title" style="color: #111827; margin: 12px 0 4px;">${escapeHTML(program.title)}</h2>
      <p style="color: #6B7280; font-size: .88rem;">${program.wing} · ${escapeHTML(program.author)}</p>
    </div>
    <div style="color: #6B7280; font-size: .88rem; line-height: 1.5;">
      <p>${escapeHTML(program.caption)}</p>
      ${resultHtml}
    </div>
    <div style="margin-top: 20px; color: #6B7280; font-size: .82rem;">
      <strong>Comments</strong> (${program.comments.length})
      ${commentsHtml}
    </div>
    <div style="margin-top: 24px; text-align: right;">
      <button type="button" class="button" onclick="document.querySelector('#modal-backdrop').hidden = true">Close</button>
    </div>
  </div>`);
}

export function setPublishedWorks(rows) {
  const presentation = {
    Article: { kind: "article", image: assetPaths.article, imageAlt: "Illustrated open notebook and a red pencil" },
    Poetry: { kind: "poetry", image: assetPaths.poetry, imageAlt: "Illustrated rainy morning with a soft crimson sunrise" },
    Calligraphy: { kind: "calligraphy", image: assetPaths.calligraphy, imageAlt: "Original abstract calligraphy-inspired floral line art" },
    Magazine: { kind: "magazine", image: assetPaths.magazine, imageAlt: "Illustrated cover of the first ADAB class magazine" }
  };
  publishedWorks = rows.map(row => ({
    id: row.id,
    title: row.title,
    author: row.author_name,
    type: row.work_type,
    date: new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(row.created_at)),
    content: row.content,
    ...presentation[row.work_type],
    image: row.image_url || presentation[row.work_type].image,
    imageAlt: row.image_url ? "Artwork submitted with " + row.title : presentation[row.work_type].imageAlt
  }));
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
}

export function setPortalMembers(rows) {
  if (!rows) {
    portalMembers = [];
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
      district: row.district || "",
      bio: row.bio || "",
      tagline: "",
      avatarBase64: ""
    };
  });
}

export function initializeModals() {
  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target.closest("[data-event-id], [data-work-id], [data-post-id], [data-member-roll], [data-student-roll]") : null;
    if (!target) return;
    if (target.dataset.eventId) {
      const event = [...events, ...portalEvents].find(item => item.id === target.dataset.eventId);
      if (event) showEvent(event);
    }
    if (target.dataset.workId) {
      const work = [...creativeWorks, ...publishedWorks].find(item => item.id === target.dataset.workId);
      if (work) showWork(work);
    }
    if (target.dataset.postId) {
      const program = portalEvents.find(item => item.id === target.dataset.postId);
      if (!program) {
        const allEvents = [...portalEvents, ...events];
        const prog = allEvents.find(item => item.id === target.dataset.postId);
        if (prog) showProgram(prog);
      } else {
        showProgram(program);
      }
    }
    if (target.dataset.memberRoll) {
      const member = coreMembers.find(item => item.roll === target.dataset.memberRoll);
      if (member) showMember(member);
    }
    if (target.dataset.studentRoll) {
      const member = [...portalMembers, ...students].find(item => item.roll === target.dataset.studentRoll);
      if (member) showMember(member);
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
    if ((event.key === "Enter" || event.key === " ") && event.target instanceof HTMLElement && event.target.matches("[data-event-id], [data-work-id], [data-post-id], [data-member-roll], [data-student-roll]")) {
      event.preventDefault();
      event.target.click();
    }
    if (!backdrop.hidden && event.key === "Tab") {
      const focusable = [...backdrop.querySelectorAll("button, a, input, select, textarea, [tabindex]")];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  closeButton.addEventListener("click", closeModal);
  backdrop.addEventListener("click", event => { if (event.target === backdrop) closeModal(); });
}