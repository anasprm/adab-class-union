import { studentSeedData, teacherAnnualDonationBase } from "./data.js";
import { formatMoney, escapeHTML } from "./router.js";

const MONTHLY_FUND_STORAGE_KEY = "adab_monthly_fund_state";
const BILLING_YEAR = 2026;
const BILLING_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
let realStudentNames = new Map();

export function setMonthlyFundDirectory(rows) {
  realStudentNames = new Map((rows || []).map(student => [student.roll, student.name]));
}

function getStudentMonthlyDonationBase(state, studentId) {
  const savedBase = Number(state.donationRecords?.[studentId]?.monthlyBase);
  if (Number.isFinite(savedBase) && savedBase >= 100 && savedBase <= 2000) return savedBase;

  const legacyBase = Number(state.monthlyDonationBase);
  return Number.isFinite(legacyBase) && legacyBase >= 100 && legacyBase <= 2000
    ? legacyBase
    : teacherAnnualDonationBase;
}

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
  const students = (state.students || []).map(student => ({
    ...student,
    name: realStudentNames.get(student.roll) || `Student ${student.roll}`
  }));
  const totalStudents = students.length;

  // Initialize donation/debt records if not present
  if (!state.donationRecords) state.donationRecords = {};
  if (!state.debtRecords) state.debtRecords = [];

  // Calculations
  let totalExpectedForMonth = 0;
  let totalCollectedForMonth = 0;
  let totalPendingAcrossAll = 0;
  let paidCount = 0;

  const rosterRows = students.map(stu => {
    const rec = state.records[activeMonth] && state.records[activeMonth].students.find(r => r.id === stu.id) || { due_amount: fixedAmount, amount_paid: 0, payment_status: "PENDING" };
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
      remarks: rec.remarks || ""
    };
  });

  const completionRate = totalStudents > 0 ? Math.round((paidCount / totalStudents) * 100) : 0;
  const grandTotalExpected = totalExpectedForMonth;

  const canEdit = currentProfile && ["developer", "treasurer"].includes(currentProfile.role);
  const canViewOther = currentProfile && ["developer", "teacher"].includes(currentProfile.role);

  // Build the "Other Financial Portal" HTML (Teacher & Developer ONLY)
  let otherPortalHtml = "";
  if (canViewOther) {
    otherPortalHtml = `<!-- C. Restricted "Other" Financial Portal (Teacher & Developer ONLY) -->
    <section class="section-block other-financials-portal">
      <div class="section-heading">
        <div>
          <span class="badge">Other Financial Portal</span>
          <h2 class="section-title">Restricted Financial Management</h2>
        </div>
      </div>
      <div class="card-deck other-financials-deck">
        <article class="card other-financials-card">
          <div class="card-header">
            <h3>Individual Monthly Donation Bases</h3>
          </div>
          <div class="card-body">
            <p class="financial-intro">
              Set a monthly donation base for each student. Their annual target is calculated from their own monthly amount.
            </p>
            <div id="teacher-donations-table" class="donation-table-scroll">
              <table class="donation-ledger-table">
                <thead>
                  <tr>
                    <th scope="col">Roll</th>
                    <th scope="col">Name</th>
                    <th scope="col">Monthly Base</th>
                    <th scope="col">Paid YTD</th>
                    <th scope="col">Remaining</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${students.map(stu => {
                    const studentRecord = state.donationRecords[stu.id] || { totalPaidYTD: 0, payments: [] };
                    const monthlyBase = getStudentMonthlyDonationBase(state, stu.id);
                    const totalTarget = monthlyBase * 12;
                    const paidYTD = Number(studentRecord.totalPaidYTD || 0);
                    const remaining = Math.max(0, totalTarget - paidYTD);
                    const status = paidYTD >= totalTarget ? "CLEARED" : paidYTD > 0 ? "PARTIAL" : "PENDING";
                    return `<tr>
                      <td>${escapeHTML(stu.roll)}</td>
                      <td>${escapeHTML(stu.name)}</td>
                      <td>
                        <input class="donation-base-input" type="number" min="100" max="2000" step="50"
                          value="${monthlyBase}" data-student-donation-base="${escapeHTML(stu.id)}"
                          aria-label="Monthly donation base for ${escapeHTML(stu.name)}">
                      </td>
                      <td>₹${paidYTD}</td>
                      <td>₹${remaining}</td>
                      <td><span class="donation-status donation-status-${status.toLowerCase()}">${status}</span></td>
                    </tr>`
                  }).join("")}
                </tbody>
              </table>
            </div>
            <div class="financial-actions">
              <button type="button" class="button" id="teacher-donation-save-all">Save All Donation Records</button>
              <button type="button" class="button button-secondary">Reset All</button>
            </div>
          </div>
        </article>

        <article class="card other-financials-card">
          <div class="card-header">
            <h3>Personal &amp; Class Debts Tracker</h3>
          </div>
          <div class="card-body">
            <p class="financial-intro">
              Track personal debts (textbooks, tour advances, fines) owed by students to the class/teacher.
            </p>
            <div class="form-field">
              <label for="debt-student-select">Student</label>
              <select id="debt-student-select">
                <option value="">Select a student...</option>
                ${students.map((stu) => `<option value="${stu.id}">${stu.roll} · ${stu.name}</option>`).join("")}
              </select>
            </div>
            <div class="form-field">
              <label for="debt-description">Debt Description</label>
              <input id="debt-description" type="text" placeholder="e.g. Textbooks, Tour Advance, Fine, Exam Fee">
            </div>
            <div class="form-field">
              <label for="debt-amount">Total Debt Amount (₹)</label>
              <input id="debt-amount" type="number" min="1" step="10">
            </div>
            <div class="form-field">
              <label for="debt-duedue">Due Date</label>
              <input id="debt-duedue" type="date">
            </div>
            <button type="button" class="button" id="debt-add-btn">Add Debt Item</button>
            <div id="debt-items-container" class="debt-items-container">
            ${state.debtRecords.map(dt => {
              const statusTone = dt.status === "CLEARED" ? "cleared" : dt.status === "PARTIAL" ? "partial" : "pending";
              return `<div class="debt-record debt-record-${statusTone}">
                <div class="debt-record-header">
                  <span>${escapeHTML(dt.studentRoll)} - ${escapeHTML(dt.description)}</span>
                  <span class="debt-record-amount">${formatMoney(dt.amountPaid)} / ${formatMoney(dt.totalAmount)}</span>
                </div>
                <div class="debt-record-footer">
                  <span class="debt-record-status">${escapeHTML(dt.status)}</span>
                  <small>Due: ${escapeHTML(dt.dueDate || "—")}</small>
                </div>
              </div>`
            }).join("")}
            </div>
          </div>
          </article>
        </div>
    </section>`;
  }

  return `<!-- Monthly Fund Management System -->
  <section class="section-block monthly-fund-wrapper">
    <div class="section-heading">
      <div>
        <span class="badge badge-red">Treasurer Financial Module</span>
        <h2 class="section-title">Student Monthly Fund Tracker</h2>
        <p>Manage fixed monthly dues, record student payments, track arrears, and generate audit reports.</p>
      </div>
      <div class="treasurer-quick-actions">
        <button type="button" class="button button-secondary" id="download-fund-report-btn">Download Monthly Report (PDF/CSV)</button>
      </div>
    </div>

    <!-- A. Treasurer Control Panel -->
    <div class="card treasurer-control-card">
      <div class="card-body">
        <div class="treasurer-control-grid">
          <div class="form-field">
            <label for="active-billing-month">Active Billing Month</label>
            <select id="active-billing-month" class="treasurer-select">
              ${BILLING_MONTHS.map((month, index) => {
                const monthKey = `${BILLING_YEAR}-${String(index + 1).padStart(2, "0")}`;
                return `<option value="${monthKey}" ${activeMonth === monthKey ? "selected" : ""}>${month} ${BILLING_YEAR}</option>`;
              }).join("")}
            </select>
          </div>
          <div class="form-field">
            <label for="global-fixed-dues">Global Fixed Monthly Fee (₹)</label>
            <input id="global-fixed-dues" type="number" min="0" step="10" value="${fixedAmount}" ${canEdit ? "" : "readonly"}>
          </div>
          <div class="form-field treasurer-apply-action">
            <label>&nbsp;</label>
            ${canEdit ? `<button type="button" class="button" id="apply-fixed-dues-all">Apply Fixed Dues to All ${totalStudents} Classmates</button>` : `<span class="badge badge-neutral">View-Only Mode</span>`}
          </div>
          <div class="form-field treasurer-apply-action">
            <label>&nbsp;</label>
            ${canEdit ? `<button type="button" class="button" id="save-all-entries">Save All Entries</button>` : ``}
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
                  <div class="student-avatar-ring">${escapeHTML(stu.initials)}</div>
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
                  <button type="button" class="button button-secondary button-whatsapp-notice" data-whatsapp-student-id="${escapeHTML(stu.id)}" title="Send WhatsApp Payment Reminder">WhatsApp</button>
                  ` : `<span class="text-muted">—</span>`}
                </div>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>

    ${otherPortalHtml}
  </section>`;
}

export function initializeMonthlyFundTracker({ getCurrentProfile = () => null, notify = () => {} } = {}) {
  const refreshTracker = () => {
    const tracker = document.querySelector(".monthly-fund-wrapper");
    if (tracker) tracker.outerHTML = renderMonthlyFundTracker(getCurrentProfile());
  };

  const getStudentMonthRecord = (state, student, month) => {
    state.records ||= {};
    const monthRecord = state.records[month] ||= {
      fixedAmount: Number(state.fixedAmount) || 100,
      students: []
    };
    let studentRecord = monthRecord.students.find(record => record.id === student.id);
    if (!studentRecord) {
      studentRecord = {
        id: student.id,
        due_amount: Number(state.fixedAmount) || 100,
        amount_paid: 0,
        payment_status: "PENDING",
        remarks: "Payment pending"
      };
      monthRecord.students.push(studentRecord);
    }
    return studentRecord;
  };

  document.addEventListener("change", event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches("#active-billing-month")) {
      const state = getMonthlyFundState();
      state.activeMonth = target.value;
      saveMonthlyFundState(state);
      refreshTracker();
    }

    if (target.matches("#global-fixed-dues")) {
      const state = getMonthlyFundState();
      const value = Number(target.value);
      if (Number.isFinite(value) && value >= 0) {
        state.fixedAmount = value;
        saveMonthlyFundState(state);
      }
    }

    if (target.matches(".student-paid-input")) {
      const row = target.closest("tr");
      if (!row) return;
      const paidVal = parseFloat(target.value) || 0;
      const totalDue = Number(row.querySelector(".numeric-total-due")?.textContent.replace(/[^\d.-]/g, "")) || 0;
      const badge = row.querySelector("[data-status-badge]");
      if (badge) {
        if (paidVal >= totalDue) {
          badge.className = "badge-pill-paid";
          badge.textContent = "PAID";
        } else if (paidVal > 0) {
          badge.className = "badge-pill-partial";
          badge.textContent = "PARTIAL";
        } else {
          badge.className = "badge-pill-pending";
          badge.textContent = "PENDING";
        }
      }
    }

    if (target.matches("[data-student-donation-base]")) {
      const state = getMonthlyFundState();
      const monthlyBase = Number(target.value);
      if (!Number.isFinite(monthlyBase) || monthlyBase < 100 || monthlyBase > 2000) {
        notify("Enter a monthly donation between ₹100 and ₹2,000.", "error");
        target.value = String(getStudentMonthlyDonationBase(state, target.dataset.studentDonationBase));
        return;
      }

      const studentId = target.dataset.studentDonationBase;
      if (!studentId) return;
      state.donationRecords ||= {};
      const record = state.donationRecords[studentId] ||= { totalPaidYTD: 0, payments: [] };
      record.monthlyBase = monthlyBase;
      saveMonthlyFundState(state);
      refreshTracker();
      notify("Student monthly donation base updated.");
    }
  });

  document.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches("#apply-fixed-dues-all")) {
      const state = getMonthlyFundState();
      const activeMonth = state.activeMonth || "2026-03";
      const fixedAmount = Number(document.querySelector("#global-fixed-dues")?.value);
      if (!Number.isFinite(fixedAmount) || fixedAmount < 0) {
        notify("Enter a valid monthly fee before applying it.", "error");
        return;
      }
      state.fixedAmount = fixedAmount;
      (state.students || []).forEach(student => {
        const record = getStudentMonthRecord(state, student, activeMonth);
        record.due_amount = fixedAmount;
        const totalDue = fixedAmount + calculateStudentArrears(student.id, activeMonth, state);
        record.payment_status = Number(record.amount_paid || 0) >= totalDue
          ? "PAID"
          : Number(record.amount_paid || 0) > 0 ? "PARTIAL" : "PENDING";
      });
      saveMonthlyFundState(state);
      refreshTracker();
      notify(`Applied ₹${fixedAmount} monthly dues to ${state.students.length} classmates.`);
    }

    if (target.matches("#teacher-donation-save-all")) {
      const state = getMonthlyFundState();
      state.donationRecords ||= {};
      (state.students || []).forEach(student => {
        const record = state.donationRecords[student.id] ||= { totalPaidYTD: 0, payments: [] };
        const paidYTD = Number(record.totalPaidYTD) || 0;
        const monthlyBase = getStudentMonthlyDonationBase(state, student.id);
        record.status = paidYTD >= monthlyBase * 12 ? "CLEARED" : paidYTD > 0 ? "PARTIAL" : "PENDING";
      });
      saveMonthlyFundState(state);
      refreshTracker();
      notify("All donation records saved.");
    }

    if (target.matches("#debt-add-btn")) {
      const studentSelect = document.querySelector("#debt-student-select");
      const descriptionField = document.querySelector("#debt-description");
      const amountField = document.querySelector("#debt-amount");
      const dueDateField = document.querySelector("#debt-duedue");
      const description = descriptionField?.value.trim() || "";
      const amount = Number(amountField?.value);
      if (!studentSelect?.value || !description || !Number.isFinite(amount) || amount <= 0) {
        notify("Please fill in all debt fields with a valid amount.", "error");
        return;
      }

      const state = getMonthlyFundState();
      state.debtRecords ||= [];
      const studentRoll = studentSelect.options[studentSelect.selectedIndex]?.text || "";
      state.debtRecords.push({
        id: `debt-${Date.now()}`,
        studentId: studentSelect.value,
        studentRoll,
        description,
        totalAmount: amount,
        amountPaid: 0,
        dueDate: dueDateField?.value || "",
        status: "PENDING",
        createdAt: new Date().toISOString()
      });
      saveMonthlyFundState(state);
      refreshTracker();
      notify(`Debt added for ${studentRoll}`);
    }

    const isSaveAll = target.matches("#save-all-entries");
    const studentId = target.dataset.saveStudentId;
    if (isSaveAll || studentId) {
      const state = getMonthlyFundState();
      const activeMonth = state.activeMonth || "2026-03";
      const students = (state.students || []).filter(student => !studentId || student.id === studentId);
      const updates = [];

      for (const student of students) {
        const input = [...document.querySelectorAll(".student-paid-input")]
          .find(candidate => candidate.dataset.studentId === student.id);
        const row = input?.closest("tr");
        if (!input || !row) continue;

        const paid = Number(input.value);
        const totalDue = Number(row.querySelector(".numeric-total-due")?.textContent.replace(/[^\d.-]/g, ""));
        if (!Number.isFinite(paid) || paid < 0 || !Number.isFinite(totalDue) || paid > totalDue) {
          notify(`Enter a payment between ₹0 and ₹${totalDue || 0} for ${student.name}.`, "error");
          input.focus();
          return;
        }
        updates.push({ student, paid, totalDue });
      }

      if (!updates.length) {
        notify("No payment entries were available to save.", "error");
        return;
      }

      updates.forEach(({ student, paid, totalDue }) => {
        const record = getStudentMonthRecord(state, student, activeMonth);
        record.amount_paid = paid;
        record.payment_status = paid >= totalDue ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING";
        record.remarks = paid >= totalDue ? "Paid in full" : paid > 0 ? "Partial payment received" : "Payment pending";
      });
      saveMonthlyFundState(state);
      refreshTracker();
      notify(isSaveAll
        ? `Saved payment entries for ${updates.length} classmates.`
        : `Saved payment for ${updates[0].student.name}.`);
    }
  });
}