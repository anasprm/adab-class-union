import {
  getActiveRoute,
  renderRoute,
  setAuthFeedback,
  setAuthMode,
  setCurrentUser,
  setPublishedWorks
} from "./router.js";
import { initializeEventSearch, initializeMemberSearch } from "./search.js";
import { initializeCountdown } from "./countdown.js";
import { initializeModals } from "./modals.js";
import { isSupabaseConfigured, supabase } from "./supabase.js";

const themeButton = document.querySelector(".theme-toggle");
const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".primary-nav");
const toastRegion = document.querySelector(".toast-region");
let publishedWorksLoaded = false;

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

  if (action?.dataset.action === "sign-out") {
    if (!supabase) return;
    supabase.auth.signOut().then(({ error }) => {
      if (error) showToast(error.message, "error");
    }).catch(error => {
      console.error("Could not sign out from Supabase.", error);
      showToast("A network error prevented sign-out. Please retry.", "error");
    });
  }

  const link = event.target instanceof Element ? event.target.closest('a[href="#home#suggestions"]') : null;
  if (link) {
    event.preventDefault();
    location.hash = "home";
    window.setTimeout(() => document.querySelector("#suggestions")?.scrollIntoView({ behavior: "smooth" }), 0);
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
    const email = String(formData.get("email") || "").trim().toLocaleLowerCase();
    const password = String(formData.get("password") || "");

    if (mode === "signin") {
      supabase.auth.signInWithPassword({ email, password }).then(({ data, error }) => {
        if (error) {
          setAuthFeedback(error.message);
        } else if (data.session) {
          location.hash = "home";
          showToast("You’re signed in.");
        } else {
          setAuthFeedback("Sign-in completed without an active session. Please try again.");
        }
      }).catch(showAuthNetworkError);
    } else if (mode === "signup") {
      const displayName = String(formData.get("name") || "").trim();
      supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } }).then(({ data, error }) => {
        if (error) {
          setAuthFeedback(error.message);
        } else if (data.session) {
          location.hash = "home";
          showToast("Your ADAB account is ready.");
        } else {
          setAuthFeedback("Check your email for a confirmation link to finish creating your account.", "success");
        }
      }).catch(showAuthNetworkError);
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
  if (event.target.id === "creative-work-form") {
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    if (!supabase) {
      showToast("Supabase isn’t configured. Your work could not be submitted.", "error");
      return;
    }
    const formData = new FormData(event.target);
    const type = String(formData.get("type"));
    insertForCurrentUser("creative_submissions", {
      title: String(formData.get("title")).trim(),
      author_name: String(formData.get("author")).trim(),
      work_type: type,
      excerpt: String(formData.get("excerpt")).trim(),
      content: String(formData.get("content")).trim()
    }).then(({ error }) => {
      if (error) {
        showToast(`Your work could not be submitted: ${error.message}`, "error");
        return;
      }
      event.target.reset();
      showToast("Your work has been submitted privately for union council review.");
    }).catch(error => {
      console.error("Could not submit student creative work.", error);
      showToast("A network error prevented your work from being submitted. Please retry.", "error");
    });
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
  if (getActiveRoute() === "works" && supabase && !publishedWorksLoaded) {
    publishedWorksLoaded = true;
    supabase.from("creative_submissions")
      .select("id,title,author_name,work_type,excerpt,content,created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          publishedWorksLoaded = false;
          console.error("Could not load published student works.", error);
          showToast("Published student works could not be loaded. Please try again later.", "error");
          return;
        }
        setPublishedWorks(data || []);
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
if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    setCurrentUser(session?.user || null);
    if (event === "PASSWORD_RECOVERY") setAuthMode("update-password");
  });
}
window.addEventListener("hashchange", () => renderRoute(getActiveRoute()));
renderRoute();
