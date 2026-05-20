const API_BASE = "https://script.google.com/macros/s/AKfycbwJkpSxT2vvVwQ3U_zfYCnMALEUz2psrOpxtE07cIAX9SO56OIHRtrBcT91wl1m350a_g/exec";

const demoMembers = [
  {
    id: "G-102",
    fullName: "كريم عبدالفتاح",
    phone: "01012345678",
    plan: "monthly",
    status: "inactive",
    startDate: "2026-03-01",
    endDate: "2026-04-01",
    createdAt: "2026-05-01",
  },
  {
    id: "G-103",
    fullName: "مريم حسن",
    phone: "01155554545",
    plan: "quarterly",
    status: "pending",
    startDate: "2026-05-20",
    endDate: "2026-08-20",
    createdAt: "2026-05-20",
  },
];

const demoStats = {
  total: 328,
  active: 246,
  pending: 12,
  monthly: 34,
  expiring: 18,
  expired: 9,
};

function isDemo() {
  if (!navigator.onLine) {
    return true;
  }
  
  return API_BASE.includes("YOUR_SCRIPT_URL");
}

async function request(path, options = {}) {
  if (isDemo()) {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ demo: true }), 500);
    });
  }
  try {
    const headers = options.headers || {};
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE}${path}`, {
      mode: "cors",
      redirect: "follow",
      ...options,
      headers,
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      return { success: false, message: "Invalid JSON response", raw: text };
    }

    if (!response.ok) {
      return { success: false, status: response.status, message: data.message || "Request failed" };
    }

    return data;
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function createSubscription(payload) {
  if (isDemo()) {
    return { success: true, id: "DEMO-1" };
  }
  
  return request("", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ action: "create", payload }),
  });
}

export async function searchSubscriber(query) {
  if (isDemo()) {
    const match = demoMembers.find((member) => member.phone === query.phone || member.fullName.includes(query.name));
    return { found: Boolean(match), member: match };
  }
  const params = new URLSearchParams({ action: "search", ...query });
  return request(`?${params.toString()}`);
}

export async function fetchStats() {
  if (isDemo()) {
    return demoStats;
  }
  return request("?action=stats");
}
export async function fetchMembers(page = 1) {
  if (isDemo()) {
    return { items: demoMembers, page, pages: 1 };
  }
  return request(`?action=list&page=${page}`);
}

export async function fetchPending() {
  if (isDemo()) {
    return { items: demoMembers.filter((item) => item.status === "pending") };
  }
  return request("?action=pending");
}

export async function updateStatus(id, status) {
  if (isDemo()) {
    return { success: true };
  }
  
  return request("", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ action: "updateStatus", payload: { id, status } }),
  });
}