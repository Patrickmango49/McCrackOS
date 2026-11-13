import { useEffect, useId, useRef } from "react";

type Vec3 = [number, number, number];

const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

const vlen = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);

const rotate = (p: Vec3, rx: number, ry: number): Vec3 => {
  let [x, y, z] = p;
  const x2 = x * Math.cos(ry) + z * Math.sin(ry);
  const z2 = -x * Math.sin(ry) + z * Math.cos(ry);
  x = x2;
  z = z2;
  const y2 = y * Math.cos(rx) - z * Math.sin(rx);
  const z3 = y * Math.sin(rx) + z * Math.cos(rx);
  return [x, y2, z3];
};

const GLOBE_CIRCLES: Array<{ n: Vec3; op: number }> = [
  { n: [0, 0, 1], op: 0.9 },
  { n: [1, 0, 0], op: 0.9 },
  { n: [0, 1, 0], op: 0.9 },
  { n: [0.577, 0.577, 0.577], op: 0.75 },
  { n: [-0.577, 0.577, 0.577], op: 0.75 },
  { n: [0.577, -0.577, 0.577], op: 0.75 },
  { n: [0.3, 0.9, 0.3], op: 0.65 },
  { n: [0.9, 0.3, -0.3], op: 0.65 },
  { n: [-0.4, 0.2, 0.9], op: 0.6 },
  { n: [0.1, -0.8, 0.6], op: 0.6 },
];

function GlobeCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 200;
    const H = 200;
    const R = 96;
    const cx = 100;
    const cy = 100;

    const drawGCPath = (normal: Vec3, rx: number, ry: number) => {
      const n = norm(normal);
      let u = cross(n, [0, 1, 0]);
      if (vlen(u) < 0.001) u = cross(n, [1, 0, 0]);
      u = norm(u);
      const v = cross(n, u);
      const rp0 = rotate(u, rx, ry);
      ctx.moveTo(cx + rp0[0] * R, cy + rp0[1] * R);
      for (let i = 1; i <= 90; i += 1) {
        const t = (i / 90) * Math.PI * 2;
        const p: Vec3 = [
          Math.cos(t) * u[0] + Math.sin(t) * v[0],
          Math.cos(t) * u[1] + Math.sin(t) * v[1],
          Math.cos(t) * u[2] + Math.sin(t) * v[2],
        ];
        const rp = rotate(p, rx, ry);
        ctx.lineTo(cx + rp[0] * R, cy + rp[1] * R);
      }
    };

    const drawAll = (rx: number, ry: number) => {
      const groups: Record<string, Array<{ n: Vec3; op: number }>> = {};
      for (const c of GLOBE_CIRCLES) {
        const key = String(c.op);
        (groups[key] || (groups[key] = [])).push(c);
      }
      for (const op in groups) {
        ctx.beginPath();
        for (const c of groups[op]) drawGCPath(c.n, rx, ry);
        ctx.strokeStyle = `rgba(255,255,255,${op})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
    };

    let tX = 0;
    let tY = 0;
    let cX = 0;
    let cY = 0;

    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      tY = nx * Math.PI * 1.6;
      tX = -ny * Math.PI * 0.85;
    };
    window.addEventListener("mousemove", onMove);

    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      cX += (tX - cX) * 0.055;
      cY += (tY - cY) * 0.055;
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      drawAll(cX, cY);
      ctx.restore();
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <canvas ref={ref} width={200} height={200} className={className} aria-hidden="true" />;
}

function StarField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const container = cv.parentElement;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const STAR_COUNT = 244;
    const ANGLE = (160 * Math.PI) / 180;
    const cosA = Math.cos(ANGLE);
    const sinA = Math.sin(ANGLE);
    let W = 0;
    let H = 0;

    const resize = () => {
      W = cv.width = container?.offsetWidth || window.innerWidth;
      H = cv.height = container?.offsetHeight || window.innerHeight;
    };
    resize();

    const ro = container ? new ResizeObserver(resize) : null;
    if (ro && container) ro.observe(container);
    window.addEventListener("resize", resize);

    type Star = { x: number; y: number; speed: number; trailLen: number; maxOp: number; life: number; maxLife: number };

    const randStar = (scatter: boolean): Star => {
      const edge = Math.floor(Math.random() * 4);
      let x: number;
      let y: number;
      if (edge === 0) { x = Math.random() * W; y = -20; }
      else if (edge === 1) { x = W + 20; y = Math.random() * H; }
      else if (edge === 2) { x = Math.random() * W; y = H + 20; }
      else { x = -20; y = Math.random() * H; }
      if (scatter) { x = Math.random() * W; y = Math.random() * H; }
      return {
        x,
        y,
        speed: 150 + Math.random() * 200,
        trailLen: 180 + Math.random() * 80,
        maxOp: 0.4 + Math.random() * 0.45,
        life: 0,
        maxLife: 3 + Math.random() * 3,
      };
    };

    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => {
      const s = randStar(true);
      s.life = Math.random() * s.maxLife;
      return s;
    });

    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, W, H);

      for (const s of stars) {
        s.life += dt;
        if (s.life >= s.maxLife) {
          Object.assign(s, randStar(false));
          s.life = 0;
          continue;
        }
        s.x += cosA * s.speed * dt;
        s.y += sinA * s.speed * dt;

        const t = s.life / s.maxLife;
        const op = t < 0.1 ? (t / 0.1) * s.maxOp : t > 0.65 ? ((1 - t) / 0.35) * s.maxOp : s.maxOp;

        const tx = s.x - cosA * s.trailLen;
        const ty = s.y - sinA * s.trailLen;
        const g = ctx.createLinearGradient(tx, ty, s.x, s.y);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(1, `rgba(255,255,255,${op.toFixed(2)})`);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      ro?.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

export function VertexStudioWallpaper({ className, label = "MCCRACK STUDIOS" }: { className?: string; label?: string }) {
  const pathId = `vws-arc-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div className={`vws-root ${className ?? ""}`} aria-hidden="true">
      <div className="vws-stars">
        <StarField className="vws-stars-canvas" />
      </div>
      <div className="vws-brand">
        <div className="vws-globe">
          <GlobeCanvas className="vws-globe-canvas" />
          <svg className="vws-ring" viewBox="-40 -40 280 280" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeDasharray="4 3" />
            <defs>
              <path id={pathId} d="M 0,100 A 77,77 0 0,1 200,100" fill="none" />
            </defs>
            <text className="vws-wordmark" fontFamily="'Paytone One', 'Space Grotesk', sans-serif" fontWeight={900} fontSize={24} fill="#ffffff" letterSpacing="2" textLength={205} lengthAdjust="spacingAndGlyphs">
              <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">{label}</textPath>
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
