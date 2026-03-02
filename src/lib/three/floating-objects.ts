/**
 * FloatingObjects — Factory for instanced meshes with bob animation
 *
 * Creates N copies of a geometry floating with gentle sine-based motion.
 * Uses float-bob.vert compatible uniforms. Supports any BufferGeometry.
 *
 * @example
 * const floaters = createFloatingObjects({
 *   geometry: new THREE.IcosahedronGeometry(1, 1),
 *   count: 20,
 *   spread: 50,
 * });
 * scene.add(floaters.mesh);
 * // In loop: updateFloatingObjects(floaters, elapsed);
 */
import * as THREE from "three";

export interface FloatingObjectsConfig {
	geometry?: THREE.BufferGeometry;
	material?: THREE.Material;
	count?: number;
	spread?: number;
	heightRange?: [number, number];
	scaleRange?: [number, number];
	bobAmplitude?: number;
	bobFrequency?: number;
	color?: number;
}

export interface FloatingObjectsHandle {
	mesh: THREE.InstancedMesh;
	update: (elapsed: number) => void;
	dispose: () => void;
}

const DEFAULTS: Required<Omit<FloatingObjectsConfig, "geometry" | "material">> = {
	count: 15,
	spread: 40,
	heightRange: [2, 15],
	scaleRange: [0.3, 1.5],
	bobAmplitude: 0.8,
	bobFrequency: 0.5,
	color: 0xcccccc,
};

interface InstanceData {
	baseY: number;
	phase: number;
}

export function createFloatingObjects(config?: FloatingObjectsConfig): FloatingObjectsHandle {
	const c = { ...DEFAULTS, ...config };
	const geo = config?.geometry ?? new THREE.IcosahedronGeometry(1, 1);
	const mat =
		config?.material ??
		new THREE.MeshStandardMaterial({
			color: c.color,
			flatShading: true,
			roughness: 0.6,
			metalness: 0.2,
		});

	const mesh = new THREE.InstancedMesh(geo, mat, c.count);
	const dummy = new THREE.Object3D();
	const instances: InstanceData[] = [];

	for (let i = 0; i < c.count; i++) {
		const x = (Math.random() - 0.5) * c.spread * 2;
		const z = (Math.random() - 0.5) * c.spread * 2;
		const y = c.heightRange[0] + Math.random() * (c.heightRange[1] - c.heightRange[0]);
		const scale = c.scaleRange[0] + Math.random() * (c.scaleRange[1] - c.scaleRange[0]);
		const phase = Math.random() * Math.PI * 2;

		dummy.position.set(x, y, z);
		dummy.scale.setScalar(scale);
		dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
		dummy.updateMatrix();
		mesh.setMatrixAt(i, dummy.matrix);

		instances.push({ baseY: y, phase });
	}

	mesh.instanceMatrix.needsUpdate = true;
	mesh.castShadow = true;

	return {
		mesh,
		update(elapsed: number) {
			for (let i = 0; i < c.count; i++) {
				const inst = instances[i];
				mesh.getMatrixAt(i, dummy.matrix);
				dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

				dummy.position.y =
					inst.baseY + Math.sin(elapsed * c.bobFrequency + inst.phase) * c.bobAmplitude;
				dummy.rotation.y += 0.002;
				dummy.updateMatrix();
				mesh.setMatrixAt(i, dummy.matrix);
			}
			mesh.instanceMatrix.needsUpdate = true;
		},
		dispose() {
			geo.dispose();
			if (!config?.material) mat.dispose();
		},
	};
}
