import React, { useState, useRef, useMemo, Suspense } from "react";
import * as THREE from "three";
import { useGLTF, Html } from "@react-three/drei";
import { PROCEDURAL_MODELS, GenericBoxModel } from "./ProceduralShapes.jsx";

// Pin signal color mapping
export const PIN_SIGNAL_COLORS = {
  power: "#ef4444",   // Red
  gnd: "#374151",     // Dark Gray/Black
  digital: "#3b82f6", // Blue
  analog: "#8b5cf6",  // Violet
  uart: "#f97316",    // Orange
  spi: "#06b6d4",     // Cyan
  i2c: "#f59e0b",     // Amber
  pwm: "#10b981"      // Emerald Green
};

// Safe GLB Loader wrapper
function GlbLoader({ path, hovered, selected }) {
  const gltf = useGLTF(path);
  const cloned = useMemo(() => gltf.scene.clone(true), [gltf]);
  return <primitive object={cloned} />;
}

export default function ComponentModel({
  comp,
  componentId,
  instanceId,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  selected = false,
  highlightChild = null,
  showPins = true,
  activePinId = null,
  onSelect = null,
  onPinClick = null,
  onPinHover = null
}) {
  const [hovered, setHovered] = useState(false);
  const [hoveredPin, setHoveredPin] = useState(null);
  const groupRef = useRef();

  const id = comp?.id || componentId;
  const pins = comp?.pins || [];

  // Determine procedural model component
  const ProceduralComponent = PROCEDURAL_MODELS[id] || GenericBoxModel;
  const isGlb = comp?.model?.type === "glb" && comp?.model?.path;

  // Handle mesh highlighting if requested
  React.useEffect(() => {
    if (!groupRef.current || !highlightChild) return;
    groupRef.current.traverse((child) => {
      if (child.isMesh) {
        if (child.name === highlightChild) {
          child.material = child.material.clone();
          child.material.emissive = new THREE.Color("#ec4899"); // Bright Pink Glow
          child.material.emissiveIntensity = 0.8;
        } else if (child.material && child.material.emissive) {
          child.material.emissiveIntensity = 0;
        }
      }
    });
  }, [highlightChild]);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) onSelect(comp, instanceId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => {
        setHovered(false);
      }}
    >
      {/* 3D Model Body */}
      {isGlb ? (
        <Suspense fallback={<GenericBoxModel comp={comp} hovered={hovered} selected={selected} />}>
          <GlbLoader path={comp.model.path} hovered={hovered} selected={selected} />
        </Suspense>
      ) : (
        <ProceduralComponent comp={comp} hovered={hovered} selected={selected} />
      )}

      {/* Selection Glow Indicator */}
      {selected && (
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.5, 2.7, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Interactive Pin Markers */}
      {showPins &&
        pins.map((pin) => {
          const pinPos = pin.position || [0, 0, 0];
          const isPinHovered = hoveredPin === pin.id;
          const isPinActive = activePinId === pin.id;
          const pinColor = PIN_SIGNAL_COLORS[pin.type] || "#6b7280";

          return (
            <group key={pin.id} position={pinPos}>
              {/* Pin Pad Sphere/Cylinder */}
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPinClick) onPinClick(pin, comp, instanceId);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredPin(pin.id);
                  if (onPinHover) onPinHover(pin, comp, instanceId);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  setHoveredPin(null);
                  if (onPinHover) onPinHover(null, comp, instanceId);
                }}
              >
                <sphereGeometry args={[isPinHovered || isPinActive ? 0.16 : 0.11, 16, 16]} />
                <meshStandardMaterial
                  color={isPinActive ? "#ffffff" : pinColor}
                  emissive={isPinActive ? "#38bdf8" : pinColor}
                  emissiveIntensity={isPinHovered || isPinActive ? 0.9 : 0.3}
                  roughness={0.2}
                  metalness={0.8}
                />
              </mesh>

              {/* Pin Floating Tooltip Badge on Hover */}
              {(isPinHovered || isPinActive) && (
                <Html position={[0, 0.45, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: "none" }}>
                  <div
                    style={{
                      background: "rgba(15, 23, 42, 0.92)",
                      border: `1px solid ${pinColor}`,
                      color: "#f8fafc",
                      padding: "3px 7px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontFamily: "system-ui, sans-serif",
                      whiteSpace: "nowrap",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: pinColor,
                        display: "inline-block"
                      }}
                    />
                    <b>{pin.label || pin.id}</b>
                    <span style={{ opacity: 0.75, fontSize: "10px" }}>
                      ({pin.type} · {pin.voltage ? pin.voltage + "V" : ""})
                    </span>
                  </div>
                </Html>
              )}
            </group>
          );
        })}
    </group>
  );
}
