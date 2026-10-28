let interval;

export function initializeCountdown() {
  if (interval) {
    window.clearInterval(interval);
    interval = undefined;
  }
  const timer = document.querySelector("[data-countdown]");
  if (!timer) return;
  const target = new Date(timer.dataset.countdown).getTime();
  const parts = {
    days: timer.querySelector("[data-days]"),
    hours: timer.querySelector("[data-hours]"),
    minutes: timer.querySelector("[data-minutes]"),
    seconds: timer.querySelector("[data-seconds]")
  };
  const update = () => {
    const remaining = target - Date.now();
    if (remaining <= 0) {
      Object.values(parts).forEach(part => { part.textContent = "00"; });
      if (interval) {
        window.clearInterval(interval);
        interval = undefined;
      }
      return;
    }
    const seconds = Math.floor(remaining / 1000);
    parts.days.textContent = String(Math.floor(seconds / 86400)).padStart(2, "0");
    parts.hours.textContent = String(Math.floor((seconds % 86400) / 3600)).padStart(2, "0");
    parts.minutes.textContent = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    parts.seconds.textContent = String(seconds % 60).padStart(2, "0");
  };

  update();
  interval = window.setInterval(update, 1000);
}
