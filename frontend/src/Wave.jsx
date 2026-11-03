import { useEffect, useRef } from "react";

const T = Math.PI * 2, fr = (x) => x - Math.floor(x), sn = (x) => Math.sin(x * T);
const sq = (x, d = .5) => (fr(x) < d ? 1 : -1);
const ramp = (x, d) => { const f = fr(x); return f < d ? -1 + 2 * f / d : 1 - 2 * (f - d) / (1 - d); };
const bit = (x) => fr(Math.sin(Math.floor(x) * 12.9898) * 43758.5453) > .5 ? 1 : -1;
const V = "#4cc9f0", I = "#ffb703", G = "#7bd88f";

// har type: t = title, n = kaam ka explanation, cyc = screen par kitne cycle, tr = [naam, color, fn(phase)] (-1..1)
export const WAVES = {
  usb_c: { t: "USB-C VBUS: 5V DC input", n: "Cable se 5V DC aata hai: lagbhag seedhi line (thoda noise). Load badhne par current steps me badhta hai.", cyc: 3,
    tr: [["V 5V DC", V, (x) => .55 + .02 * sn(x * 8)], ["I (load)", I, (x) => -.3 + .5 * (sq(x / 2, .6) + 1) / 2]] },
  inductor: { t: "Inductor: current triangle ramp", n: "Switch ON me current ramp-up (energy store), OFF me ramp-down (energy release). Isi se voltage boost/buck hota hai.", cyc: 3,
    tr: [["V switch node", V, (x) => .7 * sq(x, .4)], ["I inductor", I, (x) => .6 * ramp(x, .4)]] },
  ic: { t: "Controller IC: PWM switching", n: "IC fast ON/OFF (PWM) pulses banata hai; feedback dekh kar duty cycle adjust karke output voltage fixed rakhta hai.", cyc: 5,
    tr: [["PWM out", V, (x) => .7 * sq(x, .35)], ["Feedback (FB)", I, (x) => .1 + .05 * sn(x)]] },
  resistor: { t: "Resistor: V aur I same shape", n: "Ohm's law I = V/R: voltage jaisa badle, current bhi waisa hi badalta hai (same phase), bas chhota/bada scale.", cyc: 2,
    tr: [["V", V, (x) => .8 * sn(x)], ["I = V/R", I, (x) => .4 * sn(x)]] },
  capacitor: { t: "Capacitor: ripple smooth karta hai", n: "Ripple wala input (cyan) cap ke baad lagbhag flat DC ban jata hai (orange).", cyc: 3,
    tr: [["Ripple input", V, (x) => Math.abs(sn(x)) * .9 - .3], ["Cap ke baad", I, (x) => .3 + .06 * sn(x * 2 + .3)]] },
  cap_electrolytic: { t: "Electrolytic cap: bulk filtering", n: "Bada capacitance = zyada energy store, isliye ripple bahut kam ho jata hai.", cyc: 3,
    tr: [["Ripple input", V, (x) => Math.abs(sn(x)) * .9 - .3], ["Cap ke baad", I, (x) => .3 + .02 * sn(x * 2 + .3)]] },
  diode: { t: "Diode: sirf ek taraf current", n: "Positive half me conduct karta hai, negative half block: current ka waveform half-wave ban jata hai.", cyc: 2,
    tr: [["V in (AC)", V, (x) => .8 * sn(x)], ["I (sirf forward)", I, (x) => Math.max(0, sn(x)) * .8 - .1]] },
  led: { t: "LED: steady forward current", n: "Resistor current limit karta hai; ON me LED par ~2V (Vf) aur fixed current, OFF me zero.", cyc: 2,
    tr: [["V (Vf ~2V)", V, (x) => (sq(x, .7) > 0 ? .3 : -.8)], ["I (limited)", I, (x) => (sq(x, .7) > 0 ? .5 : -.8)]] },
  pad: { t: "Battery pad: charge profile (CC → CV)", n: "Pehle constant current (voltage dheere badhta), phir constant voltage (current ghatta jata hai) jab battery bhar jati hai.", cyc: 1, sp: .15,
    tr: [["V battery", V, (x) => { const f = fr(x); return f < .6 ? -.4 + .9 * f / .6 : .5; }], ["I charge", I, (x) => { const f = fr(x); return f < .6 ? .6 : -.7 + 1.3 * Math.exp(-6 * (f - .6) / .4); }]] },
  ntc: { t: "NTC thermistor: temperature sensing", n: "Temperature badhne par resistance ghatta hai; charger isi se battery ka garam hona pakadta hai.", cyc: 1, sp: .15,
    tr: [["R (NTC)", V, (x) => .7 * Math.exp(-2 * fr(x)) - .1], ["Temp", I, (x) => -.6 + 1.1 * fr(x)]] },
  transistor: { t: "Transistor: switch / amplifier", n: "Chhota base signal bade collector current ko control karta hai; output ulta (inverted) aur bada hota hai.", cyc: 3,
    tr: [["Base in", V, (x) => .3 * sq(x)], ["Collector out", I, (x) => -.8 * sq(x)]] },
  crystal: { t: "Crystal: stable clock", n: "Power milte hi oscillation shuru, phir ek fixed frequency par stable sine, jo IC ko clock deta hai.", cyc: 2, sp: .3,
    tr: [["Oscillation", G, (x) => (1 - Math.exp(-3 * fr(x / 2))) * .8 * sn(x * 8)]] },
  connector: { t: "Connector: differential data", n: "D+ aur D- ek dusre ke ulte hote hain (differential), isse noise ka asar kam hota hai.", cyc: 6,
    tr: [["D+", V, (x) => .6 * bit(x)], ["D-", I, (x) => -.6 * bit(x)]] },
  button: { t: "Button: press aur contact bounce", n: "Dabane par contact kuch ms bounce karta hai, phir line LOW (pull-up high se). Chhodne par wapas HIGH.", cyc: 1, sp: .25,
    tr: [["Pin voltage", V, (x) => { const f = fr(x); return f < .1 ? .7 : f < .2 ? .7 * sq(f * 70) : f < .7 ? -.7 : f < .78 ? .7 * sq(f * 70) : .7; }]] },
  antenna: { t: "Antenna: modulated RF signal", n: "Tez carrier wave (cyan) par data envelope (orange) chadha hota hai; antenna ise hawa me bhejta ya pakadta hai.", cyc: 2, sp: .3,
    tr: [["Carrier (RF)", V, (x) => (.5 + .4 * sn(x)) * sn(x * 14) * .9], ["Envelope (data)", I, (x) => .5 + .4 * sn(x) - .1]] },
  hole: { t: "Mounting hole", n: "Sirf screw ke liye hai, isme koi electrical signal nahi hota.", cyc: 1, tr: [] },
  other: { t: "Generic signal", n: "Is part ka exact function pata nahi, isliye ek general signal dikha rahe hain.", cyc: 2, tr: [["Signal", V, (x) => .6 * sn(x)]] },
};

export default function Wave({ part }) {
  const ref = useRef();
  const key = !part ? "usb_c" : part.type === "pad" && /ntc/i.test(part.label || "") ? "ntc" : WAVES[part.type] ? part.type : "other";
  const w = WAVES[key];
  useEffect(() => {
    const c = ref.current, g = c.getContext("2d"), t0 = performance.now(); let raf;
    const loop = (now) => {
      const d = devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
      if (W <= 0 || H <= 0) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (c.width !== Math.round(W * d) || c.height !== Math.round(H * d)) { c.width = Math.round(W * d); c.height = Math.round(H * d); }
      g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
      g.strokeStyle = "#2b2b28"; g.lineWidth = 1; g.beginPath();
      for (let i = 1; i < 8; i++) { g.moveTo(W * i / 8, 0); g.lineTo(W * i / 8, H); }
      for (let j = 1; j < 4; j++) { g.moveTo(0, H * j / 4); g.lineTo(W, H * j / 4); }
      g.stroke();
      const t = (now - t0) / 1000 * (w.sp || .5);
      if (!w.tr.length) { g.strokeStyle = "#555"; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); }
      w.tr.forEach(([, col, f]) => {
        g.strokeStyle = col; g.lineWidth = 2; g.beginPath();
        for (let x = 0; x <= W; x += 2) { const y = H / 2 - f(x / W * w.cyc + t) * H * .42; x ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [key]);
  return (
    <section className="wave">
      <div className="wh"><b>{part ? (part.label || part.type) : "Overview"} · {w.t}</b>
        <span className="lg">{w.tr.map(([n, c]) => <span key={n}><i style={{ background: c }} />{n}</span>)}</span></div>
      <canvas ref={ref} />
      <p>{part ? w.n : "Kisi component par tap karo (3D ya photo me), uski waveform yahan dikhegi. Abhi: board ka power input."}</p>
    </section>
  );
}
