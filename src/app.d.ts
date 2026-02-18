// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// GLSL shader files imported via Vite ?raw
declare module "*.glsl?raw" {
	const content: string;
	export default content;
}
declare module "*.vert?raw" {
	const content: string;
	export default content;
}
declare module "*.frag?raw" {
	const content: string;
	export default content;
}

export {};
