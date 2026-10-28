import { coreMembers, creativeWorks, events, students } from "./data.js";

const backdrop = document.querySelector("#modal-backdrop");
const content = document.querySelector("#modal-content");
const closeButton = document.querySelector(".modal-close");
let previouslyFocused;

const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

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
  openModal(`<img class="modal-preview modal-event-preview" src="${escapeHTML(event.image)}" alt="${escapeHTML(event.imageAlt)}"><p class="eyebrow">${escapeHTML(event.category)} · ${escapeHTML(event.status)}</p><h2 id="modal-title">${escapeHTML(event.title)}</h2><p>${escapeHTML(event.description)}</p><div class="event-meta"><span>◷ ${escapeHTML(event.time)}</span><span>⌖ ${escapeHTML(event.venue)}</span><span>▣ ${escapeHTML(new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(event.date)))}</span></div>`);
}

function showWork(work) {
  openModal(`<img class="modal-preview modal-work-preview" src="${escapeHTML(work.image)}" alt="${escapeHTML(work.imageAlt)}"><p class="eyebrow">${escapeHTML(work.type)} · ${escapeHTML(work.date)}</p><h2 id="modal-title">${escapeHTML(work.title)}</h2><p><strong>By ${escapeHTML(work.author)}</strong></p><p>${escapeHTML(work.content).replace(/\n/g, "<br>")}</p>`);
}

function showMember(member) {
  openModal(`<div class="profile-avatar" aria-hidden="true">${escapeHTML(member.initials)}</div><p class="eyebrow">${escapeHTML(member.role || member.house)}</p><h2 id="modal-title">${escapeHTML(member.name)}</h2><p>${escapeHTML(member.roll)} · ${escapeHTML(member.district)}</p>
    ${member.bio ? `<p>${escapeHTML(member.bio)}</p><p>Student profile · ${escapeHTML(member.handle)}</p>` : `<p>House team: ${escapeHTML(member.house)}</p><p>Skills: ${member.skills.map(escapeHTML).join(", ")}</p>`}`);
}

export function initializeModals() {
  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target.closest("[data-event-id], [data-work-id], [data-member-roll], [data-student-roll]") : null;
    if (!target) return;
    if (target.dataset.eventId) showEvent(events.find(item => item.id === target.dataset.eventId));
    if (target.dataset.workId) showWork(creativeWorks.find(item => item.id === target.dataset.workId));
    if (target.dataset.memberRoll) showMember(coreMembers.find(item => item.roll === target.dataset.memberRoll));
    if (target.dataset.studentRoll) showMember(students.find(item => item.roll === target.dataset.studentRoll));
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
    if ((event.key === "Enter" || event.key === " ") && event.target instanceof HTMLElement &&
      event.target.matches("[data-event-id], [data-work-id], [data-member-roll], [data-student-roll]")) {
      event.preventDefault();
      event.target.click();
    }
    if (!backdrop.hidden && event.key === "Tab") {
      const focusable = [...backdrop.querySelectorAll("button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])")];
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
