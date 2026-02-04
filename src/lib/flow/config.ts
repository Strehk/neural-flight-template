/**
 * Read-only SvelteFlow props for static diagrams
 * Disables all interaction except viewing
 */
export const FLOW_READONLY_PROPS = {
	panOnDrag: false,
	panOnScroll: false,
	zoomOnScroll: false,
	zoomOnPinch: false,
	zoomOnDoubleClick: false,
	elementsSelectable: false,
	nodesDraggable: false,
	nodesConnectable: false,
	deleteKey: null,
	proOptions: { hideAttribution: true },
} as const;
