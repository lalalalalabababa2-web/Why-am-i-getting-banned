;
/* Afterlight v12.4 — Interface.
 * A touch layout that keeps every control clear of the others at any phone
 * size, a floating movement stick, and a HUD whose pieces never sit on top
 * of each other or under your thumbs. (Natural locomotion lives with the
 * skeleton solver in realism_v122.js.)
 */
(() => {
  "use strict";
  const a = window.__AF_OVERHAUL__?.state;
  const R = a?.realismV12;
  if (!R || R.v124) return;
  const S = R.settings, e = a.engine;
  const M = (R.v124 = { stats: { layouts: 0, floats: 0 }, zone: { top: 0, frac: 0.42 } });
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const touchUi = () => !!S.touchUi;

  /* ------------------------------------------------------------------ */
  /* Layout                                                              */
  /* ------------------------------------------------------------------ */
  // Right thumb: FIRE sits low in the corner with JUMP under it; AIM, RELOAD
  // and GEAR ring it at one thumb-reach, USE on a second ring, the stance
  // and throw buttons along the bottom edge. Left thumb: a floating stick
  // that owns the lower-left of the screen; RUN and the second FIRE sit
  // above it, out of the path a moving thumb takes.
  const VS0 = VS;
  const RIGHT = ["fire", "ads", "reload", "loadout", "use", "jump", "crouch", "grenade", "switch"];
  function place(t, i, compact) {
    const k = clamp(i / 393, 0.82, 1.4);
    const u = Math.round(clamp(50 * k, 44, 62)), F = Math.round(clamp(68 * k, 56, 84)), d = Math.round(clamp(i * 0.3, 92, 150));
    const g = Math.round(clamp(12 * k, 9, 16)), p = 16;
    const P = {};
    const jx = t - p - u / 2, jy = i - p - u / 2;
    P.jump = [jx, jy, u];
    const fx = t - p - F / 2 - 2, fy = jy - u / 2 - g - F / 2;
    P.fire = [fx, fy, F];
    const r1 = F / 2 + g + u / 2, r2 = r1 + u + g;
    const at = (deg, r) => [fx + Math.cos(deg * Math.PI / 180) * r, fy - Math.sin(deg * Math.PI / 180) * r];
    P.ads = [...at(180, r1), u];
    P.reload = [...at(128, r1), u];
    P.loadout = [...at(76, r1), u];
    P.use = [...at(154, r2), u];
    let bx = jx;
    for (const n of compact ? ["grenade"] : ["crouch", "grenade", "switch"]) { bx -= u + g; P[n] = [bx, jy, u]; }
    P.joystick = [p + d / 2 + 8, i - p - d / 2 - 2, d];
    let zoneTop = i * 0.3;
    if (!compact) {
      // vitals end ~ui-top + 109 px
      const vb = 22 + 109;
      if (i >= 380) {
        // tall enough: a row under the vitals
        const ly = Math.max(i * 0.46, vb + 10 + u / 2);
        P.fireLeft = [p + u / 2 + 6, ly, u];
        P.sprint = [p + u * 1.5 + g + 12, ly, u];
        zoneTop = ly + u / 2 + 14;
      } else {
        // short screens: a column beside the vitals, right of the stick
        const cx = 12 + 98 + 14 + u / 2;
        P.fireLeft = [cx, 22 + 67 + 21, u];
        P.sprint = [cx, 22 + 67 + 21 + u + g, u];
        zoneTop = 22 + 67 + 21 + u * 1.5 + g + 12;
      }
    }
    return { P, zoneTop };
  }
  VS = function (lay, t, i, compact, editing) {
    if (editing || typeof Bl > "u" || t < i || !touchUi()) return VS0(lay, t, i, compact, editing);
    const o = iz(lay, t, i);
    const { P, zoneTop } = place(t, i, compact);
    const mirror = lay.joystick.x > 50;
    let minX = t;
    for (const b in P) {
      const cur = lay[b], def = Bl[b], z = P[b];
      if (!cur || !def || !o[b]) continue;
      const untouched = cur.y === def.y && (cur.x === def.x || cur.x === 100 - def.x) && cur.size === def.size;
      if (untouched) o[b] = { x: ((mirror ? t - z[0] : z[0]) / t) * 100, y: (z[1] / i) * 100, size: z[2] };
      else o[b].size = b === "joystick" ? clamp(o[b].size, 64, 150) : clamp(o[b].size, 44, 64);
      if (untouched && RIGHT.includes(b)) minX = Math.min(minX, z[0] - z[2] / 2);
    }
    M.zone.top = zoneTop;
    M.zone.frac = 0.42;
    try { document.documentElement.style.setProperty("--rl-cluster-w", Math.round(t - minX) + "px"); } catch {}
    M.stats.layouts++;
    return o;
  };

  /* ------------------------------------------------------------------ */
  /* Floating stick                                                       */
  /* ------------------------------------------------------------------ */
  // A touch anywhere in the movement zone puts the stick under the thumb, so
  // there is nothing to miss and nothing next to it to hit by accident.
  const FJ = { id: null, joy: null, synth: false, run: false, rim: 0, setSprint: false };
  function inZone(x, y, tc) {
    const W = innerWidth, H = innerHeight;
    if (W < H) return false;
    const mir = tc.dataset.mirrored === "true";
    return (mir ? x > W * (1 - M.zone.frac) : x < W * M.zone.frac) && y > M.zone.top;
  }
  window.addEventListener("pointerdown", (ev) => {
    if (FJ.synth || !touchUi() || ev.pointerType === "mouse" || FJ.id !== null) return;
    const pad = ev.target;
    // a thumb that lands on the stick itself is tracked for the sprint lock too
    const onStick = pad?.closest?.(".touch-controls:not(.editing) .joystick");
    if (onStick) { FJ.id = ev.pointerId; FJ.joy = onStick; onStick.classList.remove("rl-home", "rl-idle"); return; }
    if (!pad?.classList?.contains("look-pad")) return;
    const tc = pad.closest(".touch-controls");
    if (!tc || tc.classList.contains("editing") || !inZone(ev.clientX, ev.clientY, tc)) return;
    const joy = tc.querySelector(".joystick");
    if (!joy) return;
    ev.stopImmediatePropagation();
    ev.preventDefault();
    joy.classList.remove("rl-home", "rl-idle");
    joy.style.translate = "0px 0px";
    const r = joy.getBoundingClientRect(), rad = r.width / 2;
    const nx = clamp(ev.clientX, rad + 6, innerWidth - rad - 6), ny = clamp(ev.clientY, rad + 6, innerHeight - rad - 6);
    joy.style.translate = `${nx - (r.left + rad)}px ${ny - (r.top + r.height / 2)}px`;
    FJ.id = ev.pointerId;
    FJ.joy = joy;
    FJ.synth = true;
    try {
      joy.dispatchEvent(new PointerEvent("pointerdown", {
        pointerId: ev.pointerId, pointerType: ev.pointerType, isPrimary: ev.isPrimary,
        clientX: ev.clientX, clientY: ev.clientY, screenX: ev.screenX, screenY: ev.screenY,
        width: ev.width, height: ev.height, pressure: ev.pressure || 0.5,
        button: 0, buttons: 1, bubbles: true, cancelable: true, composed: true,
      }));
    } finally { FJ.synth = false; }
    M.stats.floats++;
  }, true);
  // Sprint lock: push the thumb past the ring, straight ahead, and you run
  // until you pull back; inside the ring you walk at any speed.
  window.addEventListener("pointermove", (ev) => {
    if (ev.pointerId !== FJ.id || !FJ.joy) return;
    const r = FJ.joy.getBoundingClientRect(), G = r.width * 0.36;
    const dx = (ev.clientX - (r.left + r.width / 2)) / G, fwd = -(ev.clientY - (r.top + r.height / 2)) / G;
    FJ.rim = fwd;
    if (!FJ.run && fwd > 1.3 && Math.abs(dx) < 0.85) FJ.run = true;
    else if (FJ.run && fwd < 0.45) FJ.run = false;
  }, true);
  function release(ev) {
    if (ev.pointerId !== FJ.id) return;
    const joy = FJ.joy;
    FJ.id = FJ.joy = null;
    FJ.run = false; FJ.rim = 0;
    if (joy) { joy.classList.add("rl-home"); joy.style.translate = "0px 0px"; }
  }
  window.addEventListener("pointerup", release, true);
  window.addEventListener("pointercancel", release, true);

  /* ------------------------------------------------------------------ */
  /* HUD                                                                 */
  /* ------------------------------------------------------------------ */
  const CSS = `
/* v12.4: controls */
body.rl-touchui .app.app .touch-controls .touch-action {
  background: radial-gradient(circle at 50% 30%, #1b2527b0, #0a1012c4 70%);
  border: 1px solid #e3ebe670; box-shadow: 0 2px 10px #0007, inset 0 1px 0 #ffffff17;
  transition: transform .08s ease-out, background-color .12s, border-color .12s;
}
body.rl-touchui .app.app .touch-controls .touch-action:active { transform: translate(-50%, -50%) scale(.9); border-color: #f2ddb0; }
body.rl-touchui .app.app .touch-controls .action-fire {
  background: radial-gradient(circle at 50% 30%, #2a221cc8, #120d0bd4 72%);
  border: 2px solid #f0dcb0c4; box-shadow: 0 2px 14px #000a, 0 0 0 4px #f0dcb014;
}
body.rl-touchui .app.app .touch-controls .action-fire:active { background: radial-gradient(circle, #6a2b1ccc, #1a0f0bd8 72%); }
body.rl-touchui .app.app .touch-controls .action-fire .action-icon { width: 32px; height: 32px; }
body.rl-touchui .app.app .touch-controls .action-icon { width: 24px; height: 24px; filter: drop-shadow(0 1px 2px #000c); }
body.rl-touchui .app.app .touch-controls .touch-action.control-active { color: #ffe5a7; background: radial-gradient(circle, #6f5a2cbf, #2a2312cc 72%); border-color: #f0cd84; }
body.rl-touchui .app.app .joystick {
  background: radial-gradient(circle, #0b131580 0 58%, #0b131540 60%, #0b131518 100%);
  border: 1.5px solid #e2e9e170; box-shadow: 0 0 0 1px #0004, inset 0 0 18px #0005;
}
body.rl-touchui .app.app .joystick > span { width: 40%; height: 40%; background: radial-gradient(circle at 45% 35%, #f3f2e8d0, #b9c0b2a8 70%); border: 1px solid #fffde980; box-shadow: 0 2px 8px #0008; }
body.rl-touchui .app.app .joystick.rl-home { transition: translate .22s cubic-bezier(.2,.8,.2,1), opacity .4s; }
body.rl-touchui .app.app .joystick.rl-idle { opacity: .5; }
body.rl-touchui .app.app .joystick::before {
  content: ""; position: absolute; left: 50%; top: -20px; transform: translateX(-50%);
  border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 10px solid #ece7d655;
  transition: top .15s, border-bottom-color .15s; pointer-events: none;
}
body.rl-touchui .app.app .joystick.rl-near::before { top: -24px; border-bottom-color: #f3e7c4b0; }
body.rl-touchui .app.app .joystick.rl-sprint::before { top: -27px; border-bottom-color: #f3cf7a; filter: drop-shadow(0 0 4px #f3cf7a88); }

/* v12.4: HUD placement — ammo next to the fire hand, clear of both thumbs */
body.rl-touchui .app.app.touch .hud .ammo {
  left: auto; right: calc(var(--rl-cluster-w, 270px) + var(--ui-right) + 8px);
  bottom: var(--ui-bottom); width: auto; min-width: 84px; text-align: right;
}
body.rl-touchui .app.app.touch[data-controls-side=right] .hud .ammo { right: auto; left: calc(var(--rl-cluster-w, 270px) + var(--ui-left) + 8px); text-align: left; }
body.rl-touchui .app.app .hud .ammo small { white-space: nowrap; }

/* legible type: nothing under 8 px */
body.rl-touchui .app.app .hud .objective .eyebrow,
body.rl-touchui .app.app .hud .objective > span:last-of-type { font-size: calc(8.5px * var(--ui-font)); }
body.rl-touchui .app.app .hud .objective strong { font-size: calc(16.5px * var(--ui-font)); }
body.rl-touchui .app.app .hud .vitals { font-size: calc(8.5px * var(--ui-font)); }
body.rl-touchui .app.app .hud .vitals .stance { font-size: 8px; }
body.rl-touchui .app.app .hud .ammo small { font-size: calc(8.5px * var(--ui-font)); }
body.rl-touchui .app.app .field-notice { font-size: 9.5px; padding: 5px 8px; }
body.rl-touchui .app.app .z-interaction small { font-size: 8px; }
body.rl-touchui .app.app .z-interaction strong { font-size: 10px; }
body.rl-touchui .app.app .combat-summary .z-round > span,
body.rl-touchui .app.app .combat-summary .z-round small,
body.rl-touchui .app.app .combat-summary .z-economy > span,
body.rl-touchui .app.app .combat-summary .z-economy small { font-size: 8px; }
body.rl-touchui .app.app .z-perks span { font-size: 8px; padding: 3px 5px; }

/* the brief guide waits low in the middle, away from the ammo */
body.rl-touchui .app.app.touch .control-coach { left: 38%; max-width: min(250px, 26vw); bottom: calc(var(--ui-bottom) + 70px); }
body.rl-touchui .app.app.touch .control-coach small { font-size: 8px; }
@media (max-height: 379px) { body.rl-touchui .app.app.touch .control-coach { display: none; } }

/* equipment opens in the space left of the right-hand buttons and fits */
body.rl-touchui .app.app.touch .quick-loadout {
  top: calc(var(--ui-top) + 4px); bottom: auto;
  left: calc((100vw - var(--rl-cluster-w, 0px)) / 2); transform: translateX(-50%);
  width: min(460px, calc(100vw - var(--rl-cluster-w, 0px) - 2 * var(--ui-left) - 28px));
  max-height: calc(100dvh - var(--ui-top) - var(--ui-bottom) - 8px);
  overflow-y: auto; padding: 8px 10px;
}
body.rl-touchui .app.app.touch[data-controls-side=right] .quick-loadout { left: calc(var(--rl-cluster-w, 0px) + (100vw - var(--rl-cluster-w, 0px)) / 2); }
body.rl-touchui .app.app.touch .quick-loadout > div { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
body.rl-touchui .app.app.touch .quick-loadout > div button { min-height: 50px; padding: 6px 8px; }
body.rl-touchui .app.app.touch .quick-loadout button strong { font-size: 15px; margin: 2px 0; }
body.rl-touchui .app.app.touch .quick-loadout header { margin-bottom: 6px; }
`;
  function css() {
    if (document.getElementById("rl-css-124")) return;
    const st = document.createElement("style");
    st.id = "rl-css-124";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  a.on("frame", (game) => {
    try {
      css();
      const touch = !!e.isTouch?.() || game.settings?.touch === "on";
      document.body.classList.toggle("rl-touch", touch);
      document.body.classList.toggle("rl-touchui", touch && touchUi());
      if (!touch || !touchUi() || game.phase !== "playing") return;
      const inp = game.input;
      // the sprint lock replaces "full push = sprint" in both control styles
      inp.autoSprint = false;
      if (FJ.run && !inp.sprint) { inp.sprint = true; FJ.setSprint = true; }
      else if (!FJ.run && FJ.setSprint) { inp.sprint = false; FJ.setSprint = false; }
      const joy = FJ.joy || document.querySelector(".touch-controls .joystick");
      if (!joy) return;
      joy.classList.toggle("rl-sprint", FJ.run || !!inp.sprint);
      joy.classList.toggle("rl-near", !FJ.run && FJ.rim > 0.95);
      joy.classList.toggle("rl-idle", FJ.id === null && !inp.moveX && !inp.moveZ);
    } catch (err) { if (!M.err) console.error("[realism] ui", err); M.err = true; }
  });
  // the layout depends on the setting: re-render the controls when it changes
  R.on(() => { try { window.dispatchEvent(new Event("resize")); } catch {} });
})();
