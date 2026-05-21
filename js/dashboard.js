import { applyRipple, createToast, qs, qsa } from "./ui.js";
import { fetchStats, fetchMembers, fetchPending, updateStatus, deleteMember } from "./api.js";

const statsMap = {
  total: qs("#stat-total"),
  active: qs("#stat-active"),
  pending: qs("#stat-pending"),
  monthly: qs("#stat-monthly"),
  expiring: qs("#stat-expiring"),
  expired: qs("#stat-expired"),
};

const membersBody = qs("#members-body");
const pendingBox = qs("#pending-box");
const pagination = qs("#pagination");
const searchInput = qs("#search-input");
const searchButton = qs("#search-btn");
const resetButton = qs("#reset-btn");
const resetFiltersButton = qs("#reset-filters-btn");
const statusFilter = qs("#status-filter");
const planFilter = qs("#plan-filter");
const sortDateButton = qs("#sort-date-btn");
const pendingFilterButton = qs("#pending-filter-btn");
const pendingAlert = qs("#pending-alert");
const alertPendingCount = qs("#alert-pending-count");
const navButtons = qsa(".nav-list button[data-scroll]");
const trackedSections = navButtons
  .map((btn) => qs(`#${btn.dataset.scroll}`))
  .filter(Boolean);

let currentPage = 1;
let cachedMembers = [];
let lastToastTerm = "";
let sortDateOrder = "desc";
let sortMode = "date";

const STATUS_LABELS = {
  active: "نشط",
  pending: "قيد المراجعة",
  inactive: "غير نشط",
  rejected: "مرفوض",
};

const PLAN_OPTIONS = [
  { value: "monthly", label: "شهري" },
  { value: "quarterly", label: "3 شهور" },
];

function normalizePlan(value) {
  const plan = String(value || "").trim().toLowerCase();
  if (plan === "monthly" || plan === "شهري" || plan === "اشتراك شهري") return "monthly";
  if (plan === "quarterly" || plan === "3 شهور" || plan === "ثلاث شهور") return "quarterly";
  return plan;
}

function getPlanLabel(value) {
  const normalized = normalizePlan(value);
  const match = PLAN_OPTIONS.find((plan) => plan.value === normalized);
  return match ? match.label : String(value || "-");
}

function setStat(key, value) {
  if (!statsMap[key]) return;
  statsMap[key].textContent = value;
  statsMap[key].classList.remove("skeleton");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function highlightText(value, keyword) {
  const text = String(value ?? "");
  const term = String(keyword ?? "").toLowerCase();
  if (!term) return escapeHtml(text);
  const lower = text.toLowerCase();
  let result = "";
  let cursor = 0;
  let matchIndex = lower.indexOf(term, cursor);

  while (matchIndex !== -1) {
    result += escapeHtml(text.slice(cursor, matchIndex));
    result += `<span class="highlight">${escapeHtml(text.slice(matchIndex, matchIndex + term.length))}</span>`;
    cursor = matchIndex + term.length;
    matchIndex = lower.indexOf(term, cursor);
  }

  result += escapeHtml(text.slice(cursor));
  return result;
}

function parseDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime();
}

function updatePlanOptions(list) {
  if (!planFilter) return;
  const current = planFilter.value || "all";
  const options = PLAN_OPTIONS.map(
    (plan) => `<option value="${plan.value}">${plan.label}</option>`
  ).join("");
  planFilter.innerHTML = `<option value="all">كل الباقات</option>${options}`;
  const isAllowed = PLAN_OPTIONS.some((plan) => plan.value === current);
  planFilter.value = isAllowed ? current : "all";
}

function updateSortButtonLabel() {
  if (!sortDateButton) return;
  const arrow = sortDateOrder === "asc" ? "↑" : "↓";
  const arrowNode = sortDateButton.querySelector(".sort-arrow");
  if (arrowNode) {
    arrowNode.textContent = arrow;
  }
  sortDateButton.dataset.order = sortDateOrder;
}

function parseIdValue(value) {
  const text = String(value || "");
  const numeric = Number(text.replace(/[^0-9]/g, ""));
  return Number.isNaN(numeric) ? text : numeric;
}

function renderMembers(list, highlightTerm = "", emptyMessage = "لا توجد بيانات حاليا") {
  membersBody.innerHTML = "";
  if (!list.length) {
    membersBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">${emptyMessage}</div></td></tr>`;
    return;
  }

  list.forEach((member) => {
    const row = document.createElement("tr");
    const statusClass = member.status === "active" ? "success" : member.status === "pending" ? "warning" : "danger";
    const statusLabel = STATUS_LABELS[member.status] || member.status;
    
    row.innerHTML = `
      <td>${highlightText(member.fullName, highlightTerm)}</td>
      <td>${highlightText(member.phone, highlightTerm)}</td>
      <td>${escapeHtml(getPlanLabel(member.plan))}</td>
      <td><span class="badge ${statusClass}">${statusLabel}</span></td>
      <td>${escapeHtml(member.endDate ? member.endDate.split("T")[0] : "-")}</td>
      <td>
        <button class="delete-btn" title="حذف المشترك" style="background:none; border:none; cursor:pointer; color: var(--danger); padding: 6px; border-radius: 6px; transition: 0.2s; opacity: 0.8;">
          <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
        </button>
      </td>
    `;
    
    const deleteBtn = row.querySelector('.delete-btn');
    
    deleteBtn.addEventListener('mouseenter', () => deleteBtn.style.opacity = "1");
    deleteBtn.addEventListener('mouseleave', () => deleteBtn.style.opacity = "0.8");

    deleteBtn.addEventListener('click', async () => {
      if (confirm(`هل أنت متأكد من حذف المشترك "${member.fullName}" نهائياً؟`)) {
        deleteBtn.style.opacity = "0.3";
        deleteBtn.style.pointerEvents = "none";
        
        const res = await deleteMember(member.id);
        if (res && res.success) {
          createToast("تم حذف المشترك بنجاح", "success");
          loadMembers(currentPage); 
          loadStats(); 
        } else {
          createToast("حدث خطأ أثناء الحذف", "error");
          deleteBtn.style.opacity = "0.8";
          deleteBtn.style.pointerEvents = "auto";
        }
      }
    });

    membersBody.appendChild(row);
  });
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderPagination() {
  if (!pagination) return;
  pagination.innerHTML = "";
}

function renderPending(list) {
  pendingBox.innerHTML = "";
  if (!list.length) {
    pendingBox.innerHTML = `<div class="empty-state">لا توجد طلبات معلقة</div>`;
    return;
  }

  list.forEach((item) => {
    const card = document.createElement("div");
    card.className = "stat-card";
    card.innerHTML = `
      <strong>${item.fullName}</strong>
      <span>${item.phone}</span>
      <span>${getPlanLabel(item.plan)}</span>
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button class="action-btn accept">قبول</button>
        <button class="action-btn reject">رفض</button>
      </div>
    `;

    const [acceptBtn, rejectBtn] = card.querySelectorAll("button");
    
    // عند الضغط على قبول
    acceptBtn.addEventListener("click", async () => {
      // 1. تحديث الأرقام وإخفاء الكارت فوراً (بدون انتظار السيرفر)
      updateTopStats("pending", "active");
      card.style.display = "none";
      createToast("تم قبول الطلب بنجاح", "success");

      // 2. إرسال الطلب للسيرفر في الخلفية
      await updateStatus(item.id, "active");
      
      // 3. تحديث جدول المشتركين عشان العميل الجديد يظهر فيه
      loadMembers();
    });

    // عند الضغط على رفض
    rejectBtn.addEventListener("click", async () => {
      updateTopStats("pending", "rejected");
      card.style.display = "none";
      createToast("تم رفض الطلب", "error");

      await updateStatus(item.id, "rejected");
    });

    pendingBox.appendChild(card);
  });

  applyRipple(".action-btn");
}

let membershipChart = null; // متغير لحفظ الرسم البياني

async function loadStats() {
  const stats = await fetchStats();
  
  // تحديث الأرقام في الكروت العلوية
  Object.entries(stats).forEach(([key, value]) => {
    if (key !== 'chartLabels' && key !== 'chartValues') {
      setStat(key, value);
    }
  });

  if (pendingAlert && alertPendingCount) {
    const pendingCount = Number(stats.pending || 0);
    alertPendingCount.textContent = pendingCount;
    pendingAlert.classList.toggle("hidden", pendingCount === 0);
  }

  // رسم الشارت بالبيانات الحقيقية
  const ctx = qs("#membershipChart");
  if (!ctx) return;
  
  if (membershipChart) membershipChart.destroy(); // حذف القديم لتجنب التداخل

  membershipChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: stats.chartLabels || ["-", "-", "-", "-", "-", "-"],
      datasets: [
        {
          label: "اشتراكات جديدة",
          data: stats.chartValues || [0, 0, 0, 0, 0, 0],
          borderColor: "#5f7cff",
          backgroundColor: "rgba(95, 124, 255, 0.15)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { 
          beginAtZero: true, // يبدأ من الصفر دائماً
          ticks: { precision: 0 }, // أرقام صحيحة فقط (لا يوجد نصف مشترك)
          grid: { color: "rgba(255,255,255,0.08)" } 
        },
        x: { grid: { color: "rgba(255,255,255,0.06)" } },
      },
    },
  });
}

async function loadMembers() {
  currentPage = 1;
  const response = await fetchMembers(1);
  const totalPages = Number(response.pages) || 1;
  let items = response.items || [];

  for (let page = 2; page <= totalPages; page += 1) {
    const pageResponse = await fetchMembers(page);
    items = items.concat(pageResponse.items || []);
  }

  cachedMembers = items;
  updatePlanOptions(cachedMembers);
  applySearch();
  renderPagination();
}

async function loadPending() {
  const response = await fetchPending();
  renderPending(response.items || []);
}

function applySearch() {
  const keyword = searchInput.value.trim().toLowerCase();
  let base = [...cachedMembers];

  if (statusFilter && statusFilter.value !== "all") {
    base = base.filter((item) => item.status === statusFilter.value);
  }

  if (planFilter && planFilter.value !== "all") {
    base = base.filter((item) => normalizePlan(item.plan) === planFilter.value);
  }
  const filtered = keyword
    ? base.filter((item) => {
        const name = String(item.fullName || "").toLowerCase();
        const phone = String(item.phone || "");
        return name.includes(keyword) || phone.includes(keyword);
      })
    : base;

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === "id") {
      const aId = parseIdValue(a.id);
      const bId = parseIdValue(b.id);
      if (typeof aId === "number" && typeof bId === "number") {
        return aId - bId;
      }
      return String(aId).localeCompare(String(bId));
    }
    const aDate = parseDateValue(a.endDate);
    const bDate = parseDateValue(b.endDate);
    if (sortDateOrder === "asc") {
      const aScore = aDate ?? Number.POSITIVE_INFINITY;
      const bScore = bDate ?? Number.POSITIVE_INFINITY;
      return aScore - bScore;
    }
    const aScore = aDate ?? Number.NEGATIVE_INFINITY;
    const bScore = bDate ?? Number.NEGATIVE_INFINITY;
    return bScore - aScore;
  });

  if (!keyword) {
    lastToastTerm = "";
    renderMembers(sorted, "", "لا توجد بيانات حاليا");
    return;
  }

  renderMembers(sorted, keyword, "لا توجد نتائج مطابقة");
  if (!sorted.length && lastToastTerm !== keyword) {
    createToast("لا توجد نتائج مطابقة", "info");
    lastToastTerm = keyword;
  }
  if (sorted.length) {
    lastToastTerm = "";
  }
}

function syncResetButton() {
  if (!resetButton) return;
  const hasValue = searchInput.value.trim().length > 0;
  resetButton.classList.toggle("hidden", !hasValue);
}


searchInput.addEventListener("input", () => {
  applySearch();
  syncResetButton();
});
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applySearch();
  }
});

if (searchButton) {
  searchButton.addEventListener("click", () => {
    applySearch();
    const membersSection = qs("#members-section");
    if (membersSection) {
      membersSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

if (resetButton) {
  resetButton.addEventListener("click", () => {
    searchInput.value = "";
    lastToastTerm = "";
    applySearch();
    syncResetButton();
  });
}

if (statusFilter) {
  statusFilter.addEventListener("change", applySearch);
}

if (planFilter) {
  planFilter.addEventListener("change", applySearch);
}

if (sortDateButton) {
  updateSortButtonLabel();
  sortDateButton.addEventListener("click", () => {
    sortMode = "date";
    sortDateOrder = sortDateOrder === "asc" ? "desc" : "asc";
    updateSortButtonLabel();
    applySearch();
  });
}

if (resetFiltersButton) {
  resetFiltersButton.addEventListener("click", async () => {
    if (statusFilter) statusFilter.value = "all";
    if (planFilter) planFilter.value = "all";
    sortMode = "id";
    sortDateOrder = "desc";
    updateSortButtonLabel();
    await loadMembers();
    applySearch();
  });
}

if (pendingFilterButton) {
  pendingFilterButton.addEventListener("click", () => {
    const pendingSection = qs("#pending-section");
    if (pendingSection) {
      pendingSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

function activateNav(targetId) {
  navButtons.forEach((btn) => btn.classList.remove("active"));
  const active = navButtons.find((btn) => btn.dataset.scroll === targetId);
  if (active) {
    active.classList.add("active");
  }
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.scroll;
    if (targetId === "stats-section") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      activateNav(targetId);
      return;
    }
    const target = qs(`#${targetId}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    activateNav(targetId);
  });
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        .slice(0, 1)
        .forEach((entry) => activateNav(entry.target.id));
    },
    {
      threshold: [0.35, 0.6],
      rootMargin: "-15% 0px -45% 0px",
    }
  );

  trackedSections.forEach((section) => observer.observe(section));
}

applyRipple(".action-btn");

loadStats();
loadMembers();
loadPending();

// دالة لتحديث أرقام الإحصائيات فوراً بدون انتظار تحميل الصفحة
function updateTopStats(oldStatus, newStatus) {
  const currentPending = parseInt(statsMap.pending.textContent) || 0;
  
  if (oldStatus === "pending" && newStatus === "active") {
    // تقليل الطلبات المعلقة وزيادة المشتركين الفعالين
    const currentActive = parseInt(statsMap.active.textContent) || 0;
    statsMap.pending.textContent = Math.max(0, currentPending - 1);
    statsMap.active.textContent = currentActive + 1;
  } 
  else if (oldStatus === "pending" && newStatus === "rejected") {
    // تقليل الطلبات المعلقة فقط (لأن الرفض لا يزيد النشطين)
    statsMap.pending.textContent = Math.max(0, currentPending - 1);
  }

  // تحديث شريط التنبيهات الخاص بالطلبات المعلقة (اللي بيظهر تحته)
  if (alertPendingCount) {
    alertPendingCount.textContent = statsMap.pending.textContent;
    // لو الطلبات المعلقة خلصت، نخفي شريط التنبيهات الأحمر
    if (statsMap.pending.textContent === "0") {
      pendingAlert.classList.add("hidden");
      // ونظهر رسالة "لا توجد طلبات معلقة" مكان الكروت
      if (pendingBox) {
        pendingBox.innerHTML = `<div class="empty-state">لا توجد طلبات معلقة</div>`;
      }
    }
  }
}