/* =====================================================================
   FlowLab：石笱實驗區的簡化 2D 平面流場（D2Q9 格子波茲曼法）
   - 格點座標：i = 順流方向（0 = 上游入流），j = 橫向（0 = 北岸／圳口那一側）
   - 北岸：不透水岸壁，其中 [intake0, intake1) 為圳口（壓力出口，只出不進）
   - 南側：自由滑移邊界（代表河道其餘部分）
   - 上游：固定流速入流；下游：固定壓力出流
   - 石笱：會透水的障礙物，以「每格阻尼係數 alpha」削減該格流速
   壓力（密度 rho）的高低可想成水位的高低：石笱把水擋高，圳口才進得了水。
   這是教學用的簡化模擬，不是水理計算。
   ===================================================================== */
const EX = [0, 1, 0, -1, 0, 1, -1, -1, 1];
const EY = [0, 0, 1, 0, -1, 1, 1, -1, -1];
const W9 = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
const OPP = [0, 3, 4, 1, 2, 7, 8, 5, 6];
const FLIPY = [0, 1, 4, 3, 2, 8, 7, 6, 5];   // ey 反向（自由滑移鏡射）

export class FlowLab {
  constructor({ nx, ny, cell, intake, tau = 0.56, uIn = 0.08, rhoIntake = 1.0 }) {
    Object.assign(this, { nx, ny, cell, tau, uIn, rhoIntake });
    this.intake0 = intake[0]; this.intake1 = intake[1];
    const N = nx * ny;
    this.f = new Float32Array(N * 9); this.g = new Float32Array(N * 9);
    this.rho = new Float32Array(N).fill(1); this.ux = new Float32Array(N); this.uy = new Float32Array(N);
    this.alpha = new Float32Array(N);
    this.intakeFlow = 0; this.inFlow = uIn * ny;
    for (let c = 0; c < N; c++) { this.ux[c] = uIn; for (let k = 0; k < 9; k++) this.f[c * 9 + k] = feq(k, 1, uIn, 0); }
  }

  /* 石笱平面範圍 → 每格阻尼。cages: [{ i, j, ang, len, r0, r1, alpha }]（格點單位，ang 為與 +i 的夾角） */
  setObstacles(cages) {
    const { nx, ny, alpha } = this; alpha.fill(0);
    const SS = 3;
    for (const g of cages) {
      const ca = Math.cos(g.ang), sa = Math.sin(g.ang), ext = g.len + g.r0 + 1;
      const i0 = Math.max(0, Math.floor(g.i - ext)), i1 = Math.min(nx - 1, Math.ceil(g.i + ext));
      const j0 = Math.max(0, Math.floor(g.j - ext)), j1 = Math.min(ny - 1, Math.ceil(g.j + ext));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        let hit = 0;
        for (let a = 0; a < SS; a++) for (let b = 0; b < SS; b++) {
          const x = i + (a + 0.5) / SS - 0.5 - g.i, y = j + (b + 0.5) / SS - 0.5 - g.j;
          const s = x * ca + y * sa, n = -x * sa + y * ca;
          if (s < 0 || s > g.len) continue;
          const r = g.r0 + (g.r1 - g.r0) * (s / g.len);
          if (Math.abs(n) <= r) hit++;
        }
        if (hit) { const c = j * nx + i; alpha[c] = Math.min(0.97, alpha[c] + g.alpha * hit / (SS * SS)); }
      }
    }
  }

  step(n = 1) { for (let s = 0; s < n; s++) this._step(); }

  _step() {
    const { nx, ny, f, g, rho, ux, uy, alpha, tau, uIn, rhoIntake, intake0, intake1 } = this;
    const om = 1 / tau;
    // 碰撞（含石笱阻尼）
    for (let c = 0, N = nx * ny; c < N; c++) {
      const o = c * 9;
      let r = 0, mx = 0, my = 0;
      for (let k = 0; k < 9; k++) { const v = f[o + k]; r += v; mx += v * EX[k]; my += v * EY[k]; }
      let vx = mx / r, vy = my / r;
      const a = alpha[c]; if (a) { vx *= 1 - a; vy *= 1 - a; }
      rho[c] = r; ux[c] = vx; uy[c] = vy;
      const usq = 1.5 * (vx * vx + vy * vy);
      for (let k = 0; k < 9; k++) {
        const eu = EX[k] * vx + EY[k] * vy;
        f[o + k] += (W9[k] * r * (1 + 3 * eu + 4.5 * eu * eu - usq) - f[o + k]) * om;
      }
    }
    // 串流（pull）＋邊界
    let qIntake = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const c = j * nx + i, o = c * 9;
      for (let k = 0; k < 9; k++) {
        let si = i - EX[k], sj = j - EY[k], v;
        if (si < 0) {                       // 上游入流
          v = feq(k, rho[j * nx], uIn, 0);
        } else if (si >= nx) {              // 下游出流（固定壓力）
          const cc = j * nx + nx - 1; v = feq(k, 1, Math.max(0, ux[cc]), uy[cc]);
        } else if (sj < 0) {                // 北岸
          if (si >= intake0 && si < intake1) {
            const cc = si; v = feq(k, rhoIntake, ux[cc] * 0.5, Math.min(0, uy[cc]));
          } else v = f[o + OPP[k]];          // 不透水岸壁：反彈
        } else if (sj >= ny) {              // 南側自由滑移
          v = f[(j * nx + si) * 9 + FLIPY[k]];
        } else v = f[(sj * nx + si) * 9 + k];
        g[o + k] = v;
      }
    }
    for (let i = intake0; i < intake1; i++) qIntake += Math.max(0, -uy[i]) * rho[i];
    this.intakeFlow = this.intakeFlow * 0.98 + qIntake * 0.02;
    this.f = g; this.g = f;
  }

  /* 雙線性取樣流速（格點座標，回傳格點單位） */
  sample(x, y, out) {
    const { nx, ny, ux, uy } = this;
    x = Math.min(nx - 1.001, Math.max(0, x)); y = Math.min(ny - 1.001, Math.max(0, y));
    const i = x | 0, j = y | 0, tx = x - i, ty = y - j, c = j * nx + i;
    const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
    out[0] = ux[c] * w00 + ux[c + 1] * w10 + ux[c + nx] * w01 + ux[c + nx + 1] * w11;
    out[1] = uy[c] * w00 + uy[c + 1] * w10 + uy[c + nx] * w01 + uy[c + nx + 1] * w11;
    return out;
  }

  get diversion() { return this.intakeFlow / this.inFlow; }
}

function feq(k, r, vx, vy) {
  const eu = EX[k] * vx + EY[k] * vy;
  return W9[k] * r * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * (vx * vx + vy * vy));
}
