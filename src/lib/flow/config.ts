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

/**
 * Interactive SvelteFlow props for node editor
 * Enables full interaction: drag, connect, select, delete
 */
export const FLOW_EDITOR_PROPS = {
	panOnDrag: true,
	panOnScroll: true,
	zoomOnScroll: true,
	zoomOnPinch: true,
	zoomOnDoubleClick: true,
	elementsSelectable: true,
	nodesDraggable: true,
	nodesConnectable: true,
	deleteKey: "Backspace",
	snapToGrid: true,
	snapGrid: [20, 20] as [number, number],
	minZoom: 0.3,
	maxZoom: 2,
	fitViewOptions: { padding: 0.3 },
	defaultEdgeOptions: { animated: true },
	proOptions: { hideAttribution: true },
} as const;
