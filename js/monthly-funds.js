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
  const canViewOther = currentProfile && ["developer", "teacher"].includes(currentProfile.role);

  // Build the "Other Financial Portal" HTML (Teacher & Developer ONLY)
  let otherPortalHtml = "";
  if (canViewOther) {
    otherPortalHtml = `<!-- C. Restricted "Other" Financial Portal (Teacher & Developer ONLY) -->
    <section class="section-block other-financials-portal" style="border: 2px solid #991B1B; background: #111827; margin-top: 32px;">
      <div class="section-heading" style="border-bottom: 2px solid #991B1B;">
        <div>
          <span class="badge badge-red" style="color: #DC2626; background: #FEF2F2;">Other Financial Portal</span>
          <h2 class="section-title">Restricted Financial Management</h2>
        </div>
      </div>
      <div class="card-deck" style="max-width: 1200px; margin: 20px auto 0; padding: 0 16px;">
        <div class="card" style="background: #1e293b; margin-bottom: 24px;">
          <div class="card-header" style="background: #3b82f6; color: white; padding: 12px 16px;">
            <h3 style="margin: 0;">Sub-Section 1: Annual Fixed Monthly Donation</h3>
          </div>
          <div class="card-body" style="padding: 16px;">
            <p style="color: #cffafe; margin-bottom: 16px;">
              At the start of the academic year, the Class Teacher sets a fixed annual monthly donation amount per student account.
            </p>
            <div class="form-field" style="margin: 12px 0;">
              <label style="color: white;" for="teacher-donation-base">Monthly Base Donation (₹)</label>
              <input id="teacher-donation-base" type="number" min="100" max="2000" step="50" value="${teacherAnnualDonationBase}" style="width: 100%; padding: 8px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: .87rem;">
              <small class="form-text-muted" style="display: block; margin-top: 6px;">Set at year start. Applied uniformly to all 15 student accounts.</small>
            </div>
            <div id="teacher-donations-table" style="width: 100%; overflow-x: auto; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse; color: #fff;">
                <thead>
                  <tr style="background: #3b82f6; color: white; text-align: left;">
                    <th style="padding: 8%;">Roll</th>
                    <th style="padding: 8%;">Name</th>
                    <th style="padding: 8%;">Monthly Base</th>
                    <th style="padding: 8%;">Paid YTD</th>
                    <th style="padding: 8%;">Remaining</th>
                    <th style="padding: 8%;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${students.map((stu, sIdx) => {
                    const monthlyBase = Number(document.getElementById('teacher-donation-base')?.value || teacherAnnualDonationBase);
                    const totalTarget = monthlyBase * 12;
                    const studentRecord = state.donationRecords[stu.id] || { totalPaidYTD: 0, payments: [] };
                    const paidYTD = Number(studentRecord.totalPaidYTD || 0);
                    const remaining = Math.max(0, totalTarget - paidYTD);
                    const status = paidYTD >= totalTarget ? "CLEARED" : paidYTD > 0 ? "PARTIAL" : "PENDING";
                    return `<tr style="background: #0f172a;">
                      <td style="padding: 8%;">${stu.roll}</td>
                      <td style="padding: 8%;">${stu.name}</td>
                      <td style="padding: 8%;">₹${monthlyBase}</td>
                      <td style="padding: 8%;">₹${paidYTD}</td>
                      <td style="padding: 8%;">₹${remaining}</td>
                      <td style="padding: 8%;"><span style="padding: 4px 8px; border-radius: 10px; font-size: .72rem; font-weight: 600; text-transform: uppercase;">
                        ${status === "CLEARED" ? "background: #10b981; color: #fff" : status === "PARTIAL" ? "background: #f59e0b; color: #78350f" : "background: #ef4444; color: #fff"}
                      }>${status}</span></td>
                    </tr>`
                  }).join("")}
                </tbody>
              </table>
            </div>
            <div style="margin-top: 12px;">
              <button type="button" class="button" id="teacher-donation-save-all" style="background: #10b981; color: #fff; padding: 6px 12px; border: none; border-radius: 6px; font-size: .78rem;">Save All Donation Records</button>
              <button type="button" class="button button-secondary" style="background: #64748b; color: #fff; padding: 6px 12px; border: none; border-radius: 6px; font-size: .78rem;">Reset All</button>
            </div>
          </div>
        </div>

        <div class="card" style="background: #1e293b; margin-bottom: 24px;">
          <div class="card-header" style="background: #f97316; color: white; padding: 12px 16px;">
            <h3 style="margin: 0;">Sub-Section 2: Personal & Class Debts Tracker</h3>
          </div>
          <div class="card-body" style="padding: 16px;">
            <p style="color: #cffafe; margin-bottom: 16px;">
              Track personal debts (textbooks, tour advances, fines) owed by students to the class/teacher.
            </p>
            <div style="margin: 12px 0;">
              <select id="debt-student-select" style="width: 100%; padding: 8px; background: #3b82f6; color: white; border: none; border-radius: 6px;">
                <option value="">Select a student...</option>
                ${students.map((stu) => `<option value="${stu.id}">${stu.roll} · ${stu.name}</option>`).join("")}
              </select>
            </div>
            <div class="form-field" style="margin: 8px 0;">
              <label style="color: white;" for="debt-description">Debt Description</label>
              <input id="debt-description" type="text" placeholder="e.g. Textbooks, Tour Advance, Fine, Exam Fee" style="width: 100%; padding: 8px; background: #3b82f6; color: white; border: none; border-radius: 6px;">
            </div>
            <div class="form-field" style="margin: 8px 0;">
              <label style="color: white;" for="debt-amount">Total Debt Amount (₹)</label>
              <input id="debt-amount" type="number" min="1" step="10" style="width: 100%; padding: 8px; background: #3b82f6; color: white; border: none; border-radius: 6px;">
            </div>
            <div class="form-field" style="margin: 8px 0;">
              <label style="color: white;" for="debt-duedue">Due Date</label>
              <input id="debt-duedue" type="date" style="width: 100%; padding: 8px; background: #3b82f6; color: white; border: none; border-radius: 6px;">
            </div>
            <button type="button" class="button" id="debt-add-btn" style="background: #f97316; color: #fff; padding: 6px 12px; border: none; border-radius: 6px; width: 100%; margin-top: 8px;">Add Debt Item</button>
            <div id="debt-items-container" style="margin-top: 12px; max-height: 200px; overflow-y: auto; border: 1px solid #475569; padding: 8px; background: #0f172a; border-radius: 6px;">
              ${state.debtRecords.map((dt, dIdx) => {
                const statusClass = dt.status === "CLEARED" ? "bg-green-500" : dt.status === "PARTIAL" ? "bg-amber-500" : "bg-red-500";
                const statusText = dt.status;
                return `<div style="background: #0f172a; padding: 8px; margin: 4px 0; border-radius: 6px; border-left: 3px solid ${statusClass}; color: #fff;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${dt.studentRoll} - ${dt.description}</span>
                    <span style="font-size: .72rem;">₹${dt.amountPaid} / ₹${dt.totalAmount} (${dt.status})</span>
                  </div>
                  <small style="margin-top: 4px; opacity: 0.8;">Due: ${dt.dueDate || "—"}</small>
                </div>`
              }).join("")}
            </div>
          </div>
        </div>
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
          <div class="form-field treasurer-apply-action">
            <label>&nbsp;</label>
            ${canEdit ? `<button type="button" class="button" id="save-all-entries" style="background: #dc2626; color: #fff; padding: 6px 12px; border: none; border-radius: 6px; font-size: .82rem; margin-left: 8px;">💾 Save All Entries</button>` : ``}
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

    ${otherPortalHtml}
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

    if (target.matches("#teacher-donation-base")) {
      const val = parseFloat(target.value) || teacherAnnualDonationBase;
      if (!state.donationRecords) state.donationRecords = {};
      state.donationRecords = state.students.reduce((acc, stu) => {
        acc[stu.id] = { totalPaidYTD: 0, payments: [] };
        return acc;
      }, {});
      renderMonthlyFundTracker(currentProfile);
      showToast(`Monthly base donation set to ₹${val}`);
    }

    if (target.matches("#teacher-donation-save-all")) {
      if (state.donationRecords) {
        Object.keys(state.donationRecords).forEach(studentId => {
          const record = state.donationRecords[studentId];
          const monthlyBase = Number(document.getElementById('teacher-donation-base')?.value || teacherAnnualDonationBase);
          const totalTarget = monthlyBase * 12;
          if (record.totalPaidYTD >= totalTarget) {
            record.status = "CLEARED";
          } else if (record.totalPaidYTD > 0) {
            record.status = "PARTIAL";
          } else {
            record.status = "PENDING";
          }
        });
      }
      renderMonthlyFundTracker(currentProfile);
      showToast("All donation records saved.");
    }

    if (target.matches("#debt-add-btn")) {
      const studentSelect = document.getElementById('debt-student-select');
      const description = document.getElementById('debt-description')?.value || "";
      const amount = parseFloat(document.getElementById('debt-amount')?.value || "0") || 0;
      const dueDate = document.getElementById('debt-duedue')?.value || "";
      const studentRoll = studentSelect.options[studentSelect.selectedIndex]?.text || "";
      
      if (!studentSelect.value || !description || !amount) {
        showToast("Please fill in all debt fields.", "error");
        return;
      }
      
      if (!state.debtRecords) state.debtRecords = [];
      state.debtRecords.push({
        id: `debt-${Date.now()}`,
        studentId: studentSelect.value,
        studentRoll: studentRoll,
        description,
        totalAmount: amount,
        amountPaid: 0,
        dueDate,
        status: "PENDING",
        createdAt: new Date().toISOString()
      });
      
      saveMonthlyFundState(state);
      renderMonthlyFundTracker(currentProfile);
      showToast(`Debt added for ${studentRoll}`);
      document.getElementById('debt-description').value = "";
      document.getElementById('debt-amount').value = "0";
      document.getElementById('debt-duedue').value = "";
    }
  });

  // --- SAVE ALL ENTRIES BULK ACTION ---
  let savedScrollY = 0;

  document.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches("#save-all-entries")) {
      event.preventDefault();
      // Save current scroll position
      savedScrollY = window.scrollY;
      // Lock scroll position
      window.onscroll = () => { window.scrollTo(0, savedScrollY); };

      const state = getMonthlyFundState();
      const activeMonth = state.activeMonth || "2026-03";
      const fixedAmount = state.fixedAmount || 100;
      const students = state.students || [];

      let updated = 0;
      students.forEach(stu => {
        const input = document.querySelector(`.student-paid-input[data-student-id="${stu.id}"]`);
        if (input) {
          const paidVal = parseFloat(input.value) || 0;
          const totalDue = Number(stu.totalDue) || Number(stu.due) || fixedAmount;
          const arrears = stu.arrears || 0;

          // Update the state record
          const monthRecord = state.records[activeMonth];
          if (monthRecord) {
            const sRecord = monthRecord.students.find(s => s.id === stu.id);
            if (sRecord) {
              sRecord.amount_paid = paidVal;
              sRecord.payment_status = paidVal >= totalDue ? "PAID" : paidVal > 0 ? "PARTIAL" : "PENDING";
              sRecord.remarks = paidVal >= totalDue ? "Paid in full" : paidVal > 0 ? "Partial payment received" : "Payment pending";
              updated++;
            }
          }
        }
      });

      // Save updated state to LocalStorage
      saveMonthlyFundState(state);

      // Highlight modified rows with green flash
      const modifiedRows = document.querySelectorAll(".student-roster-table tbody tr");
      modifiedRows.forEach(row => {
        row.style.transition = "background 0.3s ease";
        row.style.background = "#ECFDF5";
        // Reset after flash
        setTimeout(() => {
          row.style.background = "";
        }, 300);
      });

      // Re-render tracker to update metrics
      renderMonthlyFundTracker(currentProfile);

      // Restore scroll position with slight delay
      setTimeout(() => {
        window.onscroll = "";
        window.scrollTo(0, savedScrollY);
      }, 500);

      // Show floating toast notification
      showToast("Success! All 15 student entries updated and saved.");
    }
  });
}