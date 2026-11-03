import React from "react";
import * as THREE from "three";
import { Edges } from "@react-three/drei";

/**
 * Procedural 3D Electronics Models with named child meshes:
 * - chip
 * - antenna
 * - pins
 * - heatsink
 * - terminal
 * - wheel
 * - pcb / body
 */

export function Esp32Model({ hovered, selected }) {
  return (
    <group>
      {/* Main PCB */}
      <mesh name="pcb" position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.2, 0.2, 2.8]} />
        <meshStandardMaterial color="#0f381e" roughness={0.4} metalness={0.1} />
        {(hovered || selected) && <Edges color={selected ? "#3b82f6" : "#60a5fa"} threshold={15} />}
      </mesh>

      {/* Metal RF Shield / Chip */}
      <mesh name="chip" position={[-0.3, 0.22, 0]} castShadow>
        <boxGeometry args={[1.8, 0.24, 1.8]} />
        <meshStandardMaterial color="#d1d5db" roughness={0.2} metalness={0.85} />
      </mesh>

      {/* PCB Trace Antenna */}
      <mesh name="antenna" position={[1.8, 0.12, 0]}>
        <boxGeometry args={[1.2, 0.04, 2.4]} />
        <meshStandardMaterial color="#b45309" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Micro USB / Type C Port */}
      <mesh name="usb" position={[-2.4, 0.22, 0]}>
        <boxGeometry args={[0.8, 0.3, 0.7]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.25} metalness={0.9} />
      </mesh>

      {/* Pin Headers along both long edges */}
      {[-1.2, 1.2].map((z, sideIdx) => (
        <group key={sideIdx} name="pins">
          {Array.from({ length: 15 }).map((_, i) => (
            <mesh key={i} position={[-2.1 + i * 0.3, -0.2, z]}>
              <cylinderGeometry args={[0.035, 0.035, 0.6, 8]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function ArduinoNanoModel({ hovered, selected }) {
  return (
    <group>
      {/* Cyan/Blue PCB */}
      <mesh name="pcb" position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.5, 0.2, 1.8]} />
        <meshStandardMaterial color="#005b5c" roughness={0.4} metalness={0.1} />
        {(hovered || selected) && <Edges color={selected ? "#3b82f6" : "#60a5fa"} threshold={15} />}
      </mesh>

      {/* ATmega328P Chip (45 degree rotated square) */}
      <mesh name="chip" position={[0.2, 0.16, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[0.9, 0.15, 0.9]} />
        <meshStandardMaterial color="#1f2937" roughness={0.3} />
      </mesh>

      {/* Mini USB Port */}
      <mesh name="usb" position={[-2.0, 0.22, 0]}>
        <boxGeometry args={[0.9, 0.32, 0.75]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* 16MHz Crystal */}
      <mesh name="crystal" position={[1.2, 0.15, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.6, 12]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Headers */}
      {[-0.8, 0.8].map((z, sideIdx) => (
        <group key={sideIdx} name="pins">
          {Array.from({ length: 15 }).map((_, i) => (
            <mesh key={i} position={[-2.1 + i * 0.3, -0.2, z]}>
              <cylinderGeometry args={[0.035, 0.035, 0.5, 8]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function Hc05Model({ hovered, selected }) {
  return (
    <group>
      {/* Blue Carrier Board */}
      <mesh name="pcb" position={[0, 0, 0]} castShadow>
        <boxGeometry args={[3.8, 0.16, 1.6]} />
        <meshStandardMaterial color="#102a6b" roughness={0.4} />
        {(hovered || selected) && <Edges color={selected ? "#3b82f6" : "#60a5fa"} threshold={15} />}
      </mesh>

      {/* Postage-Stamp Daughterboard */}
      <mesh name="chip" position={[0.4, 0.14, 0]}>
        <boxGeometry args={[2.4, 0.12, 1.4]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.3} />
      </mesh>

      {/* Meander PCB Antenna */}
      <mesh name="antenna" position={[1.4, 0.22, 0]}>
        <boxGeometry args={[0.35, 0.04, 1.1]} />
        <meshStandardMaterial color="#ca8a04" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* 6-Pin Right-Angle Header */}
      <group name="pins" position={[-1.7, 0, 0]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[0, 0.1, -0.625 + i * 0.25]}>
            <cylinderGeometry args={[0.035, 0.035, 0.45, 8]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Nrf24Model({ hovered, selected }) {
  return (
    <group>
      {/* Black PCB */}
      <mesh name="pcb" position={[0, 0, 0]} castShadow>
        <boxGeometry args={[4.1, 0.18, 1.6]} />
        <meshStandardMaterial color="#111827" roughness={0.5} />
        {(hovered || selected) && <Edges color={selected ? "#3b82f6" : "#60a5fa"} threshold={15} />}
      </mesh>

      {/* Metal RF Shield */}
      <mesh name="chip" position={[-0.2, 0.2, 0]}>
        <boxGeometry args={[1.5, 0.22, 1.2]} />
        <meshStandardMaterial color="#e5e7eb" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Gold SMA Connector */}
      <mesh position={[1.8, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
        <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* High-gain Rubber Duck Antenna */}
      <mesh name="antenna" position={[3.2, 1.2, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.18, 0.12, 2.8, 16]} />
        <meshStandardMaterial color="#1f2937" roughness={0.7} />
      </mesh>

      {/* 2x4 Header pins */}
      <group name="pins" position={[-1.2, 0.2, 0]}>
        {[-0.3, 0.3].map((z, r) =>
          Array.from({ length: 4 }).map((_, c) => (
            <mesh key={`${r}-${c}`} position={[-0.6 + c * 0.4, 0.15, z]}>
              <cylinderGeometry args={[0.035, 0.035, 0.4, 8]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
            </mesh>
          ))
        )}
      </group>
    </group>
  );
}

export function LoraModel({ hovered, selected }) {
  return (
    <group>
      {/* Green Ra-02 PCB */}
      <mesh name="pcb" position={[0, 0, 0]} castShadow>
        <boxGeometry args={[2.5, 0.16, 2.0]} />
        <meshStandardMaterial color="#064e3b" roughness={0.4} />
        {(hovered || selected) && <Edges color={selected ? "#3b82f6" : "#60a5fa"} threshold={15} />}
      </mesh>

      {/* Ra-02 Shield */}
      <mesh name="chip" position={[0, 0.16, 0]}>
        <boxGeometry args={[1.6, 0.18, 1.4]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Helical Spring Coil Antenna */}
      <mesh name="antenna" position={[0.9, 0.6, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 1.0, 16]} />
        <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Pins along both sides */}
      {[-0.8, 0.8].map((z, sideIdx) => (
        <group key={sideIdx} name="pins">
          {Array.from({ length: 4 }).map((_, i) => (
            <mesh key={i} position={[-0.6 + i * 0.4, -0.15, z]}>
              <cylinderGeometry args={[0.035, 0.035, 0.4, 8]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function L298nModel({ hovered, selected }) {
  return (
    <group>
      {/* Red PCB */}
      <mesh name="pcb" position={[0, 0, 0]} castShadow>
        <boxGeometry args={[4.3, 0.22, 4.3]} />
        <meshStandardMaterial color="#991b1b" roughness={0.4} />
        {(hovered || selected) && <Edges color={selected ? "#3b82f6" : "#60a5fa"} threshold={15} />}
      </mesh>

      {/* Black Finned Heatsink */}
      <group name="heatsink" position={[0, 1.0, -0.6]}>
        <mesh castShadow>
          <boxGeometry args={[3.2, 1.8, 0.4]} />
          <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Fins */}
        {[-1.2, -0.6, 0, 0.6, 1.2].map((x, i) => (
          <mesh key={i} position={[x, 0, 0.4]}>
            <boxGeometry args={[0.12, 1.8, 0.6]} />
            <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Screw Terminals (Motor A, Power, Motor B) */}
      <mesh name="terminal" position={[-1.8, 0.4, 0]}>
        <boxGeometry args={[0.6, 0.6, 1.4]} />
        <meshStandardMaterial color="#0284c7" roughness={0.5} />
      </mesh>
      <mesh name="terminal" position={[1.8, 0.4, 0]}>
        <boxGeometry args={[0.6, 0.6, 1.4]} />
        <meshStandardMaterial color="#0284c7" roughness={0.5} />
      </mesh>
      <mesh name="terminal" position={[-1.1, 0.4, 1.8]}>
        <boxGeometry args={[1.5, 0.6, 0.6]} />
        <meshStandardMaterial color="#0284c7" roughness={0.5} />
      </mesh>

      {/* Filter Capacitor */}
      <mesh position={[1.2, 0.6, -1.2]}>
        <cylinderGeometry args={[0.4, 0.4, 1.0, 16]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.4} />
      </mesh>

      {/* 6-Pin Logic Control Header */}
      <group name="pins" position={[1.0, 0.3, 1.8]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[-0.7 + i * 0.3, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.4, 8]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function DcMotorModel({ hovered, selected }) {
  return (
    <group>
      {/* Yellow Gearbox Box */}
      <mesh name="body" position={[-0.5, 0, 0]} castShadow>
        <boxGeometry args={[3.2, 1.8, 2.2]} />
        <meshStandardMaterial color="#eab308" roughness={0.4} />
        {(hovered || selected) && <Edges color={selected ? "#3b82f6" : "#60a5fa"} threshold={15} />}
      </mesh>

      {/* Metal DC Motor Cylinder */}
      <mesh name="motor" position={[-2.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.8, 0.8, 1.8, 20]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Solder Lug Terminals */}
      <group name="pins" position={[-3.3, 0, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.4, 0.1, 0.2]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.4, 0.1, 0.2]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Output Shaft + Wheel */}
      <group name="wheel" position={[1.5, 0, 0]}>
        {/* Shaft */}
        <mesh position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.8, 12]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.8} />
        </mesh>
        {/* Yellow Wheel Rim */}
        <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.6, 1.6, 0.8, 24]} />
          <meshStandardMaterial color="#eab308" roughness={0.5} />
        </mesh>
        {/* Black Rubber Tire */}
        <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[1.5, 0.32, 16, 32]} />
          <meshStandardMaterial color="#111827" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

export function BatteryModel({ hovered, selected }) {
  return (
    <group>
      {/* Dual 18650 Pack */}
      <group name="body">
        {[-0.9, 0.9].map((z, i) => (
          <mesh key={i} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.85, 0.85, 6.5, 24]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} />
          </mesh>
        ))}
        {/* Heat shrink band */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[4.5, 1.8, 3.6]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
          {(hovered || selected) && <Edges color={selected ? "#3b82f6" : "#60a5fa"} threshold={15} />}
        </mesh>
      </group>

      {/* Red & Black Leads with Plug */}
      <group name="pins" position={[3.2, 0.4, 0]}>
        <mesh position={[0.4, 0, 0.6]}>
          <cylinderGeometry args={[0.08, 0.08, 1.2, 12]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#ef4444" roughness={0.3} />
        </mesh>
        <mesh position={[0.4, 0, -0.6]}>
          <cylinderGeometry args={[0.08, 0.08, 1.2, 12]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#111827" roughness={0.5} />
        </mesh>
        {/* JST/XT60 Connector plug */}
        <mesh position={[1.2, 0, 0]}>
          <boxGeometry args={[0.7, 0.5, 1.5]} />
          <meshStandardMaterial color="#eab308" roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

export function BuckConverterModel({ hovered, selected }) {
  return (
    <group>
      {/* Blue PCB */}
      <mesh name="pcb" position={[0, 0, 0]} castShadow>
        <boxGeometry args={[4.3, 0.2, 2.1]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.4} />
        {(hovered || selected) && <Edges color={selected ? "#3b82f6" : "#60a5fa"} threshold={15} />}
      </mesh>

      {/* LM2596 IC with Heat Tab */}
      <mesh name="chip" position={[-0.8, 0.3, 0]}>
        <boxGeometry args={[1.0, 0.35, 1.0]} />
        <meshStandardMaterial color="#1f2937" roughness={0.3} />
      </mesh>

      {/* Large Round Inductor / Choke */}
      <mesh position={[0.6, 0.5, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 0.7, 20]} />
        <meshStandardMaterial color="#111827" roughness={0.4} />
      </mesh>

      {/* Blue Multi-Turn Potentiometer with Brass Screw */}
      <group position={[-0.8, 0.5, 0.6]}>
        <mesh>
          <boxGeometry args={[0.9, 0.7, 0.4]} />
          <meshStandardMaterial color="#2563eb" roughness={0.4} />
        </mesh>
        <mesh position={[0.3, 0.4, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.15, 12]} />
          <meshStandardMaterial color="#eab308" metalness={0.9} />
        </mesh>
      </group>

      {/* Input / Output Capacitors */}
      <mesh position={[-1.7, 0.4, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.8} />
      </mesh>
      <mesh position={[1.7, 0.4, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.8} />
      </mesh>

      {/* Solder Pads at Corners */}
      <group name="pins">
        {[
          [-1.9, 0.7],
          [-1.9, -0.7],
          [1.9, 0.7],
          [1.9, -0.7]
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.12, z]}>
            <cylinderGeometry args={[0.18, 0.18, 0.05, 12]} />
            <meshStandardMaterial color="#e5e7eb" metalness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function ServoModel({ hovered, selected }) {
  return (
    <group>
      {/* Translucent Blue Casing */}
      <mesh name="body" position={[0, 0, 0]} castShadow>
        <boxGeometry args={[2.3, 2.6, 1.2]} />
        <meshStandardMaterial color="#2563eb" roughness={0.3} transparent opacity={0.92} />
        {(hovered || selected) && <Edges color={selected ? "#3b82f6" : "#60a5fa"} threshold={15} />}
      </mesh>

      {/* Mounting Flanges */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[3.2, 0.2, 1.2]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.4} />
      </mesh>

      {/* Output Spline + White Servo Horn */}
      <group name="horn" position={[-0.5, 1.5, 0]}>
        <mesh>
          <cylinderGeometry args={[0.25, 0.25, 0.3, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
        {/* Double Arm Horn */}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[1.8, 0.1, 0.35]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
      </group>

      {/* 3-Wire Cable */}
      <group name="pins" position={[1.1, -1.0, 0]}>
        {[-0.2, 0, 0.2].map((z, i) => (
          <mesh key={i} position={[0.4, 0, z]}>
            <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color={i === 0 ? "#78350f" : i === 1 ? "#ef4444" : "#f97316"} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function UltrasonicModel({ hovered, selected }) {
  return (
    <group>
      {/* Cyan/Blue PCB */}
      <mesh name="pcb" position={[0, 0, 0]} castShadow>
        <boxGeometry args={[4.5, 2.0, 0.2]} />
        <meshStandardMaterial color="#0284c7" roughness={0.4} />
        {(hovered || selected) && <Edges color={selected ? "#3b82f6" : "#60a5fa"} threshold={15} />}
      </mesh>

      {/* Two Silver Ultrasonic Transducer Cylinders */}
      <group name="transducer">
        {[-1.2, 1.2].map((x, i) => (
          <group key={i} position={[x, 0, 0.7]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.75, 0.75, 1.2, 24]} />
              <meshStandardMaterial color="#e5e7eb" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* Mesh screen */}
            <mesh position={[0, 0, 0.61]}>
              <circleGeometry args={[0.65, 24]} />
              <meshStandardMaterial color="#475569" roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Crystal Oscillator */}
      <mesh name="crystal" position={[0, 0.6, 0.2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 12]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.9} />
      </mesh>

      {/* 4-Pin Right Angle Header */}
      <group name="pins" position={[0, -1.0, 0.3]}>
        {Array.from({ length: 4 }).map((_, i) => (
          <mesh key={i} position={[-0.6 + i * 0.4, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.4, 8]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Fallback Generic Procedural Shape for any arbitrary component
export function GenericBoxModel({ comp, hovered, selected }) {
  const [w, h, d] = comp.size || [3, 1, 3];
  return (
    <group>
      <mesh name="pcb" position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#334155" roughness={0.4} />
        {(hovered || selected) && <Edges color={selected ? "#3b82f6" : "#60a5fa"} threshold={15} />}
      </mesh>
      <mesh name="chip" position={[0, h + 0.1, 0]}>
        <boxGeometry args={[w * 0.4, 0.2, d * 0.4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} />
      </mesh>
    </group>
  );
}

export const PROCEDURAL_MODELS = {
  esp32_wroom_32: Esp32Model,
  arduino_nano: ArduinoNanoModel,
  hc05_bluetooth: Hc05Model,
  nrf24l01_pa_lna: Nrf24Model,
  lora_sx1278: LoraModel,
  l298n_motor_driver: L298nModel,
  dc_gear_motor: DcMotorModel,
  lipo_2s_battery: BatteryModel,
  buck_lm2596: BuckConverterModel,
  servo_sg90: ServoModel,
  ultrasonic_hcsr04: UltrasonicModel
};
