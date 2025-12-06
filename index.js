const API = "https://csc4710-homecleaning-backend-production.up.railway.app";


let currentRole = null;
let currentClientId = null;

// navigation history
let panelHistory = [];
let currentPanel = null;

// DOM references
const output = document.getElementById("output");
const sidebar = document.getElementById("sidebar");
const sidebarMenu = document.getElementById("sidebarMenu");
const loggedInUser = document.getElementById("loggedInUser");
const backBtn = document.getElementById("backBtn");
const logoutBtn = document.getElementById("logoutBtn");

// all panels (login/register + all others)
const panels = document.querySelectorAll(".panel");

/* ===================== HELPERS ===================== */

// hide all panels (but not startScreen)
function hideAllPanels() {
  panels.forEach(p => (p.style.display = "none"));
}

// show a panel and (optionally) push previous into history
function showPanel(id, { pushHistory = true } = {}) {
  if (pushHistory && currentPanel && currentPanel !== id) {
    panelHistory.push(currentPanel);
  }

  currentPanel = id;

  hideAllPanels();
  const el = document.getElementById(id);
  if (el) el.style.display = "block";

  // update sidebar highlight
  const allBtns = sidebarMenu.querySelectorAll("button");
  allBtns.forEach(btn => btn.classList.remove("active"));

  const activeBtn = sidebarMenu.querySelector(`[data-target="${id}"]`);
  if (activeBtn) activeBtn.classList.add("active");
}

// dump JSON to output box
function show(data) {
  output.textContent = JSON.stringify(data, null, 2);
}

/* ===================== START SCREEN / AUTH ===================== */

window.showLogin = function () {
  panelHistory = [];
  currentPanel = null;

  hideAllPanels();
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("loginPanel").style.display = "block";
};

window.showRegister = function () {
  panelHistory = [];
  currentPanel = null;

  hideAllPanels();
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("registerPanel").style.display = "block";
};

/* ===================== SIDEBAR BUILDER ===================== */

function buildSidebar(role) {
  sidebar.style.display = "flex";
  sidebarMenu.innerHTML = "";

  let items = [];

  if (role === "CLIENT") {
    items = [
      ["Create Service Request", "createRequest"],
      ["Accept Quote", "acceptQuote"],
      ["Pay Bill", "payBill"],
      ["Dispute Bill", "disputeBill"],
    ];
  }

  if (role === "CONTRACTOR") {
    items = [
      ["Create Quote", "createQuote"],
      ["Complete Order", "completeOrder"],
      ["Create Bill", "createBill"],
      ["Dashboard", "dashboard"],
    ];
  }

  items.forEach(([label, target]) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.dataset.target = target;
    btn.onclick = () => showPanel(target); // normal navigation (pushHistory = true)
    sidebarMenu.appendChild(btn);
  });
}

/* ===================== LOGIN ===================== */

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const body = Object.fromEntries(new FormData(e.target).entries());

  const res = await fetch(API + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  show(data);

  if (!data.success) {
    alert("Invalid username or password");
    return;
  }

  currentRole = data.role;
  currentClientId = data.client_id;

  // reset history on fresh login
  panelHistory = [];
  currentPanel = null;

  hideAllPanels();
  document.getElementById("startScreen").style.display = "none";
  loggedInUser.textContent = `Logged in as: ${body.username} (${currentRole})`;

  buildSidebar(currentRole);

  if (currentRole === "CLIENT") {
    showPanel("createRequest", { pushHistory: false });
  } else if (currentRole === "CONTRACTOR") {
    showPanel("createQuote", { pushHistory: false });
  }
});

/* ===================== LOGOUT ===================== */

logoutBtn.onclick = () => {
  currentRole = null;
  currentClientId = null;
  panelHistory = [];
  currentPanel = null;

  sidebar.style.display = "none";
  loggedInUser.textContent = "";

  hideAllPanels();
  document.getElementById("startScreen").style.display = "block";
};

/* ===================== GO BACK BUTTON ===================== */

backBtn.onclick = () => {
  // if NOT logged in yet (on login/register), back goes to start screen
  if (!currentRole) {
    hideAllPanels();
    document.getElementById("startScreen").style.display = "block";
    panelHistory = [];
    currentPanel = null;
    return;
  }

  // logged in: use history stack
  if (panelHistory.length === 0) {
    console.log("No previous panel in history");
    return;
  }

  const previous = panelHistory.pop();
  showPanel(previous, { pushHistory: false });
};

/* ===================== REGISTER NEW CLIENT ===================== */

document.getElementById("clientForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const body = Object.fromEntries(new FormData(e.target).entries());

  const res = await fetch(API + "/clients/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  show(data);

  if (data.success) {
    alert("Account created! You may now login.");
    showLogin();
  }
});

/* ===================== UNIVERSAL FORM HANDLER ===================== */

function bindForm(formId, route) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    let body = Object.fromEntries(new FormData(form).entries());

    if (currentRole === "CLIENT" && !body.client_id) {
      body.client_id = currentClientId;
    }

    for (let key in body) {
      if (!isNaN(body[key]) && body[key] !== "") {
        body[key] = Number(body[key]);
      }
    }

    const res = await fetch(API + route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    show(await res.json());
  });
}

bindForm("requestForm", "/requests/new");
bindForm("quoteForm", "/quotes/create");
bindForm("acceptQuoteForm", "/quotes/accept");
bindForm("completeOrderForm", "/orders/complete");
bindForm("billForm", "/bills/create");
bindForm("payForm", "/bills/pay");
bindForm("disputeForm", "/bills/dispute");

/* ===================== DASHBOARD QUERIES ===================== */

document.getElementById("btnFrequent").onclick = async () =>
  show(await (await fetch(API + "/dashboard/frequent-clients")).json());

document.getElementById("btnUncommitted").onclick = async () =>
  show(await (await fetch(API + "/dashboard/uncommitted-clients")).json());

document.getElementById("btnProspective").onclick = async () =>
  show(await (await fetch(API + "/dashboard/prospective-clients")).json());

document.getElementById("btnLargestJob").onclick = async () =>
  show(await (await fetch(API + "/dashboard/largest-job")).json());

document.getElementById("btnOverdue").onclick = async () =>
  show(await (await fetch(API + "/dashboard/overdue-bills")).json());

document.getElementById("btnBad").onclick = async () =>
  show(await (await fetch(API + "/dashboard/bad-clients")).json());

document.getElementById("btnGood").onclick = async () =>
  show(await (await fetch(API + "/dashboard/good-clients")).json());
