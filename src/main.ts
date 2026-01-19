/**
 * WebXR Scene - Three.js VR/AR Application
 *
 * This module creates a WebXR-enabled 3D scene with:
 * - A rotating cube that can be controlled remotely
 * - VR mode (immersive environment) or AR mode (passthrough)
 * - WebSocket connection for receiving commands from controller.html
 *
 * @see docs/ARCHITECTURE.md for data flow documentation
 * @see docs/TUTORIAL.md for adding new features
 */

import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Mode detection from URL query parameter
 * - ?mode=vr (default): Immersive VR with dark background
 * - ?mode=ar: AR passthrough with transparent background
 */
const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") || "vr";

// ============================================================================
// Three.js Scene Setup
// ============================================================================

/**
 * Main scene container
 * AR mode: No background (transparent for camera passthrough)
 * VR mode: Dark blue background
 */
const scene = new THREE.Scene();
if (mode !== "ar") {
	scene.background = new THREE.Color(0x1a1a2e);
}

/**
 * Perspective camera
 * - 75° FOV for comfortable VR viewing
 * - Near plane at 0.1 for close objects
 * - Far plane at 1000 for distant objects
 */
const camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	1000,
);
camera.position.z = 3;

/**
 * WebGL Renderer with WebXR support
 * - antialias: Smooth edges
 * - alpha: Required for AR transparency
 *
 * WHY `alpha: mode === "ar"`?
 * In AR mode, the Quest's passthrough cameras show the real world behind
 * our scene. For this to work, our canvas background must be transparent.
 * Setting alpha:true enables the alpha channel in the framebuffer.
 * In VR mode, we don't need transparency (closed environment), so we
 * save GPU resources by keeping alpha:false.
 */
const renderer = new THREE.WebGLRenderer({
	antialias: true,
	alpha: mode === "ar", // Transparency only needed for AR passthrough
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

/**
 * Enable WebXR
 * IMPORTANT: This must be set before creating VR/AR buttons
 */
renderer.xr.enabled = true;

/**
 * XR Entry Button
 * Creates the "Enter VR" or "Start AR" button based on mode
 */
const xrButton =
	mode === "ar"
		? ARButton.createButton(renderer)
		: VRButton.createButton(renderer);
document.body.appendChild(xrButton);

// ============================================================================
// Scene Objects
// ============================================================================

/**
 * Interactive Cube
 * - Smaller in AR mode (0.3m) for real-world scale
 * - Larger in VR mode (1m) for visibility
 */
const cubeSize = mode === "ar" ? 0.3 : 1;
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
const cube = new THREE.Mesh(geometry, material);

/**
 * Cube positioning
 * - AR: At chest height (y=1.0) for comfortable viewing
 * - VR: Centered (y=0)
 * - Both: 2 meters in front of user (z=-2)
 */
cube.position.set(0, mode === "ar" ? 1.0 : 0, -2);
scene.add(cube);

/**
 * Lighting Setup
 * - Ambient: Soft fill light (50% intensity)
 * - Directional: Main light source from upper-right
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// ============================================================================
// Responsive Handling
// ============================================================================

/**
 * Window resize handler
 * Updates camera aspect ratio and renderer size
 */
window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================================
// WebSocket Remote Control
// ============================================================================

/** Connection status display element */
const statusEl = document.getElementById("connection-status");

/**
 * Updates the connection status indicator in the UI
 * @param connected - Whether WebSocket is connected
 */
function updateStatus(connected: boolean): void {
	if (!statusEl) return;
	statusEl.textContent = connected ? "🟢 Connected" : "🔴 Disconnected";
	statusEl.style.color = connected ? "#4ade80" : "#f87171";
}

// ============================================================================
// Command Protocol
// ============================================================================

/**
 * Movement command - adjusts cube position along an axis
 * @example { type: "move", axis: "x", value: 0.1 }
 */
interface MoveCommand {
	type: "move";
	axis: "x" | "y" | "z";
	value: number;
}

/**
 * Color command - changes cube material color
 * @example { type: "color", color: "red" }
 */
interface ColorCommand {
	type: "color";
	color: "red" | "green" | "blue";
}

/** Union type for all supported commands */
type Command = MoveCommand | ColorCommand;

/** Color name to hex mapping */
const COLOR_MAP: Record<string, number> = {
	red: 0xff0000,
	green: 0x00ff00,
	blue: 0x0000ff,
};

/**
 * Processes incoming commands from the controller
 *
 * Command handlers:
 * - move: Adds value to cube.position[axis] (cumulative)
 * - color: Sets material color from COLOR_MAP
 *
 * WHY dynamic property access (`cube.position[cmd.axis]`)?
 * Instead of writing separate if/else for x, y, z, we use the axis string
 * directly as a property key. TypeScript's union type ("x" | "y" | "z")
 * ensures only valid axes are accepted at compile time.
 *
 * @param cmd - Parsed command object from WebSocket
 */
function handleCommand(cmd: Command): void {
	switch (cmd.type) {
		case "move":
			// Dynamic property access - axis is typed as "x" | "y" | "z"
			cube.position[cmd.axis] += cmd.value;
			break;
		case "color":
			material.color.setHex(COLOR_MAP[cmd.color] ?? 0x00ff88);
			break;
	}
}

// ============================================================================
// WebSocket Connection
// ============================================================================

/**
 * WebSocket client for receiving commands
 * Connects to same host via secure WebSocket (wss://)
 */
const ws = new WebSocket(`wss://${location.host}`);

ws.onopen = () => {
	console.log("WebSocket connected");
	updateStatus(true);
};

ws.onclose = () => {
	console.log("WebSocket disconnected");
	updateStatus(false);
};

ws.onerror = (err) => {
	console.error("WebSocket error:", err);
	updateStatus(false);
};

/**
 * Message handler
 * Parses JSON commands and routes to handleCommand()
 */
ws.onmessage = (event) => {
	try {
		const cmd: Command = JSON.parse(event.data);
		handleCommand(cmd);
	} catch (e) {
		console.error("Invalid message:", e);
	}
};

// ============================================================================
// Animation Loop
// ============================================================================

/**
 * Main render loop
 *
 * WHY setAnimationLoop() instead of requestAnimationFrame()?
 * - requestAnimationFrame runs at monitor refresh rate (60fps)
 * - VR headsets run at different rates (72/90/120fps) and need
 *   frame timing synchronized with their displays
 * - setAnimationLoop() automatically:
 *   1. Uses XR session timing when in VR/AR
 *   2. Falls back to requestAnimationFrame on desktop
 *   3. Pauses when XR session is inactive
 *
 * @see docs/CONCEPTS.md#-der-render-loop for detailed explanation
 */
renderer.setAnimationLoop(() => {
	// Continuous rotation for visual interest
	cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;

	// Render the scene
	renderer.render(scene, camera);
});
