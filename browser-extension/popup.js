/* Cinescope Ad Blocker - popup controller */

function send(type) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type }, resolve);
  });
}

function formatAgo(ts) {
  if (!ts) return "never";
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + " min ago";
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours + " h ago";
  return Math.round(hours / 24) + " d ago";
}

async function render() {
  const s = await send("getState");
  if (!s) return;
  document.getElementById("enabled").checked = !!s.enabled;
  document.getElementById("easylist").checked = !!s.easylist;

  const stats = document.getElementById("stats");

  // ruleCount already includes the built-in rules, so it is the total.
  if (s.lastError) {
    stats.innerHTML =
      '<span style="color:#fb7185">Blocking error: ' +
      escapeHtml(s.lastError) +
      "</span><br>Last sync: " + formatAgo(s.lastSync);
    return;
  }

  const total = s.ruleCount || 0;
  const builtIn = s.staticActive || 0;
  stats.innerHTML =
    "<b>" + total + "</b> active rules (" +
    builtIn + " built-in, " +
    Math.max(0, total - builtIn) + " EasyList)<br>Last sync: " +
    formatAgo(s.lastSync);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

document.getElementById("enabled").addEventListener("change", (e) => {
  send(e.target.checked ? "enable" : "disable").then(render);
});

document.getElementById("easylist").addEventListener("change", (e) => {
  send(e.target.checked ? "easylistOn" : "easylistOff").then(render);
});

document.getElementById("resync").addEventListener("click", () => {
  send("resync").then(render);
});

render();
