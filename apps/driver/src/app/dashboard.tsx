'use client';

import { useEffect, useMemo, useState } from 'react';
import { testNetwork } from '@reise/transit-providers';
import type { Disruption, VehiclePosition } from '@reise/shared';

type Stage = 'login' | 'checkin' | 'operations' | 'ended';
type Tracking = 'active' | 'paused' | 'offline';
const TEST_PIN_HASH = '4fbb9cf6972a100cd12fee93b2eb185f4cf2964906979ea2a2ac4e5c1759254f';

async function hashPin(pin: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export function DriverDashboard() {
  const [stage, setStage] = useState<Stage>('login');
  const [email, setEmail] = useState('driver01@reise.test');
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [fleet, setFleet] = useState('6007');
  const [line, setLine] = useState('B60');
  const [routeId, setRouteId] = useState('b60-east');
  const [tracking, setTracking] = useState<Tracking>('offline');
  const [stopIndex, setStopIndex] = useState(1);
  const [delay, setDelay] = useState(4);
  const [disruptionKind, setDisruptionKind] = useState<'none' | 'roadworks' | 'event' | 'traffic'>('none');
  const [connection, setConnection] = useState<'connected' | 'retrying'>('connected');
  const [handoverCode, setHandoverCode] = useState('');
  const route = useMemo(() => testNetwork.routes.find((item) => item.id === routeId) ?? testNetwork.routes[0]!, [routeId]);
  const routeStops = route.stopIds.map((id) => testNetwork.stops.find((stop) => stop.id === id)!).filter(Boolean);

  const disruption: Disruption | undefined = disruptionKind === 'none' ? undefined : {
    id: `driver-${disruptionKind}`, category: disruptionKind === 'event' ? 'event' : disruptionKind,
    severity: disruptionKind === 'traffic' ? 'moderate' : 'major', affectedRouteIds: [route.id],
    affectedStopIds: disruptionKind === 'roadworks' ? ['aeschen'] : [],
    note: disruptionKind === 'event' ? 'Football-event traffic at St. Jakob. Alternative route recommended.' : disruptionKind === 'roadworks' ? 'Roadworks divert this service. Aeschenplatz may not be served.' : 'Heavy traffic is adding delay to this service.', active: true,
  };

  const buildPosition = (): VehiclePosition => {
    const current = routeStops[Math.min(stopIndex, routeStops.length - 1)]!;
    const next = routeStops[Math.min(stopIndex + 1, routeStops.length - 1)]!;
    const now = new Date().toISOString();
    return { vehicleId: `vehicle-${fleet}`, fleetNumber: fleet, lineCode: line, routeId: route.id, directionId: route.directionId, tripId: `${route.id}-2`, shiftId: `shift-${fleet}-active`, latitude: current.latitude, longitude: current.longitude, bearing: 84, speedKph: tracking === 'active' ? 26 : 0, accuracyMetres: 8, currentStopId: current.id, nextStopId: next.id, delayMinutes: delay, locationSource: 'reise_simulated_gps', deviceTimestamp: now, serverTimestamp: now };
  };

  const transmit = async (nextTracking: Tracking = tracking) => {
    try {
      const response = await fetch('/api/live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: buildPosition(), disruption, tracking: nextTracking }) });
      if (!response.ok) throw new Error('Tracking rejected');
      setConnection('connected');
    } catch { setConnection('retrying'); }
  };

  useEffect(() => {
    if (stage !== 'operations' || tracking !== 'active') return;
    void transmit('active');
    const timer = window.setInterval(() => {
      setStopIndex((value) => value >= routeStops.length - 2 ? 0 : value + 1);
      void transmit('active');
    }, 5000);
    return () => window.clearInterval(timer);
  }, [stage, tracking, routeId, delay, disruptionKind]);

  const login = async () => {
    const isValid = email.endsWith('@reise.test') && await hashPin(pin) === TEST_PIN_HASH;
    if (!isValid) { setAuthError('The test account or PIN is not correct.'); return; }
    setAuthError(''); setPin(''); setStage('checkin');
  };
  const startShift = () => { setTracking('active'); setStage('operations'); };
  const endShift = async () => { setTracking('offline'); await transmit('offline'); setStage('ended'); };
  const createHandover = () => setHandoverCode(`${fleet}-${Math.floor(1000 + Math.random() * 9000)}`);

  if (stage === 'login') return <main className="login-shell"><section className="login-brand"><div className="wordmark">Reise<span>.</span></div><p>Driver operations</p><div className="brand-copy"><h1>Start every shift with certainty.</h1><p>Confirm the physical vehicle, direction and trip before any location is transmitted.</p></div><div className="safety-copy">Operate Reise only while safely stopped.</div></section><section className="login-panel"><div className="login-card"><p className="eyebrow">Authorised test access</p><h2>Driver sign in</h2><p className="muted">Sessions expire automatically. Repeated failed attempts are rate-limited in production.</p><label>Email</label><input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" /><label>Driver PIN</label><input value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" maxLength={4} autoComplete="current-password" placeholder="4 digits" />{authError ? <p className="error-text">{authError}</p> : null}<button className="primary-button" onClick={() => void login()}>Continue securely</button><p className="test-help">Test driver 01 · use the PIN provided in docs/DEMO.md</p></div></section></main>;

  if (stage === 'checkin') return <main className="checkin-shell"><header className="topbar"><div className="wordmark dark">Reise<span>.</span></div><div className="topbar-meta"><span>Test Driver 01</span><button className="text-button" onClick={() => setStage('login')}>Sign out</button></div></header><section className="checkin-content"><div className="step-heading"><p className="eyebrow">Shift check-in · 1 of 1</p><h1>Confirm this vehicle and trip</h1><p>Location transmission stays off until you start the shift.</p></div><div className="form-grid"><div className="form-card"><h2>Assignment</h2><div className="field-grid"><label>Operator<select><option>Reise Test Operator</option></select></label><label>Physical vehicle<select value={fleet} onChange={(event) => setFleet(event.target.value)}><option>Fleet 6007</option><option value="6012">Fleet 6012</option><option value="4703">Fleet 4703</option></select></label><label>Line<select value={line} onChange={(event) => setLine(event.target.value)}><option>B60</option><option>B47</option><option>B57</option></select></label><label>Direction<select value={routeId} onChange={(event) => setRouteId(event.target.value)}>{testNetwork.routes.filter((item) => item.lineCode === line).map((item) => <option key={item.id} value={item.id}>{item.destination}</option>)}</select></label><label>Scheduled trip<select><option>08:02 · {route.destination}</option><option>08:22 · {route.destination}</option></select></label><label>Location source<select><option>Route simulator</option><option>Browser GPS</option></select></label></div></div><aside className="confirmation-card"><p className="eyebrow">Review</p><dl><div><dt>Driver</dt><dd>Test Driver 01</dd></div><div><dt>Vehicle</dt><dd>Fleet {fleet}</dd></div><div><dt>Line</dt><dd>{line}</dd></div><div><dt>Direction</dt><dd>{route.destination}</dd></div><div><dt>First stop</dt><dd>{routeStops[0]?.name}</dd></div><div><dt>Final stop</dt><dd>{routeStops.at(-1)?.name}</dd></div><div><dt>Source</dt><dd>Route simulator</dd></div></dl><div className="tracking-off">TRACKING IS OFF</div><button className="primary-button" onClick={startShift}>Start shift and begin tracking</button></aside></div></section></main>;

  if (stage === 'ended') return <main className="end-shell"><div className="end-card"><div className="wordmark dark">Reise<span>.</span></div><p className="eyebrow">Shift closed</p><h1>Tracking has stopped.</h1><p>The final vehicle position is retained with its timestamp, but Fleet {fleet} is no longer presented as current.</p><button className="primary-button" onClick={() => { setStage('login'); setStopIndex(1); setDisruptionKind('none'); }}>Return to sign in</button></div></main>;

  const currentStop = routeStops[Math.min(stopIndex, routeStops.length - 1)]!;
  const nextStop = routeStops[Math.min(stopIndex + 1, routeStops.length - 1)]!;
  return <main className="ops-shell"><aside className="sidebar"><div><div className="wordmark">Reise<span>.</span></div><p className="side-label">Driver operations</p></div><nav><button className="nav-active">Overview</button><button>Assignment</button><button>Disruptions</button><button>Handover</button></nav><div className="driver-block"><p>Test Driver 01</p><span>Shift started 08:01</span><button onClick={() => void endShift()}>End shift</button></div></aside><section className="operations"><header className="ops-header"><div><p className="eyebrow">Fleet {fleet} · Reise Test Network</p><h1>{line} toward {route.destination}</h1></div><div className={`connection ${connection}`}>{connection === 'connected' ? 'CONNECTED' : 'RETRYING'}</div></header><div className="safety-banner"><strong>Safety first.</strong> Do not interact with Reise while driving. Make changes only when safely stopped.</div><div className="ops-grid"><section className="map-card"><div className="map-top"><div><span className="line-badge">{line}</span><h2>{currentStop.name}</h2><p>Next · {nextStop.name}</p></div><div className="delay-box"><span>Delay</span><strong>+{delay} min</strong></div></div><div className="route-visual"><div className="route-track" /><div className="vehicle-card" style={{ left: `${Math.max(6, Math.min(78, (stopIndex / Math.max(1, routeStops.length - 1)) * 78))}%` }}><strong>{fleet}</strong><span>simulated GPS</span></div>{routeStops.slice(0, 5).map((stop, index) => <div className="route-stop" key={stop.id} style={{ left: `${8 + index * 20}%` }}><b>{index + 1}</b><span>{stop.name.split(', ').at(-1)}</span></div>)}</div><div className="map-footer"><div><span>Current stop</span><strong>{currentStop.name}</strong></div><div><span>Last transmitted</span><strong>Moments ago</strong></div><div><span>GPS accuracy</span><strong>8 metres</strong></div><div><span>Source</span><strong>Route simulator</strong></div></div></section><aside className="control-card"><p className="eyebrow">Tracking control</p><h2>{tracking === 'active' ? 'Position updates active' : 'Position updates paused'}</h2><p className="muted">Updates are sent every five seconds while this shift is active.</p><div className="button-row"><button className="primary-button" onClick={() => setTracking(tracking === 'active' ? 'paused' : 'active')}>{tracking === 'active' ? 'Pause tracking' : 'Resume tracking'}</button><button className="secondary-button" onClick={() => setStopIndex((value) => Math.min(routeStops.length - 1, value + 1))}>Next stop</button></div><label>Reported delay<select value={delay} onChange={(event) => setDelay(Number(event.target.value))}><option value={0}>On time</option><option value={4}>+4 minutes</option><option value={8}>+8 minutes</option><option value={12}>+12 minutes</option></select></label><label>Report disruption<select value={disruptionKind} onChange={(event) => setDisruptionKind(event.target.value as typeof disruptionKind)}><option value="none">No active disruption</option><option value="traffic">Heavy traffic</option><option value="roadworks">Roadworks</option><option value="event">St. Jakob football event</option></select></label>{disruption ? <div className="disruption-card"><strong>{disruption.category.replace('_', ' ')}</strong><p>{disruption.note}</p><button onClick={() => setDisruptionKind('none')}>Clear disruption</button></div> : null}<div className="handover"><h3>Hand over vehicle</h3><p>Create a short-lived, single-use code for the incoming driver.</p>{handoverCode ? <code>{handoverCode}</code> : <button className="secondary-button" onClick={createHandover}>Create handover code</button>}</div></aside></div></section></main>;
}
