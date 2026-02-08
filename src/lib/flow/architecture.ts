import { type Edge, MarkerType, type Node, Position } from "@xyflow/svelte";
import type { ArchitectureNodeData, NodeClass } from "./types";

// Layout constants
const NODE_WIDTH = 100;
const NODE_HEIGHT = 70;
const SERVER_HEIGHT = 50;
const CLIENT_SPACING = 120;
const VERTICAL_GAP = 80;

interface ClientNode {
	id: string;
	label: string;
	type: "INPUT" | "OUTPUT";
	class: NodeClass;
}

const CLIENTS: ClientNode[] = [
	{
		id: "esp32",
		label: "ESP32\nSensor\n[INPUT]",
		type: "INPUT",
		class: "node-input",
	},
	{
		id: "gyro",
		label: "/gyro\nPhone\n[INPUT]",
		type: "INPUT",
		class: "node-input",
	},
	{
		id: "vr",
		label: "/vr\nQuest\n[OUTPUT]",
		type: "OUTPUT",
		class: "node-output",
	},
	{
		id: "spect",
		label: "/spect\nMonitor\n[OUTPUT]",
		type: "OUTPUT",
		class: "node-output",
	},
	{
		id: "lights",
		label: "/lights\nDMX\n[OUTPUT]",
		type: "OUTPUT",
		class: "node-output",
	},
];

/**
 * Create nodes for the architecture diagram
 * SERVER centered above clients, all with explicit dimensions
 */
export function createArchitectureNodes(): Node<ArchitectureNodeData>[] {
	// Calculate total width of client row
	const totalClientWidth =
		CLIENTS.length * NODE_WIDTH +
		(CLIENTS.length - 1) * (CLIENT_SPACING - NODE_WIDTH);

	// Center server above clients
	const serverX = totalClientWidth / 2 - NODE_WIDTH / 2;

	const serverNode: Node<ArchitectureNodeData> = {
		id: "server",
		data: { label: "SERVER\n(Hub)" },
		position: { x: serverX, y: 0 },
		sourcePosition: Position.Bottom,
		targetPosition: Position.Bottom,
		width: NODE_WIDTH,
		height: SERVER_HEIGHT,
		class: "node-server",
	};

	const clientY = SERVER_HEIGHT + VERTICAL_GAP;

	const clientNodes: Node<ArchitectureNodeData>[] = CLIENTS.map(
		(client, index) => ({
			id: client.id,
			data: { label: client.label },
			position: { x: index * CLIENT_SPACING, y: clientY },
			sourcePosition: Position.Top,
			targetPosition: Position.Top,
			width: NODE_WIDTH,
			height: NODE_HEIGHT,
			class: client.class,
		}),
	);

	return [serverNode, ...clientNodes];
}

/**
 * Create edges for the architecture diagram
 * Using 'step' type for clean 90° corners
 */
export function createArchitectureEdges(): Edge[] {
	const inputClients = CLIENTS.filter((c) => c.type === "INPUT");
	const outputClients = CLIENTS.filter((c) => c.type === "OUTPUT");

	const inputEdges: Edge[] = inputClients.map((client) => ({
		id: `${client.id}-server`,
		source: client.id,
		target: "server",
		type: "step",
		markerEnd: { type: MarkerType.ArrowClosed },
	}));

	const outputEdges: Edge[] = outputClients.map((client) => ({
		id: `server-${client.id}`,
		source: "server",
		target: client.id,
		type: "step",
		markerEnd: { type: MarkerType.ArrowClosed },
	}));

	return [...inputEdges, ...outputEdges];
}
