import * as THREE from "three";
import type { BatBiomeId } from "./config";
import type { BatWorld } from "./world";

const MAP_SIZE = 256;
const SAMPLE_COUNT = 29;
const DEFAULT_MAP_RADIUS = 280;
const ZOOM_LEVELS = [140, 220, 280, 420, 640, 900] as const;
const UPDATE_INTERVAL_SECONDS = 0.18;
const ZOOM_IN_BUTTON = { x: 208, y: 14, width: 34, height: 30 } as const;
const ZOOM_OUT_BUTTON = { x: 208, y: 48, width: 34, height: 30 } as const;

interface CanvasRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

const BIOME_COLORS: Record<BatBiomeId, string> = {
	forest: "#215c46",
	grassland: "#789b54",
	mountains: "#818b92",
	snow: "#dce8f2",
	desert: "#b99558",
	barrens: "#8f7a5f",
};

export class MinimapHud {
	readonly group = new THREE.Group();

	private readonly canvas: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private readonly texture: THREE.CanvasTexture;
	private readonly material: THREE.MeshBasicMaterial;
	private readonly mesh: THREE.Mesh;
	private readonly direction = new THREE.Vector3();
	private readonly raycaster = new THREE.Raycaster();
	private readonly pointer = new THREE.Vector2();
	private readonly onPointerDown: (event: PointerEvent) => void;
	private lastUpdateAt = -Infinity;
	private lastCamera: THREE.Camera | null = null;
	private mapRadius = DEFAULT_MAP_RADIUS;
	private needsRedraw = true;

	constructor(
		private readonly world: BatWorld,
		private readonly chunkSize: number,
		private readonly pointerTarget: HTMLElement,
	) {
		this.canvas = document.createElement("canvas");
		this.canvas.width = MAP_SIZE;
		this.canvas.height = MAP_SIZE;
		const context = this.canvas.getContext("2d");
		if (!context) throw new Error("2D canvas context unavailable for minimap");
		this.ctx = context;

		this.texture = new THREE.CanvasTexture(this.canvas);
		this.texture.colorSpace = THREE.SRGBColorSpace;
		this.texture.needsUpdate = true;

		this.material = new THREE.MeshBasicMaterial({
			map: this.texture,
			transparent: true,
			opacity: 0.88,
			depthTest: false,
			depthWrite: false,
			toneMapped: false,
			side: THREE.DoubleSide,
		});
		this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.44), this.material);
		this.mesh.renderOrder = 1100;
		this.mesh.position.set(-0.54, -0.34, -1.08);
		this.group.add(this.mesh);
		this.group.visible = true;
		this.group.renderOrder = 1100;
		this.onPointerDown = (event) => this.handlePointerDown(event);
		this.pointerTarget.addEventListener("pointerdown", this.onPointerDown);
	}

	setVisible(visible: boolean): void {
		this.group.visible = visible;
	}

	toggleVisible(): void {
		this.group.visible = !this.group.visible;
	}

	tick(playerPosition: THREE.Vector3, camera: THREE.Camera, elapsed: number): void {
		if (!this.group.visible) return;
		this.lastCamera = camera;
		if (!this.needsRedraw && elapsed - this.lastUpdateAt < UPDATE_INTERVAL_SECONDS) return;
		this.lastUpdateAt = elapsed;
		this.needsRedraw = false;
		camera.getWorldDirection(this.direction);
		this.draw(playerPosition, Math.atan2(this.direction.x, -this.direction.z));
	}

	dispose(): void {
		this.pointerTarget.removeEventListener("pointerdown", this.onPointerDown);
		this.group.removeFromParent();
		this.mesh.geometry.dispose();
		this.material.dispose();
		this.texture.dispose();
	}

	private draw(playerPosition: THREE.Vector3, heading: number): void {
		const ctx = this.ctx;
		ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
		ctx.fillStyle = "rgba(2, 8, 14, 0.9)";
		ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

		this.drawTerrain(playerPosition);
		this.drawGrid(playerPosition);
		this.drawFrame();
		this.drawPlayer(heading);
		this.drawLabels(playerPosition);
		this.drawZoomControls();
		this.texture.needsUpdate = true;
	}

	private drawTerrain(playerPosition: THREE.Vector3): void {
		const cellSize = MAP_SIZE / SAMPLE_COUNT;
		let minHeight = Number.POSITIVE_INFINITY;
		let maxHeight = Number.NEGATIVE_INFINITY;
		const heights = new Float32Array(SAMPLE_COUNT * SAMPLE_COUNT);
		const biomes: BatBiomeId[] = [];

		for (let y = 0; y < SAMPLE_COUNT; y++) {
			for (let x = 0; x < SAMPLE_COUNT; x++) {
				const wx = playerPosition.x + (x / (SAMPLE_COUNT - 1) - 0.5) * this.mapRadius * 2;
				const wz = playerPosition.z + (y / (SAMPLE_COUNT - 1) - 0.5) * this.mapRadius * 2;
				const index = y * SAMPLE_COUNT + x;
				const height = this.world.sampleHeight(wx, wz);
				heights[index] = height;
				biomes[index] = this.world.sampleBiome(wx, wz);
				minHeight = Math.min(minHeight, height);
				maxHeight = Math.max(maxHeight, height);
			}
		}

		const heightRange = Math.max(1, maxHeight - minHeight);
		for (let y = 0; y < SAMPLE_COUNT; y++) {
			for (let x = 0; x < SAMPLE_COUNT; x++) {
				const index = y * SAMPLE_COUNT + x;
				const shade = 0.64 + ((heights[index] - minHeight) / heightRange) * 0.42;
				this.ctx.fillStyle = shadeHex(BIOME_COLORS[biomes[index]], shade);
				this.ctx.fillRect(
					Math.floor(x * cellSize),
					Math.floor(y * cellSize),
					Math.ceil(cellSize) + 1,
					Math.ceil(cellSize) + 1,
				);
			}
		}

		this.ctx.strokeStyle = "rgba(232, 250, 255, 0.16)";
		this.ctx.lineWidth = 1;
		this.ctx.beginPath();
		for (let y = 1; y < SAMPLE_COUNT - 1; y += 4) {
			const py = y * cellSize;
			this.ctx.moveTo(0, py);
			this.ctx.lineTo(MAP_SIZE, py);
		}
		for (let x = 1; x < SAMPLE_COUNT - 1; x += 4) {
			const px = x * cellSize;
			this.ctx.moveTo(px, 0);
			this.ctx.lineTo(px, MAP_SIZE);
		}
		this.ctx.stroke();
	}

	private drawGrid(playerPosition: THREE.Vector3): void {
		const unitsPerPixel = (this.mapRadius * 2) / MAP_SIZE;
		const center = MAP_SIZE / 2;
		const startX = Math.floor((playerPosition.x - this.mapRadius) / this.chunkSize) * this.chunkSize;
		const endX = playerPosition.x + this.mapRadius;
		const startZ = Math.floor((playerPosition.z - this.mapRadius) / this.chunkSize) * this.chunkSize;
		const endZ = playerPosition.z + this.mapRadius;

		this.ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
		this.ctx.lineWidth = 1;
		this.ctx.beginPath();
		for (let wx = startX; wx <= endX; wx += this.chunkSize) {
			const px = center + (wx - playerPosition.x) / unitsPerPixel;
			this.ctx.moveTo(px, 0);
			this.ctx.lineTo(px, MAP_SIZE);
		}
		for (let wz = startZ; wz <= endZ; wz += this.chunkSize) {
			const py = center + (wz - playerPosition.z) / unitsPerPixel;
			this.ctx.moveTo(0, py);
			this.ctx.lineTo(MAP_SIZE, py);
		}
		this.ctx.stroke();
	}

	private drawFrame(): void {
		const ctx = this.ctx;
		ctx.strokeStyle = "rgba(210, 250, 255, 0.9)";
		ctx.lineWidth = 3;
		ctx.strokeRect(2, 2, MAP_SIZE - 4, MAP_SIZE - 4);
		ctx.strokeStyle = "rgba(16, 35, 45, 0.9)";
		ctx.lineWidth = 8;
		ctx.strokeRect(4, 4, MAP_SIZE - 8, MAP_SIZE - 8);
	}

	private drawPlayer(heading: number): void {
		const ctx = this.ctx;
		const center = MAP_SIZE / 2;
		ctx.save();
		ctx.translate(center, center);
		ctx.rotate(heading);
		ctx.fillStyle = "#f9fff0";
		ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.moveTo(0, -18);
		ctx.lineTo(11, 13);
		ctx.lineTo(0, 7);
		ctx.lineTo(-11, 13);
		ctx.closePath();
		ctx.stroke();
		ctx.fill();
		ctx.restore();

		ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.arc(center, center, 24, 0, Math.PI * 2);
		ctx.stroke();
	}

	private drawLabels(playerPosition: THREE.Vector3): void {
		const ctx = this.ctx;
		ctx.fillStyle = "rgba(246, 255, 255, 0.95)";
		ctx.font = "bold 18px system-ui, sans-serif";
		ctx.textAlign = "center";
		ctx.fillText("N", MAP_SIZE / 2, 25);
		ctx.font = "12px system-ui, sans-serif";
		ctx.textAlign = "left";
		ctx.fillText(`x ${Math.round(playerPosition.x)}`, 14, MAP_SIZE - 30);
		ctx.fillText(`z ${Math.round(playerPosition.z)}`, 14, MAP_SIZE - 14);
		ctx.textAlign = "right";
		ctx.fillText(`${this.mapRadius * 2}m`, MAP_SIZE - 14, MAP_SIZE - 14);
	}

	private drawZoomControls(): void {
		this.drawZoomButton(ZOOM_IN_BUTTON, "+", this.canZoomIn());
		this.drawZoomButton(ZOOM_OUT_BUTTON, "-", this.canZoomOut());
	}

	private drawZoomButton(
		rect: CanvasRect,
		label: string,
		enabled: boolean,
	): void {
		const ctx = this.ctx;
		ctx.fillStyle = enabled ? "rgba(6, 18, 24, 0.9)" : "rgba(6, 18, 24, 0.45)";
		ctx.strokeStyle = enabled ? "rgba(214, 252, 255, 0.86)" : "rgba(214, 252, 255, 0.32)";
		ctx.lineWidth = 2;
		roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 6);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = enabled ? "rgba(246, 255, 255, 0.98)" : "rgba(246, 255, 255, 0.42)";
		ctx.font = "bold 24px system-ui, sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2 - 1);
		ctx.textBaseline = "alphabetic";
	}

	private handlePointerDown(event: PointerEvent): void {
		if (!this.group.visible || !this.lastCamera) return;
		const rect = this.pointerTarget.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return;

		this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
		this.lastCamera.updateWorldMatrix(true, false);
		this.group.updateWorldMatrix(true, true);
		this.raycaster.setFromCamera(this.pointer, this.lastCamera);
		const hit = this.raycaster.intersectObject(this.mesh, false)[0];
		if (!hit?.uv) return;

		const mapX = hit.uv.x * MAP_SIZE;
		const mapY = (1 - hit.uv.y) * MAP_SIZE;
		if (pointInRect(mapX, mapY, ZOOM_IN_BUTTON) && this.canZoomIn()) {
			event.preventDefault();
			this.zoomIn();
			return;
		}
		if (pointInRect(mapX, mapY, ZOOM_OUT_BUTTON) && this.canZoomOut()) {
			event.preventDefault();
			this.zoomOut();
		}
	}

	private zoomIn(): void {
		const index = ZOOM_LEVELS.indexOf(this.mapRadius as (typeof ZOOM_LEVELS)[number]);
		if (index > 0) {
			this.mapRadius = ZOOM_LEVELS[index - 1];
			this.needsRedraw = true;
		}
	}

	private zoomOut(): void {
		const index = ZOOM_LEVELS.indexOf(this.mapRadius as (typeof ZOOM_LEVELS)[number]);
		if (index >= 0 && index < ZOOM_LEVELS.length - 1) {
			this.mapRadius = ZOOM_LEVELS[index + 1];
			this.needsRedraw = true;
		}
	}

	private canZoomIn(): boolean {
		return this.mapRadius > ZOOM_LEVELS[0];
	}

	private canZoomOut(): boolean {
		return this.mapRadius < ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
	}
}

function shadeHex(hex: string, shade: number): string {
	const normalized = hex.replace("#", "");
	const r = Number.parseInt(normalized.slice(0, 2), 16);
	const g = Number.parseInt(normalized.slice(2, 4), 16);
	const b = Number.parseInt(normalized.slice(4, 6), 16);
	return `rgb(${Math.round(r * shade)}, ${Math.round(g * shade)}, ${Math.round(b * shade)})`;
}

function pointInRect(
	x: number,
	y: number,
	rect: CanvasRect,
): boolean {
	return (
		x >= rect.x &&
		x <= rect.x + rect.width &&
		y >= rect.y &&
		y <= rect.y + rect.height
	);
}

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
): void {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
}
