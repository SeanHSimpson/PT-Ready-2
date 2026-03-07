const STORAGE_KEYS = Object.freeze({
  logs: 'af_pt_logs',
  history: 'af_pt_history',
  activePlan: 'af_pt_active_plan',
  planChecked: 'af_pt_plan_checked',
  version: 'ptr_version',
  installDismissed: 'ptr_install_dismissed',
  aboutSeen: 'ptr_about_seen',
  firstVisit: 'ptr_first_visit',
});
function readJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch (error) { console.warn(`Failed to parse localStorage key: ${key}`, error); return fallback; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (error) { console.warn(`Failed to write localStorage key: ${key}`, error); return false; }
}
function removeStorageKey(key) {
  try { localStorage.removeItem(key); return true; }
  catch (error) { console.warn(`Failed to remove localStorage key: ${key}`, error); return false; }
}
function readText(key, fallback = '') {
  try { const raw = localStorage.getItem(key); return raw ?? fallback; }
  catch (error) { console.warn(`Failed to read localStorage key: ${key}`, error); return fallback; }
}
function writeText(key, value) {
  try { localStorage.setItem(key, String(value)); return true; }
  catch (error) { console.warn(`Failed to write localStorage key: ${key}`, error); return false; }
}
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
window.appStore = {
  keys: STORAGE_KEYS, readJSON, writeJSON, removeStorageKey, readText, writeText, escapeHtml,
  init() {
    return {
      logs: readJSON(STORAGE_KEYS.logs, []),
      scoreHistory: readJSON(STORAGE_KEYS.history, []),
      currentPlanData: readJSON(STORAGE_KEYS.activePlan, null),
      currentChecked: readJSON(STORAGE_KEYS.planChecked, {}),
    };
  },
};
