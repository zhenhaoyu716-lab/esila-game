(function (root) {
  'use strict';
  const RADII = [16, 22, 29, 36, 44, 53, 63, 75, 88, 102, 117];
  const POINTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 388];
  class FruitWorld {
    constructor(onMerge = () => {}) {
      this.width = 430; this.height = 710; this.floor = this.height - 16; this.wall = 12;
      this.onMerge = onMerge; this.reset();
    }
    reset() { this.bodies = []; this.time = 0; this.dangerTime = 0; this.sequence = 0; }
    add(level, x, y, options = {}) {
      const r = RADII[level];
      const body = { id: ++this.sequence, level, r, x: Math.max(this.wall + r, Math.min(this.width - this.wall - r, x)), y,
        vx: 0, vy: 0, angle: 0, spin: 0, age: 0, mergeWait: 0.18,
        impactAge: 1, impactStrength: 0, impactAngle: 0, merged: false, ...options };
      this.bodies.push(body); return body;
    }
    impact(body, speed, angle) {
      if (speed < 80) return;
      const strength = Math.min(0.18, speed / 2400);
      if (strength < body.impactStrength * Math.exp(-body.impactAge * 10)) return;
      body.impactAge = 0; body.impactStrength = strength; body.impactAngle = angle;
    }
    step(dt) {
      this.time += dt;
      for (const b of this.bodies) {
        b.age += dt; b.impactAge += dt; b.mergeWait = Math.max(0, b.mergeWait - dt);
        b.vy += 1250 * dt; b.vx *= Math.exp(-0.7 * dt);
        b.spin *= Math.exp(-1.5 * dt);
        b.x += b.vx * dt; b.y += b.vy * dt; b.angle += b.spin * dt;
      }
      for (let pass = 0; pass < 6; pass++) {
        for (const b of this.bodies) {
          if (b.x < this.wall + b.r) {
            b.x = this.wall + b.r;
            if (b.vx < 0) { this.impact(b, -b.vx, 0); b.vx *= Math.abs(b.vx) > 80 ? -0.42 : 0; }
          }
          if (b.x > this.width - this.wall - b.r) {
            b.x = this.width - this.wall - b.r;
            if (b.vx > 0) { this.impact(b, b.vx, 0); b.vx *= b.vx > 80 ? -0.42 : 0; }
          }
          if (b.y > this.floor - b.r) {
            b.y = this.floor - b.r;
            if (b.vy > 0) { this.impact(b, b.vy, Math.PI / 2); b.vy = b.vy > 80 ? -b.vy * 0.4 : 0; }
            b.vx *= 0.96; b.spin *= 0.93;
          }
        }
        let merged = false;
        for (let i = 0; i < this.bodies.length; i++) {
          for (let j = i + 1; j < this.bodies.length; j++) {
            const a = this.bodies[i], b = this.bodies[j];
            let dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
            const contact = a.r + b.r;
            if (dist > contact) continue;
            if (a.level === b.level && a.level < RADII.length - 1 && a.mergeWait === 0 && b.mergeWait === 0) {
              const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
              this.bodies.splice(j, 1); this.bodies.splice(i, 1);
              const fruit = this.add(a.level + 1, x, y, { vx: (a.vx + b.vx) * 0.35, vy: Math.min(-100, (a.vy + b.vy) * 0.2), angle: (a.angle + b.angle) / 2, merged: true });
              this.onMerge({ fruit, points: POINTS[fruit.level] });
              merged = true; break;
            }
            if (dist < 0.001) { dx = 0.001; dy = 0; dist = 0.001; }
            const nx = dx / dist, ny = dy / dist;
            const invA = 1 / (a.r * a.r), invB = 1 / (b.r * b.r), sum = invA + invB;
            const correction = Math.max(0, contact - dist - 0.025) * 0.85 / sum;
            a.x -= nx * correction * invA; a.y -= ny * correction * invA;
            b.x += nx * correction * invB; b.y += ny * correction * invB;
            const speed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (speed < 0) {
              // Strong impacts bounce; gentle resting contacts settle instead of vibrating forever.
              const restitution = speed < -100 ? 0.32 : 0;
              const impulse = -(1 + restitution) * speed / sum;
              this.impact(a, -speed * invA / sum, Math.atan2(ny, nx));
              this.impact(b, -speed * invB / sum, Math.atan2(ny, nx));
              a.vx -= impulse * nx * invA; a.vy -= impulse * ny * invA;
              b.vx += impulse * nx * invB; b.vy += impulse * ny * invB;
              const tangent = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx;
              const friction = Math.max(-impulse * 0.22, Math.min(impulse * 0.22, -tangent / sum));
              a.vx -= friction * -ny * invA; a.vy -= friction * nx * invA;
              b.vx += friction * -ny * invB; b.vy += friction * nx * invB;
              a.spin = Math.max(-2, Math.min(2, a.vx / a.r * 0.3));
              b.spin = Math.max(-2, Math.min(2, b.vx / b.r * 0.3));
            }
          }
          if (merged) break;
        }
      }
      const over = this.bodies.some(b => b.age > 2 && b.y - b.r < 100);
      this.dangerTime = over ? this.dangerTime + dt : Math.max(0, this.dangerTime - dt * 2);
      return this.dangerTime >= 1.8;
    }
  }
  const api = { FruitWorld, RADII, POINTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FruitPhysics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
