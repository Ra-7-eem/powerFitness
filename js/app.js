import { applyRipple, createToast, qs, qsa, toggleLoading, daysBetween } from "./ui.js";
import { createSubscription, searchSubscriber } from "./api.js";

const sections = qsa(".form-section");
const toggleButtons = qsa(".toggle-btn");
const oldForm = qs("#old-form");
const newForm = qs("#new-form");
const resultBox = qs("#result-box");
const noticeBox = qs("#notice-box");
const subscribeButton = qs("#subscribe-btn");
const switchToNew = qs("#switch-to-new");
const loaderScope = qs(".glass-card");
const registerModal = qs("#register-modal");

function toggleModal(isOpen) {
  if (!registerModal) return;
  registerModal.classList.toggle("active", isOpen);
  registerModal.setAttribute("aria-hidden", String(!isOpen));
  document.body.style.overflow = isOpen ? "hidden" : "";
}

function closeModal() {
  toggleModal(false);
}

function activateSection(target) {
  sections.forEach((section) => section.classList.remove("active"));
  toggleButtons.forEach((btn) => btn.classList.remove("active"));
  qs(`#${target}`).classList.add("active");
  qs(`[data-target='${target}']`).classList.add("active");
}

toggleButtons.forEach((btn) => {
  btn.addEventListener("click", () => activateSection(btn.dataset.target));
});

if (switchToNew) {
  switchToNew.addEventListener("click", () => activateSection("new-subscriber"));
}

oldForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  toggleLoading(true, loaderScope);
  resultBox.innerHTML = "";
  noticeBox.textContent = "";
  noticeBox.classList.remove("active");

  const name = qs("#old-name").value.trim();
  const phone = qs("#old-phone").value.trim();
  const response = await searchSubscriber({ name, phone });
  toggleLoading(false, loaderScope);

  if (!response.found) {
    createToast("لم يتم العثور على اشتراك مطابق", "error");
    noticeBox.textContent = "لا توجد بيانات حالية، يمكنك التسجيل كمشترك جديد.";
    noticeBox.classList.add("active");
    return;
  }

  const member = response.member;
  if (member.status === "pending") {
    noticeBox.textContent = "طلبك قيد المراجعة";
    noticeBox.classList.add("active");
    return;
  }

  if (member.status === "rejected") {
    noticeBox.textContent = "عذراً، تم رفض طلبك السابق. يرجى التواصل مع الإدارة.";
    noticeBox.classList.add("active");
    return;
  }

  const remainingRaw = daysBetween(new Date(), member.endDate);
  const remaining = Math.max(0, remainingRaw);
  const total = Math.max(1, daysBetween(member.startDate, member.endDate));
  const percent = remaining === 0 ? 0 : Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
  const statusLabel = remaining === 0 ? "غير نشط" : "نشط";
  
  // تنظيف شكل التاريخ للعميل
  const formattedStartDate = member.startDate ? member.startDate.split("T")[0] : "-";

  resultBox.innerHTML = `
    <div class="card-result animate-slide">
      <div>تاريخ الاشتراك: ${formattedStartDate}</div>
      <div>الأيام المتبقية: <strong style="color: var(--primary-color)">${remaining}</strong> يوم</div>
      <div>حالة الاشتراك: <span class="badge ${remaining === 0 ? 'danger' : 'success'}">${statusLabel}</span></div>
      <div class="progress" style="margin: 15px 0;"><span style="width:${percent}%"></span></div>
      <button type="button" id="renew-btn" class="secondary-btn" style="width: 100%;">تجديد الاشتراك</button>
    </div>
  `;

  // برمجة زر التجديد مع التعبئة التلقائية للبيانات
  qs("#renew-btn").addEventListener("click", () => {
    const newNameInput = qs("#new-name");
    const newPhoneInput = qs("#new-phone");
    
    if (newNameInput) newNameInput.value = member.fullName || "";
    if (newPhoneInput) newPhoneInput.value = member.phone || "";
    
    activateSection("new-subscriber");
    createToast("تم سحب بياناتك، أكمل اختيار الباقة", "info");
  });
});

newForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  toggleLoading(true, loaderScope);

  const payload = {
    startDate: qs("#start-date").value,
    fullName: qs("#new-name").value.trim(),
    phone: qs("#new-phone").value.trim(),
    plan: qs("#plan-type").value,
    notes: qs("#notes").value.trim(),
  };

  const response = await createSubscription(payload);
  toggleLoading(false, loaderScope);
  if (response && response.success !== false) {
    createToast("تم إرسال طلب الاشتراك بنجاح", "success");
    newForm.reset();
  } else {
    createToast("حدث خطأ أثناء الإرسال", "error");
  }
});

applyRipple(".primary-btn, .secondary-btn, .ghost-btn");

subscribeButton.addEventListener("click", () => {
  toggleModal(true);
  activateSection("old-subscriber");
});

if (registerModal) {
  registerModal.addEventListener("click", (event) => {
    const target = event.target;
    if (target && target.dataset && target.dataset.close === "modal") {
      closeModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});
