'use client';
/**
 * Laboratorio virtual: simulación local de secuencias. No controla el robot.
 * Las órdenes reales se muestran deshabilitadas (ver lib/commands.ts).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, FlaskConical, Lock, Play, RotateCcw, Square } from 'lucide-react';
import { plantProfiles } from '../../lib/content';
import { REAL_COMMANDS_ENABLED } from '../../lib/commands';
import { defaultCalibration, irrigationSteps, primeSteps, validCalibration, type Calibration, type Step } from '../../lib/model';

const TICK = 0.25;

function useSimulator() {
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState('En espera');
  const [progress, setProgress] = useState(0);
  const [pump, setPump] = useState(false);
  const [delivered, setDelivered] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const job = useRef<Step[]>([]);
  const elapsed = useRef(0);
  const passed = useRef(0);
  const total = useRef(1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const push = (line: string) => setLog((l) => [line, ...l].slice(0, 14));

  const halt = useCallback((message: string) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    job.current = [];
    setRunning(false);
    setPump(false);
    setCurrent(message);
    push(message);
  }, []);

  const start = useCallback(
    (steps: Step[], label: string) => {
      if (timer.current || !steps.length) return;
      job.current = [...steps];
      elapsed.current = 0;
      passed.current = 0;
      total.current = steps.reduce((a, s) => a + s.duration, 0);
      setRunning(true);
      setProgress(0);
      setPump(!!steps[0].pump);
      setCurrent(steps[0].name);
      push(`Inicio · ${label} (simulación)`);
      push(steps[0].name);
      timer.current = setInterval(() => {
        const step = job.current[0];
        if (!step) return;
        elapsed.current += TICK;
        passed.current += TICK;
        setProgress(Math.min(100, (passed.current / total.current) * 100));
        if (elapsed.current >= step.duration) {
          if (step.volume) setDelivered((v) => v + (step.volume ?? 0));
          job.current.shift();
          elapsed.current = 0;
          const next = job.current[0];
          if (next) {
            setCurrent(next.name);
            setPump(!!next.pump);
            push(next.name);
          } else {
            setProgress(100);
            halt('Ciclo completado · simulación local');
          }
        }
      }, TICK * 1000);
    },
    [halt],
  );

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  return { running, current, progress, pump, delivered, log, start, stop: () => halt('Detenido · bomba virtual apagada') };
}

export function Lab() {
  const sim = useSimulator();
  const [tab, setTab] = useState<'operacion' | 'calibracion' | 'ordenes'>('operacion');
  const [pot, setPot] = useState(0);
  const [dose, setDose] = useState(plantProfiles[0].doseMl);
  const [config, setConfig] = useState<Calibration>(defaultCalibration);
  const [draft, setDraft] = useState<Calibration>(defaultCalibration);
  const [notice, setNotice] = useState('');

  const tour = () => {
    const steps: Step[] = [];
    plantProfiles.forEach((p, i) => {
      steps.push({ name: `Calculando el déficit de ${p.name}`, duration: 2 });
      steps.push(...irrigationSteps(p.doseMl, i, config));
    });
    sim.start(steps, 'recorrido por las tres macetas');
  };

  const save = () => {
    if (!validCalibration(draft)) {
      setNotice('Revisa los rangos indicados antes de aplicar.');
      return;
    }
    setConfig({ ...draft, angles: [...draft.angles] });
    setNotice('Aplicado a esta sesión de prueba. No se envió al robot y se pierde al recargar.');
  };

  const tabs = [
    ['operacion', 'Operación virtual'],
    ['calibracion', 'Calibración de prueba'],
    ['ordenes', 'Órdenes reales'],
  ] as const;

  return (
    <div className="wrap lab" style={{ paddingLeft: 'max(var(--gutter), env(safe-area-inset-left))' }}>
      <span className="eyebrow">
        <FlaskConical size={14} aria-hidden /> Laboratorio virtual
      </span>
      <h1 style={{ marginTop: 10 }}>Ensaya las secuencias del robot.</h1>
      <div className="obs-notice" data-tone="demo" style={{ marginTop: 16 }}>
        <FlaskConical size={18} aria-hidden />
        <div>
          <strong>Todo en esta página es virtual.</strong> Los controles solo actúan en este navegador; no hay conexión con la bomba
          ni con los servomotores. Esta dirección no es privada ni está protegida.
        </div>
      </div>

      <div className="lab-tabs" role="tablist" aria-label="Secciones del laboratorio">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'operacion' && (
        <div className="lab-grid" role="tabpanel" id="panel-operacion" aria-labelledby="tab-operacion">
          <div style={{ display: 'grid', gap: 16 }}>
            <section className="card lab-card">
              <h2>
                Riego de una maceta <span className="chip" data-kind="simulated">Virtual</span>
              </h2>
              <div className="choice">
                {plantProfiles.map((p, i) => (
                  <button
                    key={p.name}
                    aria-pressed={pot === i}
                    disabled={sim.running}
                    onClick={() => {
                      setPot(i);
                      setDose(p.doseMl);
                    }}
                  >
                    {p.name}
                    <small>{p.doseMl} ml iniciales</small>
                  </button>
                ))}
              </div>
              <label className="field">
                Dosis de prueba: {dose} ml
                <input type="range" min={5} max={80} step={5} value={dose} disabled={sim.running} onChange={(e) => setDose(+e.target.value)} />
                <small>
                  {Math.ceil(dose / config.capacity)} volteo(s) de hasta {config.capacity} ml · caudal de ejemplo {config.flow} ml/s
                </small>
              </label>
              <button className="btn btn-primary" disabled={sim.running} onClick={() => sim.start(irrigationSteps(dose, pot, config), `riego de ${plantProfiles[pot].name}`)}>
                <Play size={16} aria-hidden /> Simular riego
              </button>
            </section>
            <section className="card lab-card">
              <h2>Cebado y recorrido</h2>
              <p style={{ color: 'var(--ink-2)' }}>El cebado apunta al embudo de retorno. El recorrido riega las tres macetas en orden.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button className="btn btn-ghost" disabled={sim.running} onClick={() => sim.start(primeSteps(config), 'cebado')}>
                  <RotateCcw size={16} aria-hidden /> Simular cebado
                </button>
                <button className="btn btn-ghost" disabled={sim.running} onClick={tour}>
                  <Play size={16} aria-hidden /> Recorrido completo
                </button>
              </div>
            </section>
          </div>
          <aside className="card lab-card" aria-label="Estado del simulador">
            <span className="eyebrow">Estado del simulador</span>
            <h2 aria-live="polite">{sim.current}</h2>
            <div className="progress" role="progressbar" aria-label="Avance" aria-valuenow={Math.round(sim.progress)} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${sim.progress}%` }} />
            </div>
            <dl className="kv">
              <div>
                <dt>Bomba virtual</dt>
                <dd>{sim.pump ? 'Encendida' : 'Apagada'}</dd>
              </div>
              <div>
                <dt>Volumen volcado en la sesión</dt>
                <dd>{sim.delivered} ml</dd>
              </div>
            </dl>
            <button className="btn btn-ghost" disabled={!sim.running} onClick={sim.stop}>
              <Square size={14} aria-hidden /> Detener simulación
            </button>
            <div className="log" aria-label="Registro de la sesión">
              {sim.log.length ? sim.log.map((l, i) => <p key={`${i}-${l}`}>{l}</p>) : <p>Ejecuta una prueba para ver sus pasos.</p>}
            </div>
          </aside>
        </div>
      )}

      {tab === 'calibracion' && (
        <section className="card lab-card" style={{ marginTop: 24 }} role="tabpanel" id="panel-calibracion" aria-labelledby="tab-calibracion">
          <h2>
            Parámetros del simulador <span className="chip" data-kind="configured">Ejemplo</span>
          </h2>
          <p style={{ color: 'var(--ink-2)' }}>
            Valores de ejemplo editables. La capacidad de 40 ml debe confirmarse en el montaje. No se guardan ni se envían al robot.
          </p>
          <div className="field-row">
            {(
              [
                ['flow', 'Caudal', 'ml/s', 0.1, 100, 0.1],
                ['prime', 'Tiempo inicial t₀', 's', 0, 30, 0.1],
                ['capacity', 'Capacidad de la cubeta', 'ml', 1, 40, 1],
                ['drain', 'Tiempo de vaciado', 's', 1, 30, 0.1],
              ] as const
            ).map(([key, label, unit, min, max, step]) => (
              <label className="field" key={key}>
                {label}
                <span className="input-wrap">
                  <input type="number" inputMode="decimal" min={min} max={max} step={step} value={draft[key]} disabled={sim.running} onChange={(e) => setDraft({ ...draft, [key]: +e.target.value })} />
                  <span>{unit}</span>
                </span>
                <small>
                  {min}–{max} {unit}
                </small>
              </label>
            ))}
          </div>
          <h3 style={{ fontSize: '1rem' }}>Ángulos del servo 2</h3>
          <div className="field-row">
            {[...plantProfiles.map((p) => p.name), 'Retorno'].map((name, i) => (
              <label className="field" key={name}>
                {name}
                <span className="input-wrap">
                  <input type="number" inputMode="numeric" min={0} max={180} value={draft.angles[i]} disabled={sim.running} onChange={(e) => setDraft({ ...draft, angles: draft.angles.map((v, j) => (j === i ? +e.target.value : v)) })} />
                  <span>°</span>
                </span>
              </label>
            ))}
          </div>
          <button className="btn btn-primary" disabled={sim.running} onClick={save} style={{ justifySelf: 'start' }}>
            <Check size={16} aria-hidden /> Aplicar a la simulación
          </button>
          <p role="status">{notice}</p>
        </section>
      )}

      {tab === 'ordenes' && (
        <section className="card lab-card" style={{ marginTop: 24 }} role="tabpanel" id="panel-ordenes" aria-labelledby="tab-ordenes">
          <h2>
            <Lock size={18} aria-hidden /> Órdenes al robot real
          </h2>
          <p style={{ color: 'var(--ink-2)' }}>
            Deshabilitadas. Activar la bomba o mover servos desde el navegador requiere autenticación, autorización y validación en el
            servidor, acordadas con el equipo de backend. Las secuencias físicas se ejecutan en el firmware.
          </p>
          <div className="choice">
            {['Regar', 'Cebar', 'Detener'].map((label) => (
              <button key={label} disabled={!REAL_COMMANDS_ENABLED} aria-disabled="true">
                {label}
                <small>No disponible</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {sim.running && (
        <div className="runbar">
          <span>{sim.current}</span>
          <button className="btn btn-small" onClick={sim.stop}>
            <Square size={14} aria-hidden /> Detener
          </button>
        </div>
      )}
    </div>
  );
}
