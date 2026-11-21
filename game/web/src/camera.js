// Third-person orbit camera with auto-follow, collision pull-in, shake and speed FOV.

import * as THREE from 'three';
import { G } from './state.js';
import { clamp, lerp, damp, approachAngle, wrapAngle, rand } from './util.js';
import { WATER_LEVEL } from './world/citygen.js';

export class CameraRig {
  constructor(camera) {
    this.cam = camera;
    this.yaw = 0;
    this.pitch = 0.22;
    this.dist = 5.5;
    this.curDist = 5.5;
    this.target = new THREE.Vector3();
    this.smoothTarget = new THREE.Vector3();
    this.shakeAmt = 0;
    this.lastLook = -10;
    this.fov = 62;
    this.mode = 'title';
    this.titleT = 0;
    this._v = new THREE.Vector3();
    this.first = true;
  }

  shake(a) { this.shakeAmt = Math.min(1, this.shakeAmt + a); }
  distTo(x, z) { return Math.hypot(x - this.cam.position.x, z - this.cam.position.z); }

  /** Yaw so that "forward" on the stick means away from the camera. */
  forward() { return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }

  snapBehind(h) {
    this.yaw = h;
    this.first = true;
  }

  update(dt, input) {
    const look = input.consumeLook();
    const sens = G.settings.sensitivity;
    if (this.mode !== 'title' && (look.dx || look.dy)) {
      this.yaw -= look.dx * 0.0052 * sens;
      this.pitch = clamp(this.pitch + look.dy * 0.0038 * sens, -0.25, 1.25);
      this.lastLook = G.time;
    }

    const p = G.player;
    let tx, ty, tz, wantDist, wantFov = 62;
    if (this.mode === 'title') {
      this.titleT += dt;
      const a = this.titleT * 0.035;
      const c = G.titleFocus || { x: 300, z: 0 };
      tx = c.x + Math.sin(a) * 40; ty = 30; tz = c.z + Math.cos(a) * 40;
      this.yaw = a + Math.PI * 0.85;
      this.pitch = 0.18;
      wantDist = 160;
      wantFov = 55;
    } else if (p && p.human.vehicle) {
      const v = p.human.vehicle;
      tx = v.x; ty = v.y + 1.3 + v.T.hgt * 0.35; tz = v.z;
      wantDist = 4.2 + v.T.len * 0.95;
      const sp = v.speed;
      if (G.time - this.lastLook > 1.3 && sp > 2.5) {
        // follow the direction of travel (works for drifts and reversing)
        let dirH = v.h;
        const vF = v.vx * Math.sin(v.h) + v.vz * Math.cos(v.h);
        if (vF < -3) dirH = v.h; // keep looking forward while reversing
        else if (sp > 6) dirH = Math.atan2(v.vx, v.vz);
        const rate = 1.2 + Math.min(3.5, sp * 0.12);
        this.yaw = approachAngle(this.yaw, dirH, rate * dt * (1 + Math.abs(wrapAngle(dirH - this.yaw))));
        this.pitch = lerp(this.pitch, 0.2, damp(1.5, dt));
      }
      wantFov = 62 + clamp(sp * 0.32, 0, 18);
    } else if (p) {
      const h = p.human;
      tx = h.x; ty = h.y + 1.55; tz = h.z;
      if (h.state === 'dead' || h.state === 'ragdoll') { ty = h.y + 1.0; }
      wantDist = p.aiming ? 3.9 : 5.2;
      if (h.inWater) ty = h.y + 1.8;
      // gentle auto-follow while running forward with the stick
      const sp = h.speed;
      if (G.time - this.lastLook > 2.0 && sp > 3 && !p.aiming) {
        const fh = Math.atan2(h.vx, h.vz);
        const diff = Math.abs(wrapAngle(fh - this.yaw));
        if (diff < 2.2) this.yaw = approachAngle(this.yaw, fh, 0.6 * dt);
      }
      if (this.mode === 'dead') {
        this.yaw += dt * 0.25;
        this.pitch = lerp(this.pitch, 0.9, damp(1, dt));
        wantDist = 9;
      }
    } else {
      return;
    }

    this.target.set(tx, ty, tz);
    if (this.first) {
      this.smoothTarget.copy(this.target);
      this.first = false;
      this.curDist = wantDist;
    }
    this.smoothTarget.lerp(this.target, this.mode === 'title' ? 1 : damp(18, dt));

    // collision: pull in toward the target if a wall is in the way
    const cp = Math.cos(this.pitch), spch = Math.sin(this.pitch);
    const dx = -Math.sin(this.yaw) * cp, dz = -Math.cos(this.yaw) * cp, dy = spch;
    let d = wantDist;
    if (this.mode !== 'title') {
      const ex = this.smoothTarget.x + dx * (wantDist + 0.4), ez = this.smoothTarget.z + dz * (wantDist + 0.4);
      const ey = this.smoothTarget.y + dy * (wantDist + 0.4);
      const t = G.physics.raycast(this.smoothTarget.x, this.smoothTarget.z, ex, ez, this.smoothTarget.y, ey, true);
      if (t < 1) d = Math.max(0.9, (wantDist + 0.4) * t - 0.45);
    }
    if (d < this.curDist) this.curDist = d;
    else this.curDist = lerp(this.curDist, d, damp(2.5, dt));
    this.dist = this.curDist;

    let cx = this.smoothTarget.x + dx * this.dist;
    let cy = this.smoothTarget.y + dy * this.dist;
    let cz = this.smoothTarget.z + dz * this.dist;
    if (this.mode !== 'title') {
      const g = G.physics.groundHeight(cx, cz);
      cy = Math.max(cy, Math.max(g, WATER_LEVEL) + 0.4);
    }
    // shake
    if (this.shakeAmt > 0.001) {
      const s = this.shakeAmt * 0.35;
      cx += rand(-s, s); cy += rand(-s, s); cz += rand(-s, s);
      this.shakeAmt *= Math.exp(-5 * dt);
    }
    this.cam.position.set(cx, cy, cz);
    this._v.copy(this.smoothTarget);
    if (this.mode !== 'title') this._v.y += 0.15;
    this.cam.lookAt(this._v);
    this.fov = lerp(this.fov, wantFov, damp(3, dt));
    if (Math.abs(this.cam.fov - this.fov) > 0.05) {
      this.cam.fov = this.fov;
      this.cam.updateProjectionMatrix();
    }
  }

  /** World -> CSS pixel coordinates, or null when behind the camera. */
  project(x, y, z) {
    const v = this._v.set(x, y, z).project(this.cam);
    if (v.z > 1 || v.z < -1) return null;
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
  }
}
