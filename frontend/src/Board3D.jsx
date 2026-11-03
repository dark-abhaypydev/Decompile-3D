import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, Canvas } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport, Html, Line, Edges } from "@react-three/drei";

const H = { usb_c: 3.2, inductor: 4, ic: 1.4, resistor: .6, capacitor: .8, cap_electrolytic: 5, diode: 1, led: .7, pad: .15, connector: 5, transistor: 2, crystal: 1.5, button: 3, antenna: .4, other: 1.5 };
export const C = { usb_c: "#b9bcc2", inductor: "#7c7d82", ic: "#16161a", resistor: "#15151a", capacitor: "#b48a52", cap_electrolytic: "#2a2f6a", diode: "#1c1c20", led: "#e9efe9", pad: "#cfd1d6", connector: "#222226", transistor: "#1a1a1a", crystal: "#c0c0c8", button: "#33353a", antenna: "#c9a227", other: "#666a70" };
const METAL = new Set(["usb_c", "crystal", "pad"]);
const TOP = 0.8, BW = 30;
const HOLO_VERTEX = `
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vWorld;
void main() {
  vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = -viewPos.xyz;
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * viewPos;
}`;
const HOLO_FRAGMENT = `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vWorld;
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.15);
  float scan = 0.5 + 0.5 * sin(vWorld.z * 115.0 - uTime * 10.0);
  float raster = smoothstep(0.92, 1.0, scan);
  float flicker = 0.90 + 0.10 * sin(uTime * 19.0 + vWorld.x * 2.0);
  float hash = fract(sin(dot(floor(vWorld.xz * 34.0), vec2(12.9898, 78.233)) + floor(uTime * 7.0)) * 43758.5453);
  float glitch = step(0.994, hash);
  vec3 cyan = vec3(0.08, 0.72, 1.0);
  vec3 glow = vec3(0.38, 0.96, 1.0);
  vec3 color = mix(cyan, glow, clamp(rim * 0.8 + raster * 0.38 + glitch, 0.0, 1.0));
  float alpha = (0.18 + rim * 0.48 + raster * 0.16 + glitch * 0.28) * flicker;
  gl_FragColor = vec4(color * (0.68 + rim * 1.55 + raster * 0.46 + glitch), alpha);
}`;

function HologramMaterial() {
  const ref = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame(({ clock }) => { if (ref.current) ref.current.uniforms.uTime.value = clock.elapsedTime; });
  return <shaderMaterial ref={ref} uniforms={uniforms} vertexShader={HOLO_VERTEX} fragmentShader={HOLO_FRAGMENT} transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />;
}

function HoloScan({ d }) {
  const ref = useRef();
  useFrame(({ clock }) => { if (ref.current) ref.current.position.z = -d.BH / 2 + ((clock.elapsedTime * 1.15) % d.BH); });
  return <mesh ref={ref} position={[0, TOP + .11, -d.BH / 2]}><boxGeometry args={[d.BW * 1.015, .018, .09]} /><meshBasicMaterial color="#55efff" transparent opacity={.8} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>;
}

export const dims = (spec) => ({ BW, BH: Math.max(12, Math.min(60, BW / Math.max(0.4, Math.min(2.5, +spec?.board?.aspect || 1)))) });
export const posOf = (p, d) => [(p.x / 100 - 0.5) * d.BW, 0, (p.y / 100 - 0.5) * d.BH];

function BoardDetails({ d, mode }) {
  const holo = mode === "holo";
  const edge = holo ? "#39dfff" : mode === "light" ? "#8b9eaa" : "#52605d";
  const metal = holo ? "#52eaff" : "#c99c60";
  const holes = [[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,z]) => [x*(d.BW/2-1.2), z*(d.BH/2-1.2)]);
  return <group>
    {/* Laminated PCB edge bands give the board a visible substrate stack. */}
    <mesh position={[0,-.84,0]}><boxGeometry args={[d.BW-.24,.12,d.BH-.24]} /><meshStandardMaterial color={holo ? "#07394b" : mode === "light" ? "#b4c1bd" : "#182c25"} metalness={.32} roughness={.52} /></mesh>
    <mesh position={[0,-.93,0]}><boxGeometry args={[d.BW-.5,.055,d.BH-.5]} /><meshStandardMaterial color={holo ? "#0c5365" : "#bd8e4e"} metalness={.7} roughness={.3} emissive={holo ? "#087b91" : "#000000"} emissiveIntensity={holo ? .55 : 0} /></mesh>
    {holes.map(([x,z],i) => <group key={i} position={[x,.815,z]}>
      <mesh><cylinderGeometry args={[.72,.72,.035,32]} /><meshStandardMaterial color={metal} metalness={.94} roughness={.2} emissive={holo ? metal : "#000000"} emissiveIntensity={holo ? .45 : 0} /></mesh>
      <mesh position={[0,.025,0]}><cylinderGeometry args={[.43,.43,.045,32]} /><meshStandardMaterial color={holo ? "#041923" : mode === "light" ? "#7e8985" : "#101211"} metalness={.2} roughness={.65} /></mesh>
    </group>)}
    <Line points={[[-d.BW/2+.55,.815,-d.BH/2+.55],[d.BW/2-.55,.815,-d.BH/2+.55],[d.BW/2-.55,.815,d.BH/2-.55],[ -d.BW/2+.55,.815,d.BH/2-.55],[-d.BW/2+.55,.815,-d.BH/2+.55]]} color={holo ? "#36dffb" : mode === "light" ? "#7eab9b" : "#45685b"} lineWidth={1} transparent opacity={.7} />
  </group>;
}

function Part({ p, d, sel, onPick, labels, mode }) {
  const body = useRef();
  useFrame(({ clock }) => { if (mode === "holo" && body.current) body.current.material.emissiveIntensity = .48 + .35 * (Math.sin(clock.elapsedTime * 2.4 + p.x * .1 + p.y * .1) + 1) / 2; });
  const T = H[p.type] ? p.type : "other", h = H[T];
  const sw = Math.max(1, (+p.w || 5) / 100 * d.BW), sd = Math.max(1, (+p.h || 5) / 100 * d.BH);
  const round = T === "pad" || T === "cap_electrolytic", r = Math.min(sw, sd) / 2, text = p.value || p.label;
  const joints = p.type === "hole" || p.type === "pad" ? [] : T === "ic"
    ? Array.from({ length: 8 }, (_, i) => ({ x: ((i % 4) / 3 - .5) * sw * .72, z: (i < 4 ? -1 : 1) * (sd / 2 + .14), axis: "z" }))
    : ["resistor", "capacitor", "cap_electrolytic", "diode", "led", "crystal"].includes(T)
      ? [-1, 1].map((side) => ({ x: side * (sw / 2 + .16), z: 0, axis: "x" }))
      : [-1, 1].flatMap((x) => [-1, 1].map((z) => ({ x: x * (sw / 2 + .08), z: z * (sd / 2 + .08), axis: "corner" })));
  return (
    <group position={posOf(p, d)} onClick={(e) => { e.stopPropagation(); onPick(p); }}>
      {p.type === "hole" ? (
        <mesh><cylinderGeometry args={[r * .6, r * .6, 1.7, 28]} /><meshBasicMaterial color="#2a2a2e" /></mesh>
      ) : (
        <>
          {/* SMD footprint / socket beneath each body adds a board-level contact shadow and depth. */}
          <mesh position={[0,TOP+.035,0]}>
            {round ? <cylinderGeometry args={[r*1.13,r*1.13,.07,28]} /> : <boxGeometry args={[sw*1.12,.07,sd*1.12]} />}
            <meshStandardMaterial color={mode === "holo" ? "#0c5664" : mode === "light" ? "#d7dfd8" : "#26342e"} metalness={.28} roughness={.68} />
          </mesh>
          {sel && <mesh position={[0,TOP+.085,0]} rotation={[-Math.PI/2,0,0]}>
            <ringGeometry args={[Math.max(sw,sd)*.68,Math.max(sw,sd)*.76,48]} />
            <meshBasicMaterial color={mode === "holo" ? "#6ff6ff" : "#3979ff"} transparent opacity={.88} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>}
          <mesh ref={body} position={[0, TOP + h / 2, 0]} castShadow>
            {round ? <cylinderGeometry args={[r, r, h, 32]} /> : <boxGeometry args={[sw, h, sd]} />}
            {mode === "holo" ? <HologramMaterial /> : <meshStandardMaterial color={C[T]} metalness={METAL.has(T) ? .85 : .15} roughness={T === "ic" ? .24 : .4} emissive={sel ? "#2255ff" : T === "led" ? "#00aa33" : "#000000"} emissiveIntensity={sel ? .8 : .6} />}
            {mode === "holo" && <Edges scale={1.006} threshold={12} color="#67f4ff" />}
          </mesh>
        </>
      )}
      {joints.map((j, i) => <group key={"joint" + i} position={[j.x, 0, j.z]}>
        <mesh position={[0, TOP + .035, 0]}><cylinderGeometry args={[.16, .16, .07, 16]} /><meshStandardMaterial color={mode === "holo" ? "#b7fbff" : "#d89b4c"} metalness={.88} roughness={.22} emissive={mode === "holo" ? "#27ddff" : "#000000"} emissiveIntensity={mode === "holo" ? .5 : 0} /></mesh>
        <mesh position={[j.axis === "x" ? -Math.sign(j.x) * .07 : 0, TOP + .13, j.axis === "z" ? -Math.sign(j.z) * .07 : 0]}><boxGeometry args={j.axis === "x" ? [.28, .1, .09] : [.09, .1, .28]} /><meshStandardMaterial color="#b9c4c9" metalness={.9} roughness={.24} /></mesh>
      </group>)}
      {T === "ic" && [-1.5, -.5, .5, 1.5].flatMap((i) => [-1, 1].map((s) => (
        <mesh key={i + "," + s} position={[i * sw / 4.2, TOP + .2, s * (sd / 2 + .3)]}><boxGeometry args={[.6, .35, 1.2]} /><meshStandardMaterial color="#c9c9cf" metalness={.9} roughness={.3} /></mesh>)))}
      {labels && text && p.type !== "hole" && <Html position={[0, TOP + h + .8, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}><span className="tag">{text}</span></Html>}
    </group>
  );
}

// camera ko smoothly goal tak le jaata hai (view buttons, zoom, part focus)
function Rig({ goal, ctl }) {
  const { camera } = useThree();
  useFrame(() => {
    const g = goal.current, c = ctl.current;
    if (!g || !c) return;
    camera.position.lerp(g.pos, .1); c.target.lerp(g.tgt, .1); c.update();
    if (camera.position.distanceTo(g.pos) < .05 && c.target.distanceTo(g.tgt) < .05) goal.current = null;
  });
  return null;
}

function makeFlows(spec, d, flowMode, sel) {
  const find = (fn) => spec.parts.find(fn);
  const input = find((p) => p.type === "usb_c" || p.type === "connector") || spec.parts[0];
  const ic = find((p) => p.type === "ic") || input;
  const coil = find((p) => p.type === "inductor") || ic;
  const output = find((p) => p.type === "pad" && /B\+/i.test(p.label || "")) || find((p) => p.type === "pad") || coil;
  const coords = (parts, lane = 0) => {
    const raw = parts.filter(Boolean).map((p) => { const [x, , z] = posOf(p, d); return [x, TOP + .13, z + lane]; });
    const points = raw.filter((p, i) => i === 0 || Math.hypot(p[0] - raw[i - 1][0], p[2] - raw[i - 1][2]) > .01);
    if (points.length < 2) return points;
    const routed = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (Math.abs(b[0] - a[0]) >= Math.abs(b[2] - a[2])) { const x = (a[0] + b[0]) / 2; routed.push([x, a[1], a[2]], [x, b[1], b[2]]); }
      else { const z = (a[2] + b[2]) / 2; routed.push([a[0], a[1], z], [b[0], b[1], z]); }
      routed.push(b);
    }
    return routed;
  };
  const power = { id: "power", name: "Input → converter → output", color: "#36e8ff", points: coords([input, ic, coil, output], -.24) };
  const back = { id: "return", name: "Ground return (illustrative)", color: "#ffb45e", points: coords([output, ic, input], .24) };
  const selected = sel && sel.type !== "hole" ? { id: "selected", name: (sel.label || sel.type) + " path", color: "#f578ff", points: coords([input, sel, output]) } : null;
  if (flowMode === "power") return [power].filter((r) => r.points.length > 1);
  if (flowMode === "return") return [back].filter((r) => r.points.length > 1);
  if (flowMode === "component") return selected && selected.points.length > 1 ? [selected] : [];
  return [power, back, ...(selected ? [selected] : [])].filter((r) => r.points.length > 1);
}

function FlowTrack({ route }) {
  const dots = useRef([]);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(route.points.map((p) => new THREE.Vector3(...p))), [route.points]);
  useFrame(({ clock }) => { dots.current.forEach((dot, i) => { if (dot) dot.position.copy(curve.getPointAt((clock.elapsedTime * .12 + i / 3) % 1)); }); });
  return <group><Line points={curve.getPoints(72)} color={route.color} lineWidth={8} transparent opacity={.18} />
    <Line points={curve.getPoints(72)} color={route.color} lineWidth={2.4} transparent opacity={1} />
    {[0, 1, 2].map((i) => <group key={i} ref={(el) => { dots.current[i] = el; }}><mesh><sphereGeometry args={[.23, 16, 16]} /><meshBasicMaterial color={route.color} /></mesh><mesh scale={1.8}><sphereGeometry args={[.23, 16, 16]} /><meshBasicMaterial color={route.color} transparent opacity={.22} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh></group>)}</group>;
}

export default function Board3D({ spec, sel, onPick, labels, axis, goal, ctl, auto, mode, flowOn, flowMode }) {
  const d = dims(spec);
  const routes = useMemo(() => makeFlows(spec, d, flowMode, sel), [spec, d.BW, d.BH, flowMode, sel]);
  return (
    <Canvas camera={{ position: [0, 28, 40], fov: 40 }} onPointerMissed={(e) => { if (e?.type === "click") onPick(null); }}>
      <color attach="background" args={[mode === "holo" ? "#061923" : mode === "light" ? "#e8edf0" : "#111715"]} />
      <fog attach="fog" args={[mode === "holo" ? "#061923" : mode === "light" ? "#e8edf0" : "#111715", 72, 150]} />
      <hemisphereLight args={[mode === "holo" ? "#8befff" : "#ffffff", mode === "holo" ? "#06323d" : "#555566", 1.15]} />
      <directionalLight position={[20, 40, 15]} intensity={1.05} />
      <directionalLight position={[-18, 16, -12]} intensity={mode === "holo" ? 1.1 : .45} color={mode === "holo" ? "#39dfff" : "#d4e5ff"} />
      <mesh receiveShadow><boxGeometry args={[d.BW, 1.6, d.BH]} />{mode === "holo" ? <HologramMaterial /> : <meshStandardMaterial color={mode === "light" ? "#dce7e2" : "#17382d"} metalness={mode === "light" ? .28 : .4} roughness={.48} />} {mode === "holo" && <Edges scale={1.002} threshold={10} color="#43dcff" />}</mesh>
      <BoardDetails d={d} mode={mode} />
      {mode === "holo" && <gridHelper args={[d.BW, 24, "#27cbee", "#0c6384"]} position={[0, TOP + .018, 0]} scale={[1, 1, d.BH / d.BW]} />}
      {spec.parts.map((p, i) => <Part key={i} p={p} d={d} sel={sel === p} onPick={onPick} labels={labels} mode={mode} />)}
      {mode === "holo" && <HoloScan d={d} />}
      {flowOn && routes.map((route) => <FlowTrack key={route.id} route={route} />)}
      {axis && <axesHelper args={[8]} position={[-d.BW / 2 - 3, TOP, d.BH / 2 + 3]} />}
      <OrbitControls ref={ctl} makeDefault enableDamping dampingFactor={.075} autoRotate={auto && !sel} autoRotateSpeed={.72} minDistance={8} maxDistance={140} onStart={() => (goal.current = null)} />
      <Rig goal={goal} ctl={ctl} />
      <GizmoHelper alignment="bottom-left" margin={[70, 70]}><GizmoViewport axisColors={["#ff4444", "#33cc55", "#4488ff"]} labelColor="white" /></GizmoHelper>
    </Canvas>
  );
}
