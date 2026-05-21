export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

export function createToast(message, type = "info") {
  const container = qs(".toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

export function toggleLoading(isActive, scope = document) {
  const loader = qs(".loader", scope);
  if (!loader) return;
  loader.classList.toggle("active", isActive);
}

export function setRipple(btn) {
  btn.classList.add("ripple");
  btn.addEventListener("click", (event) => {
    const circle = document.createElement("span");
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - btn.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${event.clientY - btn.getBoundingClientRect().top - radius}px`;
    btn.appendChild(circle);
    setTimeout(() => circle.remove(), 700);
  });
}

export function applyRipple(selector) {
  qsa(selector).forEach(setRipple);
}

export function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString("ar-EG");
}

export function daysBetween(start, end) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.ceil((new Date(end) - new Date(start)) / oneDay);
}
