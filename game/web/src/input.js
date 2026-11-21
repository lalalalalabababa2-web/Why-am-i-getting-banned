// Touch controls (floating stick, look drag, buttons) with a keyboard/mouse fallback.

import { clamp } from './util.js';

export class Input {
  constructor() {
    this.stick = { x: 0, y: 0, active: false };
    this.lookDX = 0;
    this.lookDY = 0;
    this.down = Object.create(null);
    this.pressedSet = Object.create(null);
    this.keys = Object.create(null);
    this.stickId = null;
    this.lookId = null;
    this.lookLast = null;
    this.stickOrigin = null;
    this.stickR = 58;
    this.enabled = true;
    this.lastTouch = 0;
  }

  bind() {
    const stickZone = document.getElementById('stickzone');
    const stickEl = document.getElementById('stick');
    const knob = document.getElementById('knob');
    const look = document.getElementById('lookzone');
    this.stickEl = stickEl;
    this.knob = knob;

    stickZone.addEventListener('pointerdown', (e) => {
      if (this.stickId !== null) return;
      this.stickId = e.pointerId;
      stickZone.setPointerCapture(e.pointerId);
      const r = stickZone.getBoundingClientRect();
      // floating stick: centre where the thumb lands (kept inside the zone)
      const x = clamp(e.clientX, r.left + 70, r.right - 20);
      const y = clamp(e.clientY, r.top + 40, r.bottom - 70);
      this.stickOrigin = { x, y };
      stickEl.style.left = x - r.left + 'px';
      stickEl.style.top = y - r.top + 'px';
      stickEl.classList.add('active');
      this.updateStick(e.clientX, e.clientY);
      e.preventDefault();
    });
    const endStick = (e) => {
      if (e.pointerId !== this.stickId) return;
      this.stickId = null;
      this.stick.x = this.stick.y = 0;
      this.stick.active = false;
      knob.style.transform = '';
      stickEl.classList.remove('active');
    };
    stickZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stickId) return;
      this.updateStick(e.clientX, e.clientY);
    });
    stickZone.addEventListener('pointerup', endStick);
    stickZone.addEventListener('pointercancel', endStick);

    look.addEventListener('pointerdown', (e) => {
      if (this.lookId !== null) return;
      this.lookId = e.pointerId;
      look.setPointerCapture(e.pointerId);
      this.lookLast = { x: e.clientX, y: e.clientY };
      this.lookStart = { x: e.clientX, y: e.clientY, t: performance.now() };
      e.preventDefault();
    });
    look.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return;
      this.lookDX += e.clientX - this.lookLast.x;
      this.lookDY += e.clientY - this.lookLast.y;
      this.lookLast = { x: e.clientX, y: e.clientY };
    });
    const endLook = (e) => {
      if (e.pointerId !== this.lookId) return;
      this.lookId = null;
    };
    look.addEventListener('pointerup', endLook);
    look.addEventListener('pointercancel', endLook);

    for (const el of document.querySelectorAll('[data-btn]')) {
      const name = el.dataset.btn;
      const press = (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        this.down[name] = (this.down[name] || 0) + 1;
        this.pressedSet[name] = true;
        el.classList.add('down');
        el._pid = el._pid || new Set();
        el._pid.add(e.pointerId);
        if (this.onButton) this.onButton(name);
      };
      const release = (e) => {
        if (!el._pid || !el._pid.has(e.pointerId)) return;
        el._pid.delete(e.pointerId);
        this.down[name] = Math.max(0, (this.down[name] || 1) - 1);
        if (!el._pid.size) el.classList.remove('down');
      };
      el.addEventListener('pointerdown', press);
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('lostpointercapture', release);
    }

    // keyboard fallback for desktop testing
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      const map = KEYMAP[e.code];
      if (map) {
        this.down[map] = (this.down[map] || 0) + 1;
        this.pressedSet[map] = true;
        if (this.onButton) this.onButton(map);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      const map = KEYMAP[e.code];
      if (map) this.down[map] = 0;
    });
    window.addEventListener('blur', () => {
      this.keys = Object.create(null);
      this.down = Object.create(null);
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  updateStick(cx, cy) {
    const o = this.stickOrigin;
    let dx = cx - o.x, dy = cy - o.y;
    const d = Math.hypot(dx, dy);
    const R = this.stickR;
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    let x = dx / R, y = dy / R;
    // small dead zone
    const m = Math.hypot(x, y);
    if (m < 0.12) { x = 0; y = 0; }
    this.stick.x = x;
    this.stick.y = y;
    this.stick.active = true;
  }

  /** Movement vector: stick, or WASD/arrows. y < 0 = forward/up. */
  move() {
    let x = this.stick.x, y = this.stick.y;
    const k = this.keys;
    if (k.KeyA || k.ArrowLeft) x -= 1;
    if (k.KeyD || k.ArrowRight) x += 1;
    if (k.KeyW || k.ArrowUp) y -= 1;
    if (k.KeyS || k.ArrowDown) y += 1;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y, mag: Math.min(1, m) };
  }

  isDown(name) { return (this.down[name] || 0) > 0; }

  pressed(name) {
    if (this.pressedSet[name]) {
      this.pressedSet[name] = false;
      return true;
    }
    return false;
  }

  consumeLook() {
    const r = { dx: this.lookDX, dy: this.lookDY };
    this.lookDX = 0;
    this.lookDY = 0;
    return r;
  }

  clearPresses() {
    for (const k in this.pressedSet) this.pressedSet[k] = false;
  }

  resetAll() {
    this.down = Object.create(null);
    this.pressedSet = Object.create(null);
    this.stick.x = this.stick.y = 0;
    this.stickId = null;
    this.lookId = null;
    for (const el of document.querySelectorAll('[data-btn].down')) el.classList.remove('down');
    if (this.knob) this.knob.style.transform = '';
  }
}

const KEYMAP = {
  Space: 'jump',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
  KeyF: 'enter',
  Enter: 'enter',
  ControlLeft: 'fire',
  KeyJ: 'fire',
  KeyQ: 'weapon',
  KeyM: 'map',
  Escape: 'pause',
  KeyP: 'pause',
  KeyH: 'horn',
  KeyR: 'radio',
  KeyK: 'handbrake',
};
