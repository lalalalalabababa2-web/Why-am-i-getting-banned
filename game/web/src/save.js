// localStorage persistence (wrapped: storage can be unavailable).

const KEY = 'neontide.save.v1';
const SKEY = 'neontide.settings.v1';

export function readSave() {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function readSettings() {
  try {
    const s = localStorage.getItem(SKEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}

export function writeSettings(data) {
  try {
    localStorage.setItem(SKEY, JSON.stringify(data));
  } catch (e) { /* ignore */ }
}
