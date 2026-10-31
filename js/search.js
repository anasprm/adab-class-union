import { students, studentProfiles, getStudentAchievementSummary, avatarOptions } from "./data.js";

let directoryStudents = students;
let portalEvents = [];

export function setDirectoryStudents(rows) {
  if (!rows) {
    directoryStudents = students;
    return;
  }
  directoryStudents = rows.map(row => {
    const name = row.display_name || "ADAB student";
    const profile = studentProfiles[row.id] || { avatarBase64: "", bio: "", tagline: "", achievements: [] };
    const summary = getStudentAchievementSummary(row.id);
    return {
      id: row.id,
      name,
      initials: name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase(),
      roll: row.roll_number || row.id,
      house: row.house_team || "Student",
      district: row.district || "",
      avatarBase64: profile.avatarBase64,
      avatarOption: profile.avatarBase64 ? null : avatarOptions[0],
      achievementCount: summary.count,
      achievementByLevel: summary.byLevel,
      achievementByCategory: summary.byCategory,
      bio: profile.bio,
      tagline: profile.tagline
    };
  });
}

export function setPortalSearchEvents(rows) {
  portalEvents = rows.map(event => ({
    ...event,
    date: event.starts_at,
    status: new Date(event.starts_at).getTime() > Date.now() ? "Upcoming" : "Completed",
    time: event.time_label
  }));
}

export function initializeMemberSearch() {
  const grid = document.querySelector("#member-grid");
  if (!grid) return;

  const search = document.querySelector("#member-search");
  const house = document.querySelector("#house-filter");
  const district = document.querySelector("#district-filter");
  const clear = document.querySelector(".search-clear");
  const count = document.querySelector("#member-result-count");

  const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  function update() {
    const query = search.value.trim().toLocaleLowerCase();
    const filtered = directoryStudents.filter(student =>
      (!query || `${student.name} ${student.roll}`.toLocaleLowerCase().includes(query)) &&
      (!house.value || student.house === house.value) &&
      (!district.value || student.district === district.value)
    );
    count.textContent = `Showing ${filtered.length} of ${directoryStudents.length} students`;
    clear.hidden = !search.value;
    grid.innerHTML = filtered.length ? filtered.map(student => `<article class="card profile-card" data-student-roll="${escapeHTML(student.roll)}" tabindex="0" role="button" aria-label="View ${escapeHTML(student.name)} profile">
      <div class="card-body">
        ${student.avatarBase64 
          ? `<img class="profile-avatar-img" src="data:image/png;base64,${student.avatarBase64}" alt="${escapeHTML(student.name)}" style="width: 60px; height: 60px; border-radius: 12px; object-fit: cover; border: 3px solid #DC2626;">`
          : `<div class="profile-avatar" style="width: 60px; height: 60px; border-radius: 12px; background: linear-gradient(145deg, #DC2626, #991B1B); display: grid; place-items: center; color: #fff; font-size: .82rem; font-weight: 800;">
              ${student.avatarOption ? student.avatarOption.icon : student.initials}
            </div>`}
        <div style="margin-top: 8px; min-height: 60px;">
          <span class="badge" style="font-size: .72rem; padding: 4px 8px; background: #F9FAFB; color: #111827;">${escapeHTML(student.house)}</span>
          <h3 style="font-size: 1rem; margin: 6px 0 4px;">${escapeHTML(student.name)}</h3>
          <p style="font-size: .72rem; color: #6B7280; margin: 0;">${escapeHTML(student.roll)} · ${escapeHTML(student.district)}</p>
          ${student.tagline ? `<p style="font-size: .68rem; color: #DC2626; margin: 4px 0 0;">${escapeHTML(student.tagline)}</p>` : ""}
        </div>
        ${student.achievementCount > 0 ? `<div style="margin-top: 6px;">
          <span class="text-xs font-medium" style="color: #DC2626;">🏆 ${student.achievementCount} Achievement${student.achievementCount !== 1 ? "s" : ""}</span>
        </div>` : ""}
      </div>
    </article>`).join("") : `<div class="empty-state"><strong>No classmates found</strong>Try another name, house team, or district.</div>`;
  }

  search.addEventListener("input", update);
  house.addEventListener("change", update);
  district.addEventListener("change", update);
  clear.addEventListener("click", () => { search.value = ""; update(); search.focus(); });
  update();
}

export function initializeEventSearch() {
  const grid = document.querySelector("#event-grid");
  if (!grid) return;

  const search = document.querySelector("#event-search");
  const status = document.querySelector("#event-status-filter");
  const category = document.querySelector("#event-category-filter");
  const clear = document.querySelector(".event-filter-bar .search-clear");
  const count = document.querySelector("#event-result-count");
  const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  function update() {
    const query = search.value.trim().toLocaleLowerCase();
    const allEvents = [...portalEvents, ...events];
    const filtered = allEvents.filter(item =>
      (!query || `${item.title} ${item.category} ${item.venue}`.toLocaleLowerCase().includes(query)) &&
      (!status.value || item.status === status.value) &&
      (!category.value || item.category === category.value)
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
    count.textContent = `Showing ${filtered.length} of ${allEvents.length} events`;
    clear.hidden = !search.value;
    grid.innerHTML = filtered.length ? filtered.map(item => {
      const date = new Date(item.date);
      const upcoming = item.status === "Upcoming";
      return `<article class="card event-card" data-event-id="${escapeHTML(item.id)}" tabindex="0" role="button" aria-label="View ${escapeHTML(item.title)} details">
        <div class="card-body">
          <div class="card-topline"><div class="event-date"><strong>${new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date)}</strong><span>${new Intl.DateTimeFormat("en", { month: "short" }).format(date)}</span></div><span class="badge ${upcoming ? "" : "badge-neutral"}">${escapeHTML(item.status)}</span></div>
          <h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description)}</p>
          <div class="event-meta"><span>◷ ${escapeHTML(item.time)}</span><span>⌖ ${escapeHTML(item.venue)}</span></div>
          <div class="card-footer"><small>${escapeHTML(item.category)} · ${escapeHTML(new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date))}</small><span class="text-link">Details →</span></div>
        </div>
      </article>`;
    }).join("") : `<div class="empty-state"><strong>No matching events</strong>Try another search or choose a different filter.</div>`;
  }

  search.addEventListener("input", update);
  status.addEventListener("change", update);
  category.addEventListener("change", update);
  clear.addEventListener("click", () => { search.value = ""; update(); search.focus(); });
  update();
}
