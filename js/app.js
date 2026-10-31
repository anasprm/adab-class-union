import {
  getActiveRoute,
  renderRoute,
  setAdminActiveTab,
  setAdminProfiles,
  setAnnouncements,
  setAuthFeedback,
  setAuthMode,
  setCurrentProfile,
  setCurrentUser,
  setFinanceEntries,
  setLastCreatedAccount,
  setPortalEvents,
  setPortalMembers,
  setPortalWings,
  setPublishedWorks,
  setReviewData
} from "./router.js";
import {
  initializeEventSearch,
  initializeMemberSearch,
  setDirectoryStudents,
  setPortalSearchEvents
} from "./search.js";
import { initializeCountdown } from "./countdown.js";
import {
  initializeModals,
  setPortalEvents as setModalPortalEvents,
  setPortalMembers as setModalPortalMembers,
  setPublishedWorks as setModalPublishedWorks
} from "./modals.js";
import { isSupabaseConfigured, supabase } from "./supabase.js";
import { initializeMonthlyFundTracker } from "./monthly-funds.js";

const themeButton = document.querySelector(".theme-toggle");
const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".primary-nav");
const toastRegion = document.querySelector(".toast-region");
let publishedWorksLoaded = false;
let portalWingsLoaded = false;
let portalMembersLoaded = false;
let portalEventsLoaded = false;
let announcementsLoaded = false;
let financeLoaded = false;
let adminProfilesLoaded = false;
let reviewDataLoaded = false;
let currentProfileRequest;
let authenticatedUserId = null;
let currentProfile = null;

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === "dark";
  themeButton.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  themeButton.querySelector(".theme-icon").textContent = isDark ? "☀" : "☾";
  themeButton.querySelector(".theme-label").textContent = isDark ? "Light mode" : "Dark mode";
}

function closeNavigation() {
  nav.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " toast-error" : ""}`;
  toast.textContent = message;
  toastRegion.append(toast);
  window.setTimeout(() => {
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 200);
  }, 4200);
}

function showAuthNetworkError(error) {
  console.error("Supabase authentication request failed.", error);
  setAuthFeedback("We couldn’t reach the account service. Check your connection and try again.");
}

async function insertForCurrentUser(table, values) {
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) return { error: sessionError };
  if (!data.session) return { error: new Error("Your session expired. Sign in again and retry.") };
  const { error } = await supabase.from(table).insert({
    ...values,
    user_id: data.session.user.id
  });
  return { error };
}

function showDatabaseError(action, error) {
  console.error(`${action} failed.`, error);
  showToast(`${action} failed. ${error.message || "Please try again."}`, "error");
}

async function loadCurrentProfile(user) {
  if (!supabase || !user) {
    setCurrentProfile(null);
    return;
  }
  if (currentProfileRequest === user.id) return;
  currentProfileRequest = user.id;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (currentProfileRequest !== user.id) return;
  currentProfileRequest = undefined;
  if (error) {
    showDatabaseError("Loading your approved account role", error);
    currentProfile = null;
    setCurrentProfile(null);
    return;
  }
  currentProfile = data?.is_active ? data : null;
  setCurrentProfile(currentProfile);
}

async function loadPortalWings() {
  if (!supabase || portalWingsLoaded) return;
  portalWingsLoaded = true;
  const { data, error } = await supabase.from("portal_wings")
    .select("id,name,accent,objective,activities,icon")
    .order("name");
  if (error) {
    portalWingsLoaded = false;
    showDatabaseError("Loading wing information", error);
    return;
  }
  setPortalWings(data || []);
}

async function loadPortalEvents() {
  if (!supabase || portalEventsLoaded) return;
  portalEventsLoaded = true;
  const { data, error } = await supabase.from("portal_events")
    .select("id,title,category,starts_at,time_label,venue,description,status,wing_id,is_published")
    .eq("is_published", true)
    .order("starts_at", { ascending: true });
  if (error) {
    portalEventsLoaded = false;
    showDatabaseError("Loading class events", error);
    return;
  }
  const rows = data || [];
  setPortalSearchEvents(rows);
  setModalPortalEvents(rows);
  setPortalEvents(rows);
}

async function loadPortalMembers() {
  if (!supabase || !currentProfile || portalMembersLoaded) return;
  portalMembersLoaded = true;
  const { data, error } = await supabase.from("member_directory")
    .select("id,display_name,roll_number,house_team,district")
    .order("display_name");
  if (error) {
    portalMembersLoaded = false;
    showDatabaseError("Loading the class directory", error);
    return;
  }
  const rows = data || [];
  setDirectoryStudents(rows);
  setModalPortalMembers(rows);
  setPortalMembers(rows);
}

async function loadAnnouncements() {
  if (!supabase || announcementsLoaded) return;
  announcementsLoaded = true;
  const { data, error } = await supabase.from("announcements")
    .select("id,title,message,wing_id,created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(6);
  if (error) {
    announcementsLoaded = false;
    showDatabaseError("Loading announcements", error);
    return;
  }
  setAnnouncements(data || []);
}

async function loadFinanceEntries() {
  if (!supabase || !currentProfile || financeLoaded) return;
  financeLoaded = true;
  setFinanceEntries([], true);
  const { data, error } = await supabase.from("finance_entries")
    .select("id,entry_type,amount,category,description,occurred_on,attachment_path,created_at")
    .order("occurred_on", { ascending: false });
  if (error) {
    financeLoaded = false;
    setFinanceEntries([], false);
    showDatabaseError("Loading the private finance ledger", error);
    return;
  }
  setFinanceEntries(data || [], false);
}

async function loadAdminProfiles() {
  if (!supabase || currentProfile?.role !== "developer" || adminProfilesLoaded) return;
  adminProfilesLoaded = true;
  setAdminProfiles([], true);
  const { data, error } = await supabase.from("profiles")
    .select("id,email,username,display_name,role,wing_id,is_active,created_at")
    .order("created_at", { ascending: true });
  if (error) {
    adminProfilesLoaded = false;
    setAdminProfiles([], false);
    showDatabaseError("Loading the account roster", error);
    return;
  }
  setAdminProfiles(data || [], false);
}

async function loadReviewData() {
  if (!supabase || !currentProfile || !["developer", "teacher", "committee"].includes(currentProfile.role) || reviewDataLoaded) return;
  reviewDataLoaded = true;
  const [works, suggestions] = await Promise.all([
    supabase.from("creative_submissions")
      .select("id,title,author_name,work_type,excerpt,content,created_at,attachment_path")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase.from("suggestions")
      .select("id,user_id,message,created_at")
      .order("created_at", { ascending: false })
      .limit(50)
  ]);
  if (works.error || suggestions.error) {
    reviewDataLoaded = false;
    showDatabaseError("Loading council review items", works.error || suggestions.error);
    return;
  }
  setReviewData(works.data || [], (suggestions.data || []).map(item => ({
    ...item,
    email: `Member ${item.user_id.slice(0, 8)}`
  })));
}

function requestPrivateFile(path, bucket = "finance-private") {
  const fileWindow = window.open("about:blank", "_blank");
  if (fileWindow) fileWindow.opener = null;
  supabase.storage.from(bucket).createSignedUrl(path, 60).then(({ data, error }) => {
    if (error) {
      fileWindow?.close();
      showDatabaseError("Opening the private document", error);
      return;
    }
    if (fileWindow) fileWindow.location.href = data.signedUrl;
    else showToast("Allow pop-ups to open this private document.", "error");
  }).catch(error => {
    fileWindow?.close();
    showDatabaseError("Opening the private document", error);
  });
}

themeButton.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
  try {
    localStorage.setItem("adab-theme", nextTheme);
  } catch (error) {
    console.warn("Could not save the selected theme in this browser.", error);
  }
});

menuButton.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});

nav.addEventListener("click", event => {
  if (event.target instanceof Element && event.target.closest("a")) closeNavigation();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeNavigation();
});

document.addEventListener("click", event => {
  if (!nav.classList.contains("is-open") || !(event.target instanceof Node)) return;
  if (!nav.contains(event.target) && !menuButton.contains(event.target)) closeNavigation();
});

document.addEventListener("click", event => {
  const action = event.target instanceof Element ? event.target.closest("[data-action]") : null;
  if (action?.dataset.action === "toggle-password") {
    const password = document.querySelector("#login-password");
    if (!(password instanceof HTMLInputElement)) return;
    const isVisible = password.type === "text";
    password.type = isVisible ? "password" : "text";
    action.textContent = isVisible ? "Show" : "Hide";
    action.setAttribute("aria-label", `${isVisible ? "Show" : "Hide"} password`);
    action.setAttribute("aria-pressed", String(!isVisible));
  }
  const authMode = event.target instanceof Element ? event.target.closest("button[data-auth-mode]") : null;
  if (authMode) setAuthMode(authMode.dataset.authMode);

  const adminTab = event.target instanceof Element ? event.target.closest("[data-admin-tab]") : null;
  if (adminTab) {
    event.preventDefault();
    const tabName = adminTab.dataset.adminTab;
    setAdminActiveTab(tabName);
    location.hash = `admin?tab=${tabName}`;
    renderRoute();
  }

  const fileLink = event.target instanceof Element ? event.target.closest("[data-finance-file]") : null;
  if (fileLink && currentProfile) requestPrivateFile(fileLink.dataset.financeFile);
  const workFile = event.target instanceof Element ? event.target.closest("[data-work-file]") : null;
  if (workFile && currentProfile) requestPrivateFile(workFile.dataset.workFile, "student-works-private");

  const deleteFinance = event.target instanceof Element ? event.target.closest("[data-finance-delete]") : null;
  if (deleteFinance && currentProfile && ["developer", "treasurer"].includes(currentProfile.role)) {
    const id = deleteFinance.dataset.financeDelete;
    const attachmentPath = deleteFinance.dataset.attachment;
    supabase.from("finance_entries").delete().eq("id", id).then(async ({ error }) => {
      if (error) {
        showDatabaseError("Deleting the finance entry", error);
        return;
      }
      if (attachmentPath) {
        const { error: fileError } = await supabase.storage.from("finance-private").remove([attachmentPath]);
        if (fileError) showDatabaseError("Removing the private attachment", fileError);
      }
      financeLoaded = false;
      await loadFinanceEntries();
      showToast("Finance entry deleted.");
    }).catch(error => showDatabaseError("Deleting the finance entry", error));
  }

  if (action?.dataset.action === "sign-out") {
    if (!supabase) return;
    supabase.auth.signOut().then(({ error }) => {
      if (error) showToast(error.message, "error");
    }).catch(error => {
      console.error("Could not sign out from Supabase.", error);
      showToast("A network error prevented sign-out. Please retry.", "error");
    });
  }

  const copyButton = event.target instanceof Element ? event.target.closest("#copy-credentials-btn, #copy-invite-link-btn") : null;
  if (copyButton) {
    const input = copyButton.id === "copy-credentials-btn"
      ? document.querySelector("#create-result-credentials")
      : document.querySelector("#invite-link-input");
    if (input instanceof HTMLInputElement && input.value) {
      navigator.clipboard.writeText(input.value)
        .then(() => showToast("Copied to clipboard."))
        .catch(() => showToast("Could not copy automatically. Select the text and copy it.", "error"));
    }
  }

  const copyToken = event.target instanceof Element ? event.target.closest("[data-copy-token]") : null;
  if (copyToken) {
    const link = `${location.origin}${location.pathname}#invite?token=${encodeURIComponent(copyToken.dataset.copyToken)}`;
    navigator.clipboard.writeText(link)
      .then(() => showToast("Invitation link copied."))
      .catch(() => showToast("Could not copy the link.", "error"));
  }

  const setPassword = event.target instanceof Element ? event.target.closest("[data-set-password]") : null;
  if (setPassword && currentProfile?.role === "developer") {
    const nextPassword = window.prompt(`Enter a new password for ${setPassword.dataset.setPasswordName || "this account"} (at least 8 characters):`);
    if (nextPassword === null) return;
    if (nextPassword.length < 8) {
      showToast("Use a password with at least 8 characters.", "error");
      return;
    }
    supabase.functions.invoke("invite-user", {
      body: { action: "set-password", user_id: setPassword.dataset.setPassword, password: nextPassword }
    }).then(({ data, error }) => {
      if (error) return showDatabaseError("Setting the new password", error);
      showToast(data?.message || "Password updated.");
    }).catch(error => showDatabaseError("Setting the new password", error));
  }

  const toggleSuspend = event.target instanceof Element ? event.target.closest("[data-toggle-suspend]") : null;
  if (toggleSuspend && currentProfile?.role === "developer") {
    const isActive = toggleSuspend.dataset.active !== "true";
    supabase.functions.invoke("invite-user", {
      body: {
        action: "update-user",
        user_id: toggleSuspend.dataset.toggleSuspend,
        role: toggleSuspend.dataset.role,
        wing_id: toggleSuspend.dataset.wing || null,
        is_active: isActive
      }
    }).then(({ data, error }) => {
      if (error) return showDatabaseError("Updating account access", error);
      adminProfilesLoaded = false;
      loadAdminProfiles();
      showToast(data?.message || "Account access updated.");
    }).catch(error => showDatabaseError("Updating account access", error));
  }

  const forceReset = event.target instanceof Element ? event.target.closest("[data-force-reset]") : null;
  if (forceReset && currentProfile?.role === "developer") {
    supabase.functions.invoke("invite-user", {
      body: { action: "force-password-reset", email: forceReset.dataset.forceReset }
    }).then(({ data, error }) => {
      if (error) return showDatabaseError("Generating the password reset link", error);
      if (data?.action_link) {
        navigator.clipboard.writeText(data.action_link).catch(() => {});
        window.prompt("Password reset link (copied to clipboard):", data.action_link);
      } else {
        showToast(data?.message || "Reset link generated.");
      }
    }).catch(error => showDatabaseError("Generating the password reset link", error));
  }

  const revokeUser = event.target instanceof Element ? event.target.closest("[data-revoke-user]") : null;
  if (revokeUser && currentProfile?.role === "developer") {
    if (!window.confirm(`Revoke access for ${revokeUser.dataset.userName || "this account"}? They will no longer be able to sign in.`)) return;
    supabase.functions.invoke("invite-user", {
      body: { action: "revoke-access", user_id: revokeUser.dataset.revokeUser }
    }).then(({ data, error }) => {
      if (error) return showDatabaseError("Revoking account access", error);
      adminProfilesLoaded = false;
      loadAdminProfiles();
      showToast(data?.message || "Account access revoked.");
    }).catch(error => showDatabaseError("Revoking account access", error));
  }

  const revokeInvite = event.target instanceof Element ? event.target.closest("[data-revoke-invite]") : null;
  if (revokeInvite && currentProfile?.role === "developer") {
    const inviteId = revokeInvite.dataset.revokeInvite;
    const invites = getDemoInvites();
    const updatedInvites = invites.map(inv => inv.id === inviteId || inv.token === inviteId ? { ...inv, status: "revoked" } : inv);
    saveDemoInvites(updatedInvites);
    showToast("Invitation revoked.");
    renderRoute();
  }

  // ==========================================
  // PROGRAMS PAGE INTERACTIVE EVENT HANDLERS
  // ==========================================
  const simRoleBtn = event.target instanceof Element ? event.target.closest("[data-sim-role]") : null;
  if (simRoleBtn) {
    const role = simRoleBtn.dataset.simRole;
    currentProfile = {
      id: "sim-user-1",
      display_name: role === "wing" ? "Wing Account Holder" : role === "committee" ? "Core Committee Member" : "Student Visitor",
      role: role,
      is_active: true
    };
    setCurrentProfile(currentProfile);
    renderRoute();
    showToast(`Simulated role switched to: ${role.toUpperCase()}`);
    return;
  }

  const lightboxMedia = event.target instanceof Element ? event.target.closest("[data-lightbox-img]") : null;
  if (lightboxMedia) {
    const imgSrc = lightboxMedia.dataset.lightboxImg;
    const imgTitle = lightboxMedia.dataset.lightboxTitle || "Program Poster";
    const modalMarkup = `<div class="modal-poster-zoom"><img src="${escapeHTML(imgSrc)}" alt="${escapeHTML(imgTitle)}" style="max-width:100%; height:auto; border-radius:12px; margin-bottom:16px;"><h2>${escapeHTML(imgTitle)}</h2><p>ADAB Class Union Official Program Poster</p></div>`;
    const backdropEl = document.querySelector("#modal-backdrop");
    const contentEl = document.querySelector("#modal-content");
    if (backdropEl && contentEl) {
      contentEl.innerHTML = modalMarkup;
      backdropEl.hidden = false;
      document.body.style.overflow = "hidden";
    }
    return;
  }

  const likeBtn = event.target instanceof Element ? event.target.closest("[data-action='like-post']") : null;
  if (likeBtn) {
    const isLiked = likeBtn.classList.toggle("is-liked");
    const countSpan = likeBtn.querySelector(".like-count");
    if (countSpan) {
      let currentLikes = parseInt(countSpan.textContent || "0", 10);
      currentLikes = isLiked ? currentLikes + 1 : currentLikes - 1;
      countSpan.textContent = String(currentLikes);
    }
    likeBtn.innerHTML = isLiked ? `♥ <span class="like-count">${countSpan?.textContent || "42"}</span>` : `♡ <span class="like-count">${countSpan?.textContent || "42"}</span>`;
    showToast(isLiked ? "Liked post!" : "Unliked post.");
    return;
  }

  const commentToggleBtn = event.target instanceof Element ? event.target.closest("[data-action='toggle-comments']") : null;
  if (commentToggleBtn) {
    const postCard = commentToggleBtn.closest(".ig-post-card");
    const commentsSec = postCard?.querySelector(".ig-comments-section");
    if (commentsSec) {
      const isVisible = commentsSec.style.display !== "none";
      commentsSec.style.display = isVisible ? "none" : "block";
    }
    return;
  }

  const commentForm = event.target instanceof Element ? event.target.closest("[data-post-comment]") : null;
  // Handled via submit event below

  const flipBtn = event.target instanceof Element ? event.target.closest("[data-action='flip-card']") : null;
  if (flipBtn) {
    const postCard = flipBtn.closest(".ig-post-card");
    if (postCard) {
      postCard.classList.toggle("is-flipped");
    }
    return;
  }

  const eventTab = event.target instanceof Element ? event.target.closest("[data-event-tab]") : null;
  if (eventTab) {
    const tabName = eventTab.dataset.eventTab;
    const container = document.querySelector("#event-grid");
    const tabsContainer = eventTab.closest(".event-tabs");
    if (container && tabsContainer) {
      tabsContainer.querySelectorAll(".event-tab-btn").forEach(btn => {
        const isActive = btn === eventTab;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-selected", String(isActive));
      });
      const allEvents = [...portalEvents, ...events].sort((a, b) => new Date(a.date) - new Date(b.date));
      const upcoming = allEvents.filter(e => e.status === "Upcoming");
      const past = allEvents.filter(e => e.status === "Completed");
      const list = tabName === "upcoming" ? upcoming : past;
      container.innerHTML = list.map(eventCard).join("") || emptyState(
        tabName === "upcoming" ? "No upcoming events" : "No past events",
        tabName === "upcoming" ? "Check back soon for new scheduled activities." : "No archived events recorded yet."
      );
    }
    return;
  }
  if (link) {
    event.preventDefault();
    location.hash = "home";
    window.setTimeout(() => document.querySelector("#suggestions")?.scrollIntoView({ behavior: "smooth" }), 0);
  }
});

document.addEventListener("submit", event => {
  if (!(event.target instanceof HTMLFormElement)) return;
  const commentForm = event.target.closest("[data-post-comment]");
  if (commentForm) {
    event.preventDefault();
    const input = commentForm.querySelector("input");
    const text = input?.value.trim();
    if (!text) return;
    const commentsBox = commentForm.previousElementSibling;
    if (commentsBox) {
      const authorName = currentProfile?.display_name || "ADAB Student";
      const commentEl = document.createElement("div");
      commentEl.className = "ig-comment-item";
      commentEl.innerHTML = `<strong>${escapeHTML(authorName)}</strong>${escapeHTML(text)}`;
      commentsBox.append(commentEl);
      input.value = "";
      showToast("Comment posted successfully!");
    }
    return;
  }
});

document.addEventListener("change", event => {
  if (!(event.target instanceof HTMLSelectElement)) return;
  if (event.target.matches("#invite-role")) {
    const wingField = document.querySelector("#invite-wing-field");
    if (wingField) wingField.hidden = event.target.value !== "wing";
  }
  if (event.target.matches("#create-role")) {
    const wingField = document.querySelector("#create-wing-field");
    if (wingField) {
      wingField.hidden = event.target.value !== "wing";
      const wingSelect = wingField.querySelector("select");
      if (wingSelect) wingSelect.required = event.target.value === "wing";
    }
  }
  const accountForm = event.target.closest(".account-access-form");
  if (accountForm && event.target.name === "role") {
    const wingSelect = accountForm.querySelector('select[name="wing_id"]');
    if (wingSelect) {
      wingSelect.disabled = event.target.value !== "wing";
      if (event.target.value === "wing" && !wingSelect.value) wingSelect.value = wingSelect.options[1]?.value || "";
    }
  }
});

document.addEventListener("submit", event => {
  if (!(event.target instanceof HTMLFormElement)) return;
  if (event.target.id === "login-form") {
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    if (!supabase || !isSupabaseConfigured) {
      setAuthFeedback("Account services aren’t configured yet. Add the Supabase project URL and publishable/anon key, then rebuild the site.");
      return;
    }
    const formData = new FormData(event.target);
    const mode = event.target.dataset.authMode;
    const identifier = String(formData.get("email") || "").trim().toLocaleLowerCase();
    const email = identifier.includes("@") ? identifier : `${identifier}@adab.local`;
    const password = String(formData.get("password") || "");

    if (mode === "signin") {
      (async () => {
        let loginEmail = email;
        if (!identifier.includes("@")) {
          const { data: resolved, error: resolveError } = await supabase.rpc("resolve_login_email", {
            username_input: identifier
          });
          if (!resolveError && resolved) loginEmail = resolved;
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) {
          setAuthFeedback(error.message);
        } else if (data.session) {
          location.hash = "home";
          showToast("You’re signed in.");
        } else {
          setAuthFeedback("Sign-in completed without an active session. Please try again.");
        }
      })().catch(showAuthNetworkError);
    } else if (mode === "recovery") {
      const redirectTo = `${location.origin}${location.pathname}#login`;
      supabase.auth.resetPasswordForEmail(email, { redirectTo }).then(({ error }) => {
        if (error) setAuthFeedback(error.message);
        else setAuthFeedback("If an account exists for this address, a password reset link is on its way.", "success");
      }).catch(showAuthNetworkError);
    } else if (mode === "update-password") {
      supabase.auth.updateUser({ password }).then(({ error }) => {
        if (error) setAuthFeedback(error.message);
        else {
          setAuthMode("signin");
          showToast("Your password has been updated.");
        }
      }).catch(showAuthNetworkError);
    }
    return;
  }
  if (event.target.id === "profile-form") {
    event.preventDefault();
    if (!currentProfile || !event.target.reportValidity()) return;
    const formData = new FormData(event.target);
    supabase.from("profiles").update({
      display_name: String(formData.get("display_name")).trim(),
      roll_number: String(formData.get("roll_number")).trim() || null,
      house_team: String(formData.get("house_team")) || null,
      district: String(formData.get("district")).trim() || null,
      updated_at: new Date().toISOString()
    }).eq("id", currentProfile.id).select("*").single().then(({ data, error }) => {
      if (error) {
        showDatabaseError("Saving your profile", error);
        return;
      }
      if (event.target.id === "change-password-form") {
        event.preventDefault();
        if (!currentProfile || !event.target.reportValidity()) return;
        const formData = new FormData(event.target);
        const password = String(formData.get("password") || "");
        const confirmation = String(formData.get("confirm_password") || "");
        if (password !== confirmation) {
          showToast("The passwords do not match.", "error");
          return;
        }
        supabase.auth.updateUser({ password }).then(({ error }) => {
          if (error) {
            showDatabaseError("Changing your password", error);
            return;
          }
          event.target.reset();
          showToast("Your password has been changed.");
        }).catch(error => showDatabaseError("Changing your password", error));
        return;
      }
      setCurrentProfile(data);
      currentProfile = data;
      portalMembersLoaded = false;
      loadPortalMembers();
      showToast("Your profile has been updated.");
    }).catch(error => showDatabaseError("Saving your profile", error));
    return;
  }
  if (event.target.id === "create-account-form") {
    event.preventDefault();
    if (currentProfile?.role !== "developer" || !event.target.reportValidity()) return;
    const form = event.target;
    const formData = new FormData(form);
    const role = String(formData.get("role"));
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    supabase.functions.invoke("invite-user", {
      body: {
        action: "create-account",
        username: String(formData.get("username")).trim().toLowerCase(),
        display_name: String(formData.get("display_name")).trim(),
        password: String(formData.get("password")),
        role,
        wing_id: role === "wing" ? String(formData.get("wing_id")) : null
      }
    }).then(({ data, error }) => {
      if (submitButton) submitButton.disabled = false;
      if (error) {
        showDatabaseError("Creating the account", error);
        return;
      }
      const container = document.querySelector("#create-result-container");
      const message = document.querySelector("#create-result-message");
      const credentials = document.querySelector("#create-result-credentials");
      if (message) message.textContent = data?.message || "Account created.";
      if (credentials) credentials.value = `Username: ${data?.username}    Password: ${data?.password}`;
      if (container) container.hidden = false;
      setLastCreatedAccount(data || null);
      form.reset();
      const wingField = document.querySelector("#create-wing-field");
      if (wingField) wingField.hidden = true;
      adminProfilesLoaded = false;
      loadAdminProfiles();
      showToast(data?.message || "Account created.");
    }).catch(error => {
      if (submitButton) submitButton.disabled = false;
      showDatabaseError("Creating the account", error);
    });
    return;
  }
  if (event.target.id === "invite-form") {
    event.preventDefault();
    if (currentProfile?.role !== "developer" || !event.target.reportValidity()) return;
    const formData = new FormData(event.target);
    const role = String(formData.get("role"));
    supabase.functions.invoke("invite-user", {
      body: {
        action: "invite",
        email: String(formData.get("email")).trim().toLowerCase(),
        display_name: String(formData.get("display_name")).trim(),
        role,
        wing_id: role === "wing" ? String(formData.get("wing_id")) : null
      }
    }).then(({ data, error }) => {
      if (error) {
        showDatabaseError("Sending the account invitation", error);
        return;
      }
      event.target.reset();
      document.querySelector("#invite-wing-field").hidden = true;
      adminProfilesLoaded = false;
      loadAdminProfiles();
      showToast(data?.message || "Account invitation sent.");
    }).catch(error => showDatabaseError("Sending the account invitation", error));
    return;
  }
  if (event.target.matches(".account-access-form")) {
    event.preventDefault();
    if (currentProfile?.role !== "developer") return;
    const form = event.target;
    const formData = new FormData(form);
    const role = String(formData.get("role"));
    supabase.functions.invoke("invite-user", {
      body: {
        action: "update-user",
        user_id: form.dataset.accountUpdate,
        role,
        wing_id: role === "wing" ? String(formData.get("wing_id")) : null,
        is_active: formData.get("is_active") === "on"
      }
    }).then(({ data, error }) => {
      if (error) {
        showDatabaseError("Updating account access", error);
        return;
      }
      adminProfilesLoaded = false;
      loadAdminProfiles();
      showToast(data?.message || "Account access updated.");
    }).catch(error => showDatabaseError("Updating account access", error));
    return;
  }
  if (event.target.matches(".wing-editor")) {
    event.preventDefault();
    if (currentProfile?.role !== "developer" || !event.target.reportValidity()) return;
    const form = event.target;
    const formData = new FormData(form);
    const activities = String(formData.get("activities") || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    supabase.from("portal_wings").update({
      name: String(formData.get("name")).trim(),
      accent: String(formData.get("accent")).trim(),
      icon: String(formData.get("icon")).trim(),
      objective: String(formData.get("objective")).trim(),
      activities,
      updated_at: new Date().toISOString()
    }).eq("id", form.dataset.wingUpdate).select("id,name,accent,objective,activities,icon").single().then(({ error }) => {
      if (error) {
        showDatabaseError("Saving wing information", error);
        return;
      }
      portalWingsLoaded = false;
      adminProfilesLoaded = false;
      loadPortalWings();
      loadAdminProfiles();
      showToast("Wing name and content updated across the portal.");
    }).catch(error => showDatabaseError("Saving wing information", error));
    return;
  }
  if (event.target.id === "announcement-form") {
    event.preventDefault();
    if (!currentProfile || !event.target.reportValidity()) return;
    const formData = new FormData(event.target);
    supabase.from("announcements").insert({
      title: String(formData.get("title")).trim(),
      message: String(formData.get("message")).trim(),
      wing_id: String(formData.get("wing_id")) || null,
      created_by: currentProfile.id
    }).select("id,title,message,wing_id,created_at").single().then(({ data, error }) => {
      if (error) {
        showDatabaseError("Publishing the announcement", error);
        return;
      }
      announcementsLoaded = false;
      event.target.reset();
      loadAnnouncements();
      showToast("Announcement published.");
    }).catch(error => showDatabaseError("Publishing the announcement", error));
    return;
  }
  if (event.target.id === "portal-event-form") {
    event.preventDefault();
    if (!currentProfile || !event.target.reportValidity()) return;
    const formData = new FormData(event.target);
    const startsAt = new Date(String(formData.get("starts_at")));
    supabase.from("portal_events").insert({
      title: String(formData.get("title")).trim(),
      category: String(formData.get("category")).trim(),
      starts_at: startsAt.toISOString(),
      time_label: String(formData.get("time_label")).trim(),
      venue: String(formData.get("venue")).trim(),
      description: String(formData.get("description")).trim(),
      status: startsAt.getTime() > Date.now() ? "Upcoming" : "Completed",
      wing_id: String(formData.get("wing_id")) || null,
      created_by: currentProfile.id
    }).select("id,title,category,starts_at,time_label,venue,description,status,wing_id,is_published").single().then(({ error }) => {
      if (error) {
        showDatabaseError("Publishing the event", error);
        return;
      }
      portalEventsLoaded = false;
      event.target.reset();
      loadPortalEvents();
      showToast("Event published.");
    }).catch(error => showDatabaseError("Publishing the event", error));
    return;
  }
  if (event.target.matches(".review-work-form")) {
    event.preventDefault();
    if (!currentProfile || !["developer", "teacher", "committee"].includes(currentProfile.role)) return;
    const status = String(new FormData(event.target).get("status"));
    supabase.from("creative_submissions").update({ status })
      .eq("id", event.target.dataset.workReview).select("id").single().then(({ error }) => {
        if (error) {
          showDatabaseError("Saving the student work decision", error);
          return;
        }
        reviewDataLoaded = false;
        loadReviewData();
        showToast(status === "published" ? "Student work published." : "Student work declined.");
      }).catch(error => showDatabaseError("Saving the student work decision", error));
    return;
  }
  if (event.target.id === "finance-form") {
    event.preventDefault();
    if (!currentProfile || !["developer", "treasurer"].includes(currentProfile.role) || !event.target.reportValidity()) return;
    const form = event.target;
    const formData = new FormData(form);
    const file = formData.get("attachment");
    let attachmentPath = null;
    const saveEntry = async () => {
      if (file instanceof File && file.size > 0) {
        const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
          showToast("Choose a PDF or image no larger than 10 MB.", "error");
          return;
        }
        const safeName = file.name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
        attachmentPath = `${currentProfile.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("finance-private")
          .upload(attachmentPath, file, { contentType: file.type, upsert: false });
        if (uploadError) {
          showDatabaseError("Uploading the private finance attachment", uploadError);
          return;
        }
      }
      const { error } = await supabase.from("finance_entries").insert({
        entry_type: String(formData.get("entry_type")),
        amount: Number(formData.get("amount")),
        category: String(formData.get("category")).trim(),
        description: String(formData.get("description")).trim(),
        occurred_on: String(formData.get("occurred_on")),
        attachment_path: attachmentPath,
        created_by: currentProfile.id
      });
      if (error) {
        if (attachmentPath) {
          const { error: cleanupError } = await supabase.storage.from("finance-private").remove([attachmentPath]);
          if (cleanupError) console.error("Could not remove an unattached finance file.", cleanupError);
        }
        showDatabaseError("Saving the finance entry", error);
        return;
      }
      form.reset();
      financeLoaded = false;
      await loadFinanceEntries();
      showToast("Finance entry added.");
    };
    saveEntry().catch(error => showDatabaseError("Saving the finance entry", error));
    return;
  }
  if (event.target.matches(".finance-update-form")) {
    event.preventDefault();
    if (!currentProfile || !["developer", "treasurer"].includes(currentProfile.role) || !event.target.reportValidity()) return;
    const formData = new FormData(event.target);
    supabase.from("finance_entries").update({
      entry_type: String(formData.get("entry_type")),
      amount: Number(formData.get("amount")),
      category: String(formData.get("category")).trim(),
      description: String(formData.get("description")).trim(),
      occurred_on: String(formData.get("occurred_on")),
      updated_by: currentProfile.id,
      updated_at: new Date().toISOString()
    }).eq("id", event.target.dataset.financeUpdate).then(async ({ error }) => {
      if (error) {
        showDatabaseError("Updating the finance entry", error);
        return;
      }
      financeLoaded = false;
      await loadFinanceEntries();
      showToast("Finance entry updated.");
    }).catch(error => showDatabaseError("Updating the finance entry", error));
    return;
  }
  if (event.target.id === "creative-work-form") {
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    if (!supabase || !currentProfile) {
      showToast("Supabase isn’t configured. Your work could not be submitted.", "error");
      return;
    }
    const form = event.target;
    const formData = new FormData(form);
    const type = String(formData.get("type"));
    const file = formData.get("attachment");
    const submitWork = async () => {
      let attachmentPath = null;
      if (file instanceof File && file.size > 0) {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
          showToast("Choose a JPEG, PNG, or WebP image no larger than 10 MB.", "error");
          return;
        }
        const safeName = file.name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
        attachmentPath = `${currentProfile.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("student-works-private")
          .upload(attachmentPath, file, { contentType: file.type, upsert: false });
        if (uploadError) {
          showDatabaseError("Uploading your private artwork", uploadError);
          return;
        }
      }
      const { error } = await insertForCurrentUser("creative_submissions", {
        title: String(formData.get("title")).trim(),
        author_name: String(formData.get("author")).trim(),
        work_type: type,
        excerpt: String(formData.get("excerpt")).trim(),
        content: String(formData.get("content")).trim(),
        attachment_path: attachmentPath
      });
      if (error) {
        if (attachmentPath) {
          const { error: cleanupError } = await supabase.storage.from("student-works-private").remove([attachmentPath]);
          if (cleanupError) console.error("Could not remove an unattached student artwork.", cleanupError);
        }
        showDatabaseError("Submitting your creative work", error);
        return;
      }
      form.reset();
      showToast("Your work has been submitted privately for union council review.");
    };
    submitWork().catch(error => showDatabaseError("Submitting your creative work", error));
    return;
  }
  if (event.target.id !== "suggestion-form") return;
  event.preventDefault();
  if (!event.target.reportValidity()) return;
  if (!supabase) {
    showToast("Supabase isn’t configured. Your suggestion could not be sent.", "error");
    return;
  }
  const message = String(new FormData(event.target).get("message") || "").trim();
  insertForCurrentUser("suggestions", {
    message
  }).then(({ error }) => {
    if (error) {
      showToast(`Your suggestion could not be sent: ${error.message}`, "error");
      return;
    }
    event.target.reset();
    showToast("Success! Your suggestion has been sent to the ADAB Union Council.");
  }).catch(error => {
    console.error("Could not submit a student suggestion.", error);
    showToast("A network error prevented your suggestion from being sent. Please retry.", "error");
  });
});

document.addEventListener("adab:route-rendered", () => {
  initializeMemberSearch();
  initializeEventSearch();
  initializeCountdown();
  loadPortalWings();
  const route = getActiveRoute();
  if (route === "home" || route === "events") loadPortalEvents();
  if (route === "members") loadPortalMembers();
  if (route === "home") loadAnnouncements();
  if (route === "finance") loadFinanceEntries();
  if (route === "admin") loadAdminProfiles();
  if (route === "account") loadReviewData();
  if (getActiveRoute() === "works" && supabase && !publishedWorksLoaded) {
    publishedWorksLoaded = true;
    supabase.from("creative_submissions")
      .select("id,title,author_name,work_type,excerpt,content,created_at,attachment_path")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .then(async ({ data, error }) => {
        if (error) {
          publishedWorksLoaded = false;
          console.error("Could not load published student works.", error);
          showToast("Published student works could not be loaded. Please try again later.", "error");
          return;
        }
        const rows = await Promise.all((data || []).map(async row => {
          if (!row.attachment_path) return row;
          const { data: file, error: fileError } = await supabase.storage
            .from("student-works-private").createSignedUrl(row.attachment_path, 3600);
          if (fileError) {
            console.error("Could not create an image link for published student work.", fileError);
            showToast("A published artwork preview could not be loaded.", "error");
            return row;
          }
          return { ...row, image_url: file.signedUrl };
        }));
        setPublishedWorks(rows);
        setModalPublishedWorks(rows);
        if (getActiveRoute() === "works") renderRoute("works");
      }).catch(error => {
        publishedWorksLoaded = false;
        console.error("Could not connect to load published student works.", error);
        showToast("Published student works could not be loaded. Please try again later.", "error");
      });
  }
});

let storedTheme;
try {
  storedTheme = localStorage.getItem("adab-theme");
} catch (error) {
  console.warn("Could not read the saved theme in this browser.", error);
}
const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
setTheme(storedTheme === "dark" || storedTheme === "light" ? storedTheme : preferredTheme);
document.querySelector("#current-year").textContent = String(new Date().getFullYear());
initializeModals();
initializeMonthlyFundTracker();
if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user || null;
    if (authenticatedUserId !== (user?.id || null)) {
      authenticatedUserId = user?.id || null;
      currentProfile = null;
      currentProfileRequest = undefined;
      portalMembersLoaded = false;
      financeLoaded = false;
      adminProfilesLoaded = false;
      reviewDataLoaded = false;
      setFinanceEntries([], false);
      setAdminProfiles([], false);
      setReviewData([], []);
    }
    setCurrentUser(user);
    if (!user) {
      currentProfileRequest = undefined;
      currentProfile = null;
      setPortalMembers(null);
      setModalPortalMembers(null);
      setDirectoryStudents(null);
      setCurrentProfile(null);
    } else if (["INITIAL_SESSION", "SIGNED_IN", "USER_UPDATED"].includes(event)) {
      loadCurrentProfile(user);
    }
    if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && location.hash.includes("type=invite"))) {
      setAuthMode("update-password");
      if (location.hash.includes("type=invite")) location.hash = "login";
    }
  });
}
window.addEventListener("hashchange", () => renderRoute(getActiveRoute()));
renderRoute();
