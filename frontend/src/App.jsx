import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Board3D, { C, dims, posOf } from "./Board3D.jsx";
import Wave from "./Wave.jsx";

const post = (u, b) => fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) })
  .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || "Server error " + r.status); return j; });

// Estimate a small board tilt from dominant near-horizontal/vertical PCB edges.
// It intentionally leaves strongly rotated or ambiguous photos unchanged.
function estimateBoardTilt(img) {
  const max = 280, scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(3, Math.round(img.width * scale)), h = Math.max(3, Math.round(img.height * scale));
  const sample = document.createElement("canvas"); sample.width = w; sample.height = h;
  const ctx = sample.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h), gray = new Float32Array(w * h);
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = .299 * data[j] + .587 * data[j + 1] + .114 * data[j + 2];
  const bins = new Float64Array(25); let total = 0, near = 0, lapSum = 0, lapSq = 0, lapN = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, tl = gray[i-w-1], t = gray[i-w], tr = gray[i-w+1], l = gray[i-1], r = gray[i+1], bl = gray[i+w-1], b = gray[i+w], br = gray[i+w+1];
    const gx = -tl + tr - 2*l + 2*r - bl + br, gy = -tl - 2*t - tr + bl + 2*b + br;
    const mag = Math.hypot(gx, gy); total += mag;
    let delta = Math.atan2(gy, gx) * 180 / Math.PI;
    while (delta >= 45) delta -= 90; while (delta < -45) delta += 90;
    if (Math.abs(delta) <= 12) { bins[Math.max(0, Math.min(24, Math.round(delta) + 12))] += mag; near += mag; }
    const lap = 4 * gray[i] - t - b - l - r; lapSum += lap; lapSq += lap * lap; lapN++;
  }
  const mean = lapSum / Math.max(1, lapN), blur = lapSq / Math.max(1, lapN) - mean * mean;
  if (!total || near / total < .3) return { angle: 0, blur };
  let peak = 0;
  for (let i = 0; i < bins.length; i++) {
    let v = 0; for (let j = Math.max(0, i-2); j <= Math.min(24, i+2); j++) v += bins[j];
    if (v > peak) peak = v;
  }
  if (peak / near < .34) return { angle: 0, blur };
  let best = 0, bestScore = -1;
  for (let i = 0; i < bins.length; i++) {
    let score = 0; for (let j = Math.max(0, i-2); j <= Math.min(24, i+2); j++) score += bins[j];
    if (score > bestScore) { bestScore = score; best = i - 12; }
  }
  return { angle: Math.abs(best) >= .8 && Math.abs(best) <= 12 ? -best : 0, blur };
}

function sharpenCanvas(canvas, blur) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), w = canvas.width, h = canvas.height;
  const image = ctx.getImageData(0, 0, w, h), src = new Uint8ClampedArray(image.data), dst = image.data;
  const amount = blur < 180 ? .38 : blur < 650 ? .27 : .16, contrast = 1.045;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = (y * w + x) * 4;
    for (let c = 0; c < 3; c++) {
      const avg = (src[i-4+c] + src[i+4+c] + src[i-w*4+c] + src[i+w*4+c]) * .25;
      dst[i+c] = (src[i+c] + amount * (src[i+c] - avg) - 128) * contrast + 128;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function shrink(file) {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const { angle, blur } = estimateBoardTilt(img), scale = Math.min(1.6, 1600 / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale));
        const ctx = c.getContext("2d"); ctx.translate(c.width / 2, c.height / 2); ctx.rotate(angle * Math.PI / 180); ctx.drawImage(img, -c.width / 2, -c.height / 2, c.width, c.height);
        sharpenCanvas(c, blur);
        URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", .92));
      } catch (e) { URL.revokeObjectURL(u); rej(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("Image khul nahi paayi")); };
    img.src = u;
  });
}
// chat ka halka markdown renderer (<br> aur HTML tags hata deta hai, **bold**, `code`, lists, headings)
const inl = (s) => s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((x, i) => x.startsWith("**") && x.length > 4 ? <b key={i}>{x.slice(2, -2)}</b> : x.startsWith("`") && x.length > 2 ? <code key={i}>{x.slice(1, -1)}</code> : x);
function Md({ text }) {
  const out = []; let list = null;
  text.replace(/<br\s*\/?>/gi, "\n").replace(/<\/?[a-z][^>]*>/gi, "").split("\n").forEach((l, i) => {
    const li = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
    if (li) { (list ||= []).push(<li key={i}>{inl(li[1])}</li>); return; }
    if (list) { out.push(<ul key={"u" + i}>{list}</ul>); list = null; }
    if (!l.trim()) return;
    const h = l.match(/^#{1,4}\s+(.*)/);
    out.push(h ? <h4 key={i}>{inl(h[1])}</h4> : <p key={i}>{inl(l)}</p>);
  });
  if (list) out.push(<ul key="end">{list}</ul>);
  return <>{out}</>;
}

const FULL = "Is board ko poora explain karo: board ka overall kaam, har major component ka kaam, aur power input se output tak kaise flow karta hai.";
const VIEWS = { Top: [0, 70, .01], Front: [0, 12, 60], Side: [60, 12, 0], Iso: [0, 35, 50] };

// real photo (ya photo na ho to 2D top view) + part boxes; tap = select
function PhotoPane({ spec, photo, ar, setAr, sel, onPick, labels }) {
  const a = photo ? ar : Math.max(.4, Math.min(2.5, +spec.board?.aspect || 1));
  return (
    <div className="photo" onClick={() => onPick(null)}>
      <div className={"pw" + (photo ? "" : " np")} style={{ "--ar": a }}>
        {photo && <img src={photo} alt="Real board" onLoad={(e) => setAr(e.target.naturalWidth / e.target.naturalHeight)} />}
        {spec.parts.map((p, i) => (
          <button key={i} className={"bx" + (sel === p ? " on" : "")} aria-label={p.label || p.type}
            style={{ left: p.x + "%", top: p.y + "%", width: p.w + "%", height: p.h + "%", background: photo ? "transparent" : C[p.type] || "#666" }}
            onClick={(e) => { e.stopPropagation(); onPick(p); }}>{(labels || sel === p) && (p.label || p.type !== "hole") && <span>{p.label || p.type}</span>}</button>
        ))}
      </div>
      <span className="pt">{photo ? "📷 Real photo" : "Top view (real photo upload karo)"}</span>
    </div>
  );
}

export default function App() {
  const [spec, setSpec] = useState(null), [sel, setSel] = useState(null), [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState(""), [busy, setBusy] = useState(false), [status, setStatus] = useState("");
  const [labels, setLabels] = useState(true), [axis, setAxis] = useState(true), [auto, setAuto] = useState(true), [mode, setMode] = useState("light"), [isFullscreen, setIsFullscreen] = useState(false), [flowOn, setFlowOn] = useState(false), [flowMode, setFlowMode] = useState("all");
  const [photo, setPhoto] = useState(null), [ar, setAr] = useState(1), [tab, setTab] = useState("view");
  const goal = useRef(null), ctl = useRef(null), chatEnd = useRef(null), viewEl = useRef(null);
  useEffect(() => { const sync = () => setIsFullscreen(document.fullscreenElement === viewEl.current); document.addEventListener("fullscreenchange", sync); return () => document.removeEventListener("fullscreenchange", sync); }, []);

  const loadSample = () => {
    setStatus("Connecting to backend...");
    fetch("/api/sample")
      .then((r) => {
        if (!r.ok) throw new Error("Status " + r.status);
        return r.json();
      })
      .then((data) => {
        setSpec(data);
        setStatus("");
      })
      .catch(() => setStatus("Backend band hai: uvicorn main:app --port 8000 chalao"));
  };

  useEffect(() => { loadSample(); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  if (!spec) {
    return (
      <div className="boot" style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "center", padding: 20 }}>
        <p>{status || "Loading…"}</p>
        <button onClick={loadSample} style={{ padding: "8px 18px", alignSelf: "center" }}>Dobara connect karo (Retry)</button>
      </div>
    );
  }

  const cam = () => ctl.current?.object, tgt0 = () => ctl.current?.target.clone() || new THREE.Vector3();
  const go = (pos, tgt = new THREE.Vector3()) => { setAuto(false); goal.current = { pos: new THREE.Vector3(...pos), tgt }; };
  const zoom = (f) => { const c = cam(); if (!c) return; const t = tgt0(); goal.current = { tgt: t, pos: t.clone().add(c.position.clone().sub(t).multiplyScalar(f)) }; };
  function pick(p) {   // 3D, photo, chips: teeno yahin se select hote hain
    setSel(p); if (!p || !ctl.current) return;
    const c = cam(), pt = new THREE.Vector3(...posOf(p, dims(spec)));
    const dir = c.position.clone().sub(ctl.current.target).normalize();
    goal.current = { tgt: pt, pos: pt.clone().add(dir.multiplyScalar(26)) }; setAuto(false);
  }
  async function ask(text, sp = spec, hist = msgs) {
    text = (text || q).trim(); if (!text || busy) return;
    const next = [...hist, { role: "user", content: text }]; setMsgs(next); setQ(""); setBusy(true);
    try { const r = await post("/api/chat", { messages: next, spec: sp, sel }); setMsgs([...next, { role: "assistant", content: r.reply }]); }
    catch (e) { setMsgs([...next, { role: "assistant", content: "Backend error: " + e.message }]); }
    setBusy(false);
  }
  async function onFile(e) {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try {
      setStatus("Photo cleanup + AI analysis ho rahi hai… (10–30 sec)");
      const img = await shrink(f), sp = await post("/api/analyze", { image: img });
      setPhoto(img); setSpec(sp); setSel(null); setMsgs([]);
      setStatus(`${sp.board.name} · ${sp.parts.length} parts (cleaned image, AI estimate; location approx)`);
    } catch (er) { setStatus("Error: " + er.message); }
  }
  const Btn = ({ on, ...p }) => <button className={on ? "on" : ""} {...p} />;

  return (
    <div className="app" data-tab={tab}>
      <header className="top">
        <b>🔌 Decompile 3D</b><span className="st">{status}</span>
        <label className="btn">📷 Photo<input type="file" accept="image/*" hidden onChange={onFile} /></label>
      </header>

      <main className="left">
        <div className="pair">
          <div className="view" ref={viewEl} style={{ background: mode === "light" ? "#f5f7fa" : mode === "holo" ? "#041621" : "#151515" }}>
            <Board3D {...{ spec, sel, labels, axis, goal, ctl, auto, mode, flowOn, flowMode }} onPick={pick} />
            <div className="bar">
              {Object.entries(VIEWS).map(([n, p]) => <Btn key={n} onClick={() => go(p)}>{n}</Btn>)}
              {[["light", "☀ Light"], ["dark", "🌑 Dark"], ["holo", "✨ Hologram"]].map(([m, n]) => <Btn key={m} on={mode === m} onClick={() => setMode(m)}>{n}</Btn>)}
              <Btn on={flowOn} onClick={() => setFlowOn(!flowOn)}>⚡ Flows</Btn>
              <Btn on={labels} onClick={() => setLabels(!labels)}>Labels</Btn>
              <Btn on={axis} onClick={() => setAxis(!axis)}>Axis</Btn>
              <Btn on={auto} onClick={() => setAuto(!auto)}>Auto</Btn>
            </div>
            {flowOn && <div className="flow-card">
              <b>⚡ Board flows</b><small>Visual estimate · netlist nahi</small>
              <div className="flow-options">{[["all", "All"], ["power", "Power"], ["return", "Return"], ["component", "Selected"]].map(([m, n]) => <button key={m} className={flowMode === m ? "on" : ""} onClick={() => setFlowMode(m)}>{n}</button>)}</div>
              <div className="flow-key">{(flowMode === "all" ? [["#36e8ff", "Input / power"], ["#ffb45e", "Ground return"], ...(sel ? [["#f578ff", sel.label || sel.type]] : [])] : flowMode === "power" ? [["#36e8ff", "Input → output"]] : flowMode === "return" ? [["#ffb45e", "Ground return"]] : [["#f578ff", sel ? (sel.label || sel.type) + " path" : "Part select karo"]]).map(([c, n]) => <span key={n}><i style={{ background: c }} />{n}</span>)}</div>
              <small>Component locations AI estimate hain.</small>
            </div>}
            <button className="fullscreen-btn" onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); else viewEl.current?.requestFullscreen?.(); }}>{isFullscreen ? "✕ Exit full screen" : "⛶ Full screen"}</button>
            <div className="zoom"><button onClick={() => zoom(.7)}>+</button><button onClick={() => zoom(1.4)}>−</button><button onClick={() => { setSel(null); go(VIEWS.Iso); }}>⟲</button></div>
            <div className="hint">Drag = rotate · Right-drag = pan · Scroll = zoom · Part par tap = select</div>
          </div>
          <PhotoPane {...{ spec, photo, ar, setAr, sel, labels }} onPick={pick} />
        </div>
        <Wave part={sel} />
      </main>

      <aside className="panel">
        <div className="chips">{spec.parts.map((p, i) => <button key={i} className={sel === p ? "on" : ""} onClick={() => pick(p)}>{p.label || p.type}</button>)}</div>
        {sel && <div className="info"><b>{sel.label || sel.type}</b> · {sel.type}{sel.value ? " · " + sel.value : ""}<br />{sel.role}</div>}
        <div className="chat">
          {!msgs.length && <div className="m ai"><p>Namaste! Kuch bhi puchho: electronics ho ya is board ka koi part. Part select karke uske baare me puch sakte ho.</p></div>}
          {msgs.map((m, i) => <div key={i} className={"m " + (m.role === "user" ? "me" : "ai")}>{m.role === "user" ? m.content : <Md text={m.content} />}</div>)}
          {busy && <div className="m ai">…</div>}<div ref={chatEnd} />
        </div>
        <div className="inp"><button onClick={() => ask(FULL)}>Poora explain</button>
          <textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kuch bhi pucho…" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} />
          <button className="go" onClick={() => ask()}>Bhejo</button></div>
      </aside>

      <nav className="tabs">
        {[["view", "🧊 3D + Photo"], ["wave", "〰 Waveform"], ["tutor", "💬 Tutor"]].map(([k, n]) => <Btn key={k} on={tab === k} onClick={() => setTab(k)}>{n}</Btn>)}
      </nav>
    </div>
  );
}
