'use client';
/**
 * Corriente de agua que desciende con el scroll.
 *
 * Recorre los nodos [data-river-node] colocados en el carril izquierdo de cada
 * sección, se ramifica hacia las macetas ([data-river-branch]) y termina en la
 * laguna ([data-river-end]). Va detrás del contenido (z-index 0, sin eventos).
 *
 * Rendimiento: la geometría se calcula solo al cambiar el tamaño del escenario.
 * En cada frame de scroll se actualiza un único atributo de la máscara, la
 * posición de la gota y, si cambian, los atributos de los nodos. No hay
 * renders de React durante el desplazamiento.
 *
 * prefers-reduced-motion: se dibuja completa y estática.
 */
import { useEffect, useRef, useState } from 'react';

interface Sample { len: number; x: number; y: number }
interface Branch { d: string; startY: number; endY: number; len: number }
interface Geometry {
  width: number;
  height: number;
  main: string;
  total: number;
  samples: Sample[];
  branches: Branch[];
  nodes: { el: Element; y: number }[];
  end: { el: Element; y: number } | null;
}

const SAMPLES = 240;

function centerOf(el: Element, origin: DOMRect) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - origin.left, y: r.top + r.height / 2 - origin.top };
}

/** Construye un trazado orgánico que pasa por los puntos, con meandros entre nodos lejanos. */
function buildPath(points: { x: number; y: number }[], amplitude: number): string {
  if (points.length < 2) return '';
  const expanded: { x: number; y: number }[] = [points[0]];
  let side = 1;
  for (let i = 1; i < points.length; i++) {
    const a = expanded[expanded.length - 1];
    const b = points[i];
    const dy = b.y - a.y;
    const bends = Math.min(4, Math.floor(dy / 260));
    for (let k = 1; k <= bends; k++) {
      const t = k / (bends + 1);
      expanded.push({ x: a.x + (b.x - a.x) * t + amplitude * side, y: a.y + dy * t });
      side *= -1;
    }
    expanded.push(b);
  }
  let d = `M ${expanded[0].x.toFixed(1)} ${expanded[0].y.toFixed(1)}`;
  for (let i = 1; i < expanded.length; i++) {
    const a = expanded[i - 1];
    const b = expanded[i];
    const half = (b.y - a.y) / 2;
    d += ` C ${a.x.toFixed(1)} ${(a.y + half).toFixed(1)}, ${b.x.toFixed(1)} ${(b.y - half).toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
}

export function RiverFlow() {
  const hostRef = useRef<HTMLDivElement>(null);
  const maskPathRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGCircleElement>(null);
  const branchRefs = useRef<(SVGPathElement | null)[]>([]);
  const geoRef = useRef<Geometry | null>(null);
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [reduced, setReduced] = useState(false);

  // Preferencia de movimiento reducido.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Geometría: se recalcula al cambiar el tamaño del escenario.
  useEffect(() => {
    const host = hostRef.current;
    const stage = host?.parentElement;
    if (!host || !stage) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const origin = stage.getBoundingClientRect();
      const width = stage.clientWidth;
      const height = stage.scrollHeight;
      const visible = (el: Element) => el.getClientRects().length > 0;
      const nodeEls = Array.from(stage.querySelectorAll('[data-river-node]')).filter(visible);
      if (!nodeEls.length) return;
      const nodes = nodeEls.map((el) => ({ el, ...centerOf(el, origin) })).sort((a, b) => a.y - b.y);
      const endEl = stage.querySelector('[data-river-end]');
      const railX = nodes[0].x;
      const amplitude = width < 768 ? 6 : width < 1024 ? 12 : 22;

      const points = [{ x: railX, y: Math.max(0, nodes[0].y - 120) }, ...nodes.map(({ x, y }) => ({ x, y }))];
      let end: Geometry['end'] = null;
      if (endEl) {
        const r = endEl.getBoundingClientRect();
        const ex = r.left + r.width / 2 - origin.left;
        const ey = r.top - origin.top + 18;
        const last = points[points.length - 1];
        if (ey > last.y + 80) {
          points.push({ x: railX, y: ey - 70 });
          points.push({ x: ex, y: ey });
        }
        end = { el: endEl, y: ey };
      }
      const main = buildPath(points, amplitude);

      // Muestreo de la longitud para convertir posición de scroll en longitud de trazo.
      const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      probe.setAttribute('d', main);
      const svg = host.querySelector('svg');
      svg?.appendChild(probe);
      const total = probe.getTotalLength();
      const samples: Sample[] = [];
      for (let i = 0; i <= SAMPLES; i++) {
        const len = (total * i) / SAMPLES;
        const p = probe.getPointAtLength(len);
        samples.push({ len, x: p.x, y: p.y });
      }

      const branches: Branch[] = Array.from(stage.querySelectorAll('[data-river-branch]')).filter(visible).map((el) => {
        const r = el.getBoundingClientRect();
        const tx = r.left + r.width / 2 - origin.left;
        const ty = r.top + r.height / 2 - origin.top;
        const sy = ty - 46;
        const f = (n: number) => n.toFixed(1);
        const wide = tx - railX > 120;
        // Canal: baja por el carril, gira y corre en horizontal; en escritorio cae sobre la maceta.
        const d = wide
          ? `M ${f(railX)} ${f(sy)} C ${f(railX)} ${f(ty - 8)}, ${f(railX + 8)} ${f(ty)}, ${f(railX + 30)} ${f(ty)} L ${f(tx - 16)} ${f(ty)} Q ${f(tx)} ${f(ty)}, ${f(tx)} ${f(ty + 16)}`
          : `M ${f(railX)} ${f(sy)} C ${f(railX)} ${f(ty - 10)}, ${f(railX + (tx - railX) * 0.35)} ${f(ty)}, ${f(tx)} ${f(ty)}`;
        probe.setAttribute('d', d);
        return { d, startY: sy, endY: ty, len: probe.getTotalLength() };
      });
      probe.remove();

      const next: Geometry = {
        width,
        height,
        main,
        total,
        samples,
        branches,
        nodes: nodes.map(({ el, y }) => ({ el, y })),
        end,
      };
      geoRef.current = next;
      setGeo(next);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(stage);
    window.addEventListener('resize', schedule);
    if (document.fonts?.ready) document.fonts.ready.then(schedule).catch(() => undefined);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Progreso con el scroll, aplicado directamente al DOM.
  useEffect(() => {
    const host = hostRef.current;
    const stage = host?.parentElement;
    if (!geo || !host || !stage) return;
    let frame = 0;

    const apply = (headY: number) => {
      const g = geoRef.current;
      if (!g) return;
      const { samples } = g;
      let lo = 0;
      let hi = samples.length - 1;
      if (headY <= samples[0].y) hi = 0;
      else if (headY >= samples[hi].y) lo = hi;
      else {
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (samples[mid].y < headY) lo = mid;
          else hi = mid;
        }
      }
      const a = samples[lo];
      const b = samples[hi];
      const t = b.y === a.y ? 0 : Math.min(1, Math.max(0, (headY - a.y) / (b.y - a.y)));
      const len = a.len + (b.len - a.len) * t;
      const x = a.x + (b.x - a.x) * t;
      const y = Math.min(a.y + (b.y - a.y) * t, samples[samples.length - 1].y);

      maskPathRef.current?.setAttribute('stroke-dashoffset', String(g.total - len));
      if (headRef.current) {
        headRef.current.setAttribute('cx', x.toFixed(1));
        headRef.current.setAttribute('cy', y.toFixed(1));
        headRef.current.style.opacity = len > 4 && len < g.total - 2 ? '1' : '0';
      }
      g.branches.forEach((br, i) => {
        const el = branchRefs.current[i];
        if (!el) return;
        const p = Math.min(1, Math.max(0, (headY - br.startY) / (br.endY - br.startY + 40)));
        el.setAttribute('stroke-dashoffset', String(br.len * (1 - p)));
      });
      for (const n of g.nodes) {
        const reached = String(headY >= n.y - 2);
        if (n.el.getAttribute('data-reached') !== reached) n.el.setAttribute('data-reached', reached);
      }
      if (g.end) {
        const filled = String(headY >= g.end.y - 4);
        if (g.end.el.getAttribute('data-filled') !== filled) g.end.el.setAttribute('data-filled', filled);
      }
    };

    if (reduced) {
      apply(Number.POSITIVE_INFINITY);
      return;
    }

    const update = () => {
      frame = 0;
      const top = stage.getBoundingClientRect().top;
      // La gota va un poco por debajo del centro de la pantalla.
      apply(window.innerHeight * 0.62 - top);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [geo, reduced]);

  return (
    <div ref={hostRef} className="river" aria-hidden="true">
      <svg width="100%" height={geo?.height ?? 0} viewBox={geo ? `0 0 ${geo.width} ${geo.height}` : undefined} preserveAspectRatio="none" focusable="false">
        {geo && (
          <>
            <defs>
              <linearGradient id="riverGradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={geo.height}>
                <stop offset="0" stopColor="#36c2bb" />
                <stop offset="0.55" stopColor="#129fb8" />
                <stop offset="1" stopColor="#0b7490" />
              </linearGradient>
              <mask id="riverReveal" maskUnits="userSpaceOnUse" x="0" y="0" width={geo.width} height={geo.height}>
                <path
                  ref={maskPathRef}
                  d={geo.main}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="40"
                  strokeLinecap="round"
                  strokeDasharray={`${geo.total} ${geo.total}`}
                  strokeDashoffset={reduced ? 0 : geo.total}
                />
              </mask>
            </defs>
            <path className="river-bed" d={geo.main} />
            <g mask="url(#riverReveal)">
              <path className="river-glow" d={geo.main} />
              <path className="river-water" d={geo.main} />
              <path className="river-shimmer" d={geo.main} />
            </g>
            {geo.branches.map((b, i) => (
              <path
                key={i}
                ref={(el) => {
                  branchRefs.current[i] = el;
                }}
                className="river-branch"
                d={b.d}
                strokeDasharray={`${b.len} ${b.len}`}
                strokeDashoffset={reduced ? 0 : b.len}
              />
            ))}
            {!reduced && <circle ref={headRef} className="river-head" r="6" cx="-20" cy="-20" style={{ opacity: 0 }} />}
          </>
        )}
      </svg>
    </div>
  );
}
