/* =====================================================================
 * Chitralipi Ad Blocker - MV3 service worker
 *
 * Responsibilities
 *   1. Static declarativeNetRequest rules live in rules.json (no remote code).
 *   2. Periodically sync EasyList / EasyPrivacy - the same default filter
 *      lists uBlock Origin ships with - into dynamic DNR rules.
 *   3. Keep a kill switch + EasyList toggle in chrome.storage.
 * ===================================================================== */

import {
  STATIC_RULES,
  RULE_ID_START,
  EASYLIST_URLS,
  MAX_DYNAMIC_RULES,
  REFRESH_ALARM,
} from "./rules.js";

const DEFAULTS = { enabled: true, easylist: true, lastSync: 0, ruleCount: 0, staticActive: 0, lastError: "" };

async function getState() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...stored };
}

async function clearDynamicRules() {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  if (rules.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map((r) => r.id),
    });
  }
}

/**
 * Convert one ABP filter line into a DNR rule.
 * Returns null for comments, cosmetic (##) and scriptlet (#$#) lines, and
 * for patterns we cannot safely translate.
 */
function lineToRule(line, id) {
  const raw = line.trim();
  if (!raw || raw.charAt(0) === "!" || raw.charAt(0) === "[" || raw.charAt(0) === " ") return null;

  // Cosmetic (##) and scriptlet (#$#) rules are not network rules.
  if (raw.indexOf("##") !== -1 || raw.indexOf("#$#") !== -1 || raw.indexOf("#@#") !== -1) return null;

  const isException = raw.indexOf("@@") === 0;
  let pattern = isException ? raw.slice(2) : raw;

  // We only translate the "||host^" host-anchored form.
  if (pattern.indexOf("||") !== 0) return null;

  let optPart = "";
  const dollar = pattern.indexOf("$");
  if (dollar !== -1) {
    optPart = pattern.slice(dollar + 1);
    pattern = pattern.slice(0, dollar);
  }

  const domain = pattern.slice(2).replace(/\^[\s\S]*$/, "").toLowerCase();
  if (!domain || domain.indexOf("*") !== -1 || domain.indexOf("/") !== -1) return null;
  if (domain.indexOf("|") !== -1) return null;

  const TYPES = [
    "main_frame", "sub_frame", "stylesheet", "script", "image", "font",
    "object", "xmlhttprequest", "ping", "media", "websocket", "other",
  ];
  const resourceTypes = [];
  for (const opt of optPart.split(",")) {
    const t = opt.trim();
    if (!t) continue;
    // Negated options ($~script) are not translated - skip the whole line
    // rather than over-block.
    if (t.charAt(0) === "~") return null;
    if (t === "document" || t === "doc") resourceTypes.push("main_frame");
    else if (TYPES.indexOf(t) !== -1) resourceTypes.push(t);
  }
  const types = resourceTypes.length
    ? Array.from(new Set(resourceTypes))
    : ["script", "image", "xmlhttprequest", "sub_frame", "media", "stylesheet", "other"];

  const condition = { requestDomains: [domain], resourceTypes: types };

  // "||cdn.com^$domain=site.com" -> initiatorDomains
  const dm = optPart.match(/domain=([^,]+)/);
  if (dm) {
    const initiators = dm[1].split("|").filter(Boolean);
    if (!initiators.length) return null;
    condition.initiatorDomains = initiators;
  }

  return {
    id,
    priority: 1,
    action: { type: isException ? "allow" : "block" },
    condition,
  };
}

/* --------------------------------------------------------- easylist sync */

async function syncEasyList() {
  const rules = [];
  let id = RULE_ID_START;
  for (const url of EASYLIST_URLS) {
    let text;
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) continue;
      text = await res.text();
    } catch (e) {
      continue;
    }
    for (const line of text.split("\n")) {
      if (rules.length >= MAX_DYNAMIC_RULES) break;
      const rule = lineToRule(line, id);
      if (rule) {
        rules.push(rule);
        id++;
      }
    }
    if (rules.length >= MAX_DYNAMIC_RULES) break;
  }
  return rules;
}

/* --------------------------------------------------------------- rebuild */

async function rebuildAll() {
  const state = await getState();
  await clearDynamicRules();

  if (!state.enabled) {
    await chrome.storage.sync.set({ ruleCount: 0, staticActive: 0, lastError: "" });
    return;
  }

  // Built-in rules are dynamic too, so the kill switch really turns
  // everything off (a manifest rules.json would stay active regardless).
  const staticCount = STATIC_RULES.length;
  let dynamic = STATIC_RULES.slice();

  if (state.easylist) {
    dynamic = dynamic.concat(await syncEasyList());
  }

  // Chrome enforces a hard cap on dynamic rules per extension. Bail out
  // loudly instead of silently claiming we installed a rule set we did not.
  if (dynamic.length > MAX_DYNAMIC_RULES) {
    const msg = `Too many rules (${dynamic.length} > ${MAX_DYNAMIC_RULES}). Blocking disabled.`;
    console.warn("[Chitralipi Ad Blocker]", msg);
    await chrome.storage.sync.set({ ruleCount: 0, staticActive: 0, lastError: msg });
    return;
  }

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ addRules: dynamic });
  } catch (e) {
    const msg = (e && e.message) || String(e);
    console.warn("[Chitralipi Ad Blocker] DNR update failed", e);
    await chrome.storage.sync.set({ ruleCount: 0, staticActive: 0, lastError: msg });
    return;
  }

  await chrome.storage.sync.set({
    staticActive: staticCount,
    ruleCount: dynamic.length,
    lastError: "",
    lastSync: state.easylist ? Date.now() : state.lastSync,
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== REFRESH_ALARM) return;
  const state = await getState();
  if (state.enabled && state.easylist) await rebuildAll();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const type = typeof msg === "string" ? msg : msg && msg.type;
    const state = await getState();

    switch (type) {
      case "enable":
      case "disable":
        await chrome.storage.sync.set({ enabled: type === "enable" });
        await rebuildAll();
        sendResponse(await getState());
        return;
      case "easylistOn":
      case "easylistOff":
        await chrome.storage.sync.set({ easylist: type === "easylistOn" });
        await rebuildAll();
        sendResponse(await getState());
        return;
      case "resync":
        await rebuildAll();
        sendResponse(await getState());
        return;
      default:
        sendResponse({ ...state, staticRuleCount: STATIC_RULES.length });
    }
  })();
  return true; // keep the message channel open for the async reply
});

chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: 360 });

chrome.runtime.onInstalled.addListener(async (d) => {
  await rebuildAll();
  console.info("[Chitralipi Ad Blocker] installed:", d.reason);
});

chrome.runtime.onStartup.addListener(async () => {
  await rebuildAll();
});
