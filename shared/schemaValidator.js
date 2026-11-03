/**
 * Circuit and Design JSON Schema Validator
 * Single Source of Truth for both Backend AI Validation and Frontend Designer Live Validation.
 */

export function validateCircuitDesign(design, componentLibrary) {
  const errors = [];
  const warnings = [];

  if (!design || typeof design !== "object") {
    return {
      valid: false,
      errors: ["Design payload must be a non-null object."],
      warnings: []
    };
  }

  // 1. Top-level metadata validation
  if (!design.title || typeof design.title !== "string") {
    errors.push("Missing or invalid 'title' (must be a non-empty string).");
  }
  if (!design.summary || typeof design.summary !== "string") {
    errors.push("Missing or invalid 'summary' (must be a non-empty string).");
  }
  if (!Array.isArray(design.components)) {
    errors.push("'components' must be an array.");
  }
  if (!Array.isArray(design.connections)) {
    errors.push("'connections' must be an array.");
  }
  if (!Array.isArray(design.explanations)) {
    warnings.push("Missing 'explanations' array.");
  }
  if (!Array.isArray(design.warnings)) {
    warnings.push("Missing 'warnings' array.");
  }
  if (!Array.isArray(design.buildSteps)) {
    warnings.push("Missing 'buildSteps' array.");
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Build component library lookup map
  const libMap = new Map();
  if (Array.isArray(componentLibrary)) {
    for (const comp of componentLibrary) {
      libMap.set(comp.id, comp);
    }
  }

  // 2. Validate Component Instances
  const instanceMap = new Map();
  const instanceIdSet = new Set();

  for (let i = 0; i < design.components.length; i++) {
    const compInstance = design.components[i];
    const { instanceId, componentId, position, rotation } = compInstance || {};

    if (!instanceId || typeof instanceId !== "string") {
      errors.push(`Component at index ${i} has invalid instanceId.`);
      continue;
    }

    if (instanceIdSet.has(instanceId)) {
      errors.push(`Duplicate instanceId '${instanceId}' found.`);
    }
    instanceIdSet.add(instanceId);

    if (!componentId || !libMap.has(componentId)) {
      errors.push(
        `Component '${instanceId}' references unknown componentId '${componentId}'. Available components: ${Array.from(libMap.keys()).join(", ")}`
      );
      continue;
    }

    const libDef = libMap.get(componentId);
    instanceMap.set(instanceId, {
      ...compInstance,
      libDef,
      pinsMap: new Map((libDef.pins || []).map((p) => [p.id, p]))
    });

    if (position && (!Array.isArray(position) || position.length !== 3)) {
      warnings.push(`Component '${instanceId}' position should be [x, y, z].`);
    }
  }

  // 3. Validate Connections
  const pinConnectionCount = new Map(); // key: "instanceId:pinId" -> count
  const pinConnectionsList = new Map(); // key: "instanceId:pinId" -> array of target pins

  for (let i = 0; i < design.connections.length; i++) {
    const conn = design.connections[i];
    const from = conn?.from;
    const to = conn?.to;
    const signal = conn?.signal;

    if (!from || !from.instanceId || !from.pinId) {
      errors.push(`Connection at index ${i} has invalid 'from' specification.`);
      continue;
    }
    if (!to || !to.instanceId || !to.pinId) {
      errors.push(`Connection at index ${i} has invalid 'to' specification.`);
      continue;
    }

    if (from.instanceId === to.instanceId && from.pinId === to.pinId) {
      errors.push(`Connection at index ${i} cannot connect pin '${from.pinId}' to itself.`);
      continue;
    }

    const fromInst = instanceMap.get(from.instanceId);
    const toInst = instanceMap.get(to.instanceId);

    if (!fromInst) {
      errors.push(`Connection ${i} 'from' references unknown instance '${from.instanceId}'.`);
      continue;
    }
    if (!toInst) {
      errors.push(`Connection ${i} 'to' references unknown instance '${to.instanceId}'.`);
      continue;
    }

    const fromPin = fromInst.pinsMap.get(from.pinId);
    const toPin = toInst.pinsMap.get(to.pinId);

    if (!fromPin) {
      errors.push(`Instance '${from.instanceId}' has no pin '${from.pinId}'.`);
      continue;
    }
    if (!toPin) {
      errors.push(`Instance '${to.instanceId}' has no pin '${to.pinId}'.`);
      continue;
    }

    // Check illegal double connection on dedicated output pins
    const fromKey = `${from.instanceId}:${from.pinId}`;
    const toKey = `${to.instanceId}:${to.pinId}`;

    pinConnectionCount.set(fromKey, (pinConnectionCount.get(fromKey) || 0) + 1);
    pinConnectionCount.set(toKey, (pinConnectionCount.get(toKey) || 0) + 1);

    if (!pinConnectionsList.has(fromKey)) pinConnectionsList.set(fromKey, []);
    pinConnectionsList.get(fromKey).push({ target: toKey, pin: toPin, inst: toInst });

    if (!pinConnectionsList.has(toKey)) pinConnectionsList.set(toKey, []);
    pinConnectionsList.get(toKey).push({ target: fromKey, pin: fromPin, inst: fromInst });

    // Output clash check: Two 'out' pins connected together directly (except GND/Power rails)
    if (
      fromPin.direction === "out" &&
      toPin.direction === "out" &&
      fromPin.type !== "power" &&
      fromPin.type !== "gnd" &&
      toPin.type !== "power" &&
      toPin.type !== "gnd"
    ) {
      errors.push(
        `Output contention: Pin '${from.instanceId}.${from.pinId}' (out) is connected to another output pin '${to.instanceId}.${to.pinId}' (out).`
      );
    }

    // Voltage Mismatch Warnings (e.g. 5V logic feeding into 3.3V-only pin)
    const fromVolt = fromPin.voltage ?? fromInst.libDef.voltage?.logicLevel ?? 5.0;
    const toVolt = toPin.voltage ?? toInst.libDef.voltage?.logicLevel ?? 5.0;

    if (fromPin.type === "power" && toPin.type === "power") {
      // Direct power bus tying check
      if (Math.abs(fromVolt - toVolt) > 0.5) {
        warnings.push(
          `Voltage mismatch on power rail: Connecting ${fromVolt}V from '${from.instanceId}.${from.pinId}' to ${toVolt}V on '${to.instanceId}.${to.pinId}'. Ensure proper regulation!`
        );
      }
    } else if (
      (fromPin.direction === "out" && toPin.direction === "in") ||
      (toPin.direction === "out" && fromPin.direction === "in")
    ) {
      const srcVolt = fromPin.direction === "out" ? fromVolt : toVolt;
      const dstVolt = fromPin.direction === "out" ? toVolt : fromVolt;
      const dstInst = fromPin.direction === "out" ? toInst : fromInst;
      const dstPin = fromPin.direction === "out" ? toPin : fromPin;

      if (srcVolt > 4.5 && dstVolt <= 3.6 && dstPin.type !== "power") {
        warnings.push(
          `Logic voltage warning: 5V signal from '${from.instanceId}.${from.pinId}' feeds into 3.3V pin '${dstInst.instanceId}.${dstPin.id}'. A logic level shifter or resistor voltage divider is recommended.`
        );
      }
    }
  }

  // 4. Common Ground Check
  const gndConnectedInstances = new Set();
  for (const [key] of pinConnectionCount) {
    const [instId, pinId] = key.split(":");
    const inst = instanceMap.get(instId);
    const pin = inst?.pinsMap.get(pinId);
    if (pin && pin.type === "gnd") {
      gndConnectedInstances.add(instId);
    }
  }

  if (instanceMap.size >= 2) {
    for (const [instId, inst] of instanceMap) {
      const hasGndPin = (inst.libDef.pins || []).some((p) => p.type === "gnd");
      if (hasGndPin && !gndConnectedInstances.has(instId)) {
        warnings.push(
          `Common GND warning: Component '${instId}' (${inst.libDef.name}) has no connected GND pin. All active electronic components must share common ground!`
        );
      }
    }
  }

  // 5. Explanations completeness check
  if (Array.isArray(design.explanations)) {
    const explainedInstances = new Set(design.explanations.map((e) => e.instanceId));
    for (const instId of instanceMap.keys()) {
      if (!explainedInstances.has(instId)) {
        warnings.push(`Component '${instId}' is missing an explanation entry.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
