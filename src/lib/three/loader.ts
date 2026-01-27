import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

/** Load a GLTF/GLB model from the given URL. */
export function loadGLTF(url: string): Promise<GLTF> {
	return new Promise((resolve, reject) => {
		loader.load(url, resolve, undefined, reject);
	});
}
