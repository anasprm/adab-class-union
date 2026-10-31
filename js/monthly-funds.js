import { studentSeedData } from "./data.js";
import { formatMoney, escapeHTML } from "./router.js";

const MONTHLY_FUND_STORAGE_KEY = "adab_monthly_fund_state";

export function getDefaultMonthlyFundState() {
  const currentMonth = "2026-03";
  const students = studentSeedData.map((s, idx) => ({
    id: `student-${String(idx + 1).padStart(2, "0")}`,
    name: s.name,
    roll: s.roll,
    house: s.house,
    district: s.district,
    phone: `+91 9847${String(Math.floor(100000 + Math.random() * 900000))}`
  }));

  // Seed history across months for realistic demo
  const records = {};
  const months = ["2026-01", "2026-02", "2026-03"];

  months.forEach((m, mIdx) => {
    records[m] = {
      fixedAmount: 100,
      students: students.map((stu, sIdx) => {
        // Deterministic mock payment statuses
        let paid = 100;
        let status = "PAID";
        if (mIdx === 2) { // Current month (March 2026)
          if (sIdx % 4 === 0) { paid = 0; status = "PENDING"; }
          else if (sIdx % 3 === 0) { paid = 50; status = "PARTIAL"; }
          else { paid = 100; status = "PAID"; }
        } else if (mIdx === 1) { // Feb
          if (sIdx === 5) { paid = 0; status = "PENDING"; }
          else { paid = 100; status = "PAID"; }
        }
        return {
          id: stu.id,
          due_amount: 100,
          amount_paid: paid,
          payment_status: status,
          payment_date: `2026-${m.slice(5)}-${String(10 + sIdx).padStart(2, "0")}T10:00:00Z`,
          remarks: status === "PARTIAL" ? "Balance ₹50 pending for snacks" : status === "PENDING" ? "Reminder sent via WhatsApp" : "Paid in full"
        };
      })
    };
  });

  return { activeMonth: currentMonth, fixedAmount: 100, students, records };
}

export function getMonthlyFundState() {
  try {
    const raw = localStorage.getItem(MONTHLY_FUND_STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultMonthlyFundState();
      localStorage.setItem(MONTHLY_FUND_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getDefaultMonthlyFundState();
  }
}

export function saveMonthlyFundState(state) {
  try {
    localStorage.setItem(MONTHLY_FUND_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save monthly fund state:", e);
  }
}

// Calculate Arrears for a student across all previous months up to active month
export function calculateStudentArrears(studentId, activeMonthKey, state) {
  let arrears = 0;
  const months = Object.keys(state.records || {}).sort();
  for (const mKey of months) {
    if (mKey >= activeMonthKey) break;
    const monthData = state.records[mKey];
    if (!monthData) continue;
    const sRecord = monthData.students.find(s => s.id === studentId);
    if (sRecord) {
      const pending = Math.max(0, Number(sRecord.due_amount) - Number(sRecord.amount_paid));
      arrears += pending;
    }
  }
  return arrears;
}

export function renderMonthlyFundTracker(currentProfile) {
  const state = getMonthlyFundState();
  const activeMonth = state.activeMonth || "2026-03";
  const fixedAmount = state.fixedAmount || 100;
  const students = state.students || [];

  if (!state.records[activeMonth]) {
    state.records[activeMonth] = {
      fixedAmount,
      students: students.map(s => ({
        id: s.id,
        due_amount: fixedAmount,
        amount_paid: 0,
        payment_status: "PENDING",
        payment_date: null,
        remarks: ""
      }))
    };
  }

  const currentMonthData = state.records[activeMonth];
  const totalStudents = students.length;

  // Calculations
  let totalExpectedForMonth = 0;
  let totalCollectedForMonth = 0;
  let totalPendingAcrossAll = 0;
  let paidCount = 0;

  const rosterRows = students.map(stu => {
    const rec = currentMonthData.students.find(r => r.id === stu.id) || { due_amount: fixedAmount, amount_paid: 0, payment_status: "PENDING" };
    const due = Number(rec.due_amount || fixedAmount);
    const paid = Number(rec.amount_paid || 0);
    const arrears = calculateStudentArrears(stu.id, activeMonth, state);
    const totalDue = due + arrears;
    const remaining = Math.max(0, totalDue - paid);

    totalExpectedForMonth += due;
    totalCollectedForMonth += paid;
    totalPendingAcrossAll += remaining;

    let badgeClass = "badge-neutral";
    let badgeText = "PENDING";
    if (paid >= totalDue || rec.payment_status === "PAID") {
      badgeClass = "badge-pill-paid";
      badgeText = "PAID";
      paidCount++;
    } else if (paid > 0 || rec.payment_status === "PARTIAL") {
      badgeClass = "badge-pill-partial";
      badgeText = "PARTIAL";
    } else {
      badgeClass = "badge-pill-pending";
      badgeText = "PENDING";
    }

    const initials = stu.name.split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
    const houseColor = stu.house === "Red Knights" ? "#DC2626" : stu.house === "White Warriors" ? "#3B82F6" : "#8B5CF6";

    return {
      ...stu,
      due,
      paid,
      arrears,
      totalDue,
      remaining,
      badgeClass,
      badgeText,
      initials,
      houseColor,
      remarks: rec.remarks || ""
    };
  });

  const completionRate = totalStudents > 0 ? Math.round((paidCount / totalStudents) * 100) : 0;
  const grandTotalExpected = totalExpectedForMonth;

  const canEdit = currentProfile && ["developer", "treasurer"].includes(currentProfile.role);

  return `
  <!-- Monthly Fund Management System -->
  <section class="section-block monthly-fund-wrapper">
    <div class="section-heading">
      <div>
        <span class="badge badge-red">Treasurer Financial Module</span>
        <h2 class="section-title">Student Monthly Fund Tracker</h2>
        <p>Manage fixed monthly dues, record student payments, track arrears, and generate audit reports.</p>
      </div>
      <div class="treasurer-quick-actions">
        <button type="button" class="button button-secondary" id="download-fund-report-btn">Download Monthly Report (PDF/CSV) 🖨</button>
      </div>
    </div>

    <!-- A. Treasurer Control Panel -->
    <div class="card treasurer-control-card">
      <div class="card-body">
        <div class="treasurer-control-grid">
          <div class="form-field">
            <label for="active-billing-month">Active Billing Month</label>
            <select id="active-billing-month" class="treasurer-select">
              <option value="2026-01" ${activeMonth === "2026-01" ? "selected" : ""}>January 2026</option>
              <option value="2026-02" ${activeMonth === "2026-02" ? "selected" : ""}>February 2026</option>
              <option value="2026-03" ${activeMonth === "2026-03" ? "selected" : ""}>March 2026 (Active)</option>
              <option value="2026-04" ${activeMonth === "2026-04" ? "selected" : ""}>April 2026</option>
              <option value="2026-05" ${activeMonth === "2026-05" ? "selected" : ""}>May 2026</option>
            </select>
          </div>
          <div class="form-field">
            <label for="global-fixed-dues">Global Fixed Monthly Fee (₹)</label>
            <input id="global-fixed-dues" type="number" min="0" step="10" value="${fixedAmount}" ${canEdit ? "" : "readonly"}>
          </div>
          <div class="form-field treasurer-apply-action">
            <label>&nbsp;</label>
            ${canEdit ? `<button type="button" class="button" id="apply-fixed-dues-all">Apply Fixed Dues to All ${totalStudents} Classmates ⚡</button>` : `<span class="badge badge-neutral">View-Only Mode</span>`}
          </div>
        </div>
      </div>
    </div>

    <!-- B. Financial Summary Dashboard Metrics -->
    <section class="finance-summary monthly-metrics-grid">
      <article class="finance-stat-card">
        <span>Total Expected Fund</span>
        <strong class="stat-accent">${formatMoney(grandTotalExpected)}</strong>
        <small class="stat-subtitle">Fixed Fee (₹${fixedAmount}) × ${totalStudents} Students</small>
      </article>
      <article class="finance-stat-card">
        <span>Total Amount Collected</span>
        <strong class="stat-green">${formatMoney(totalCollectedForMonth)}</strong>
        <small class="stat-subtitle">Received for ${activeMonth}</small>
      </article>
      <article class="finance-stat-card">
        <span>Total Outstanding / Pending</span>
        <strong class="stat-red">${formatMoney(totalPendingAcrossAll)}</strong>
        <small class="stat-subtitle">Remaining balance across all students</small>
      </article>
      <article class="finance-stat-card">
        <span>Payment Completion Rate</span>
        <div class="completion-bar-wrapper">
          <strong class="stat-green">${completionRate}% Paid</strong>
          <span class="text-muted">${paidCount}/${totalStudents} Cleared</span>
        </div>
        <div class="budget-progress-track" style="margin-top: 8px;">
          <div class="budget-progress-bar" style="width: ${completionRate}%"></div>
        </div>
      </article>
    </section>

    <!-- 2. Student Dues & Payment Status Roster -->
    <div class="section-block">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Classmate Roster (15 Accounts)</p>
          <h2 class="section-title">Individual Student Payment Records</h2>
        </div>
        <div class="roster-filter-row">
          <input type="search" id="roster-search" placeholder="Search student by name or roll..." class="roster-search-input">
        </div>
      </div>

      <div class="ledger-table-wrapper student-roster-glass-card">
        <table class="ledger-table student-roster-table">
          <thead>
            <tr>
              <th>Roll & Name</th>
              <th>House Team</th>
              <th>Current Due</th>
              <th>Previous Arrears</th>
              <th>Total Due</th>
              <th>Amount Paid</th>
              <th>Status</th>
              <th>Statement</th>
              <th>Action / Save</th>
            </tr>
          </thead>
          <tbody>
            ${rosterRows.map(stu => `
            <tr data-student-row-id="${escapeHTML(stu.id)}">
              <td>
                <div class="student-roster-identity">
                  <div class="student-avatar-ring" style="border-color: ${stu.houseColor}; color: ${stu.houseColor}; background: color-mix(in srgb, ${stu.houseColor} 15%, transparent);">${escapeHTML(stu.initials)}</div>
                  <div>
                    <strong>${escapeHTML(stu.name)}</strong>
                    <small>${escapeHTML(stu.roll)} · ${escapeHTML(stu.district)}</small>
                  </div>
                </div>
              </td>
              <td><span class="badge badge-neutral">${escapeHTML(stu.house)}</span></td>
              <td><span class="numeric-due">₹${stu.due}</span></td>
              <td class="${stu.arrears > 0 ? "text-expense font-bold" : "text-muted"}">₹${stu.arrears}</td>
              <td><span class="numeric-total-due">₹${stu.totalDue}</span></td>
              <td>
                <div class="amount-paid-input-wrapper">
                  <span>₹</span>
                  <input type="number" min="0" max="${stu.totalDue}" step="10" class="student-paid-input" data-student-id="${escapeHTML(stu.id)}" value="${stu.paid}" ${canEdit ? "" : "disabled"}>
                </div>
              </td>
              <td>
                <span class="${stu.badgeClass}" data-status-badge="${escapeHTML(stu.id)}">${stu.badgeText}</span>
              </td>
              <td>
                <button type="button" class="btn-statement-ghost" data-open-statement="${escapeHTML(stu.id)}">View Statement</button>
              </td>
              <td>
                <div class="roster-action-cell">
                  ${canEdit ? `
                  <button type="button" class="button button-save-payment-modern" data-save-student-id="${escapeHTML(stu.id)}">Save</button>
                  <button type="button" class="button button-secondary button-whatsapp-notice" data-whatsapp-student-id="${escapeHTML(stu.id)}" title="Send WhatsApp Payment Reminder">💬</button>
                  ` : `<span class="text-muted">—</span>`}
                </div>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  </section>`;
}

export function initializeMonthlyFundTracker() {
  document.addEventListener("change", event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches("#active-billing-month")) {
      const state = getMonthlyFundState();
      state.activeMonth = target.value;
      saveMonthlyFundState(state);
      // Re-render finance page
      const financeLink = document.querySelector('a[href="#finance"]');
      if (financeLink) financeLink.click();
    }

    if (target.matches("#global-fixed-dues")) {
      const state = getMonthlyFundState();
      const val = parseFloat(target.value) || 100;
      state.fixedAmount = val;
      saveMonthlyFundState(state);
    }

    // Instant calculation engine on Amount Paid input change
    if (target.matches(".student-paid-input")) {
      const studentId = target.dataset.studentId;
      const row = target.closest("tr");
      if (!row) return;
      const paidVal = parseFloat(target.value) || 0;
      const totalDueCell = row.children[4];
      const totalDue = parseFloat(totalDueCell.textContent.replace("₹", "")) || 100;
      const badge = row.querySelector("[data-status-badge]");
      if (badge) {
        if (paidVal >= totalDue) {
          badge.className = "badge badge-income";
          badge.textContent = "PAID";
        } else if (paidVal > 0) {
          badge.className = "badge badge-amber";
          badge.textContent = "PARTIAL";
        } else {
          badge.className = "badge badge-expense";
          badge.textContent = "PENDING";
        }
      }
    }
  });

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target.closest("button") : null;
    if (!target) return;

    if (target.id === "apply-fixed-dues-all") {
      const state = getMonthlyFundState();
      const activeMonth = state.activeMonth;
      const fixedAmount = state.fixedAmount;
      if (!state.records[activeMonth]) {
        state.records[activeMonth] = { fixedAmount, students: [] };
      }
      state.records[activeMonth].fixedAmount = fixedAmount;
      state.records[activeMonth].students = state.students.map(s => {
        const existing = (state.records[activeMonth].students || []).find(r => r.id === s.id);
        return {
          id: s.id,
          due_amount: fixedAmount,
          amount_paid: existing ? existing.amount_paid : 0,
          payment_status: existing ? existing.payment_status : "PENDING",
          payment_date: existing ? existing.payment_date : null,
          remarks: existing ? existing.remarks : ""
        };
      });
      saveMonthlyFundState(state);
      alert(`Successfully applied fixed dues of ₹${fixedAmount} to all ${state.students.length} classmates for ${activeMonth}!`);
      const financeLink = document.querySelector('a[href="#finance"]');
      if (financeLink) financeLink.click();
    }

    if (target.classList.contains("button-save-payment")) {
      const studentId = target.dataset.saveStudentId;
      const row = target.closest("tr");
      const input = row?.querySelector(".student-paid-input");
      if (!input) return;
      const paidVal = parseFloat(input.value) || 0;
      const state = getMonthlyFundState();
      const activeMonth = state.activeMonth;
      if (!state.records[activeMonth]) {
        state.records[activeMonth] = { fixedAmount: state.fixedAmount, students: [] };
      }
      let rec = state.records[activeMonth].students.find(r => r.id === studentId);
      const totalDue = parseFloat(row.children[4].textContent.replace("₹", "")) || 100;
      const status = paidVal >= totalDue ? "PAID" : paidVal > 0 ? "PARTIAL" : "PENDING";

      if (rec) {
        rec.amount_paid = paidVal;
        rec.payment_status = status;
        rec.payment_date = new Date().toISOString();
      } else {
        state.records[activeMonth].students.push({
          id: studentId,
          due_amount: state.fixedAmount,
          amount_paid: paidVal,
          payment_status: status,
          payment_date: new Date().toISOString(),
          remarks: "Saved by Treasurer"
        });
      }
      saveMonthlyFundState(state);
      alert(`Payment record saved successfully! Status: ${status}`);
      const financeLink = document.querySelector('a[href="#finance"]');
      if (financeLink) financeLink.click();
    }

    if (target.classList.contains("button-whatsapp-notice")) {
      const studentId = target.dataset.whatsappStudentId;
      const state = getMonthlyFundState();
      const student = state.students.find(s => s.id === studentId);
      if (!student) return;
      const activeMonth = state.activeMonth;
      const msg = `Assalamu Alaikum ${student.name}, your ADAB Class Union monthly fund payment of ₹${state.fixedAmount} for ${activeMonth} is pending. Kindly pay to the Treasurer at your earliest convenience.`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(msg).then(() => {
          alert(`WhatsApp reminder message copied to clipboard for ${student.name}!\n\n"${msg}"`);
        });
      } else {
        window.prompt("WhatsApp reminder notice:", msg);
      }
    }

    if (target.dataset.openStatement) {
      const studentId = target.dataset.openStatement;
      const state = getMonthlyFundState();
      const student = state.students.find(s => s.id === studentId);
      if (!student) return;

      let historyHtml = "";
      Object.keys(state.records).sort().forEach(mKey => {
        const mData = state.records[mKey];
        const sRec = mData.students.find(s => s.id === studentId) || { due_amount: 100, amount_paid: 0, payment_status: "PENDING" };
        historyHtml += `<tr>
          <td><strong>${mKey}</strong></td>
          <td>₹${sRec.due_amount}</td>
          <td>₹${sRec.amount_paid}</td>
          <td><span class="badge ${sRec.payment_status === "PAID" ? "badge-income" : sRec.payment_status === "PARTIAL" ? "badge-amber" : "badge-expense"}">${sRec.payment_status}</span></td>
        </tr>`;
      });

      const modalBackdrop = document.querySelector("#modal-backdrop");
      const modalContent = document.querySelector("#modal-content");
      if (modalBackdrop && modalContent) {
        modalContent.innerHTML = `
          <div class="statement-modal-body">
            <span class="badge">Student Defaulter & Payment Statement</span>
            <h2 id="modal-title">${escapeHTML(student.name)} (${escapeHTML(student.roll)})</h2>
            <p>House: <strong>${escapeHTML(student.house)}</strong> · District: ${escapeHTML(student.district)}</p>
            <div class="ledger-table-wrapper" style="margin-top: 18px;">
              <table class="ledger-table">
                <thead>
                  <tr><th>Month</th><th>Due</th><th>Paid</th><th>Status</th></tr>
                </thead>
                <tbody>${historyHtml}</tbody>
              </table>
            </div>
            <div style="margin-top: 20px; text-align: right;">
              <button type="button" class="button" onclick="document.querySelector('#modal-backdrop').hidden = true">Close Statement</button>
            </div>
          </div>
        `;
        modalBackdrop.hidden = false;
      }
    }

    if (target.id === "download-fund-report-btn") {
      window.print();
    }
  });

  // Roster live search
  document.addEventListener("input", event => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches("#roster-search")) return;
    const q = target.value.toLowerCase();
    const rows = document.querySelectorAll(".student-roster-table tbody tr");
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(q) ? "" : "none";
    });
  });
}
