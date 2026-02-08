/**
 * Component Types — Shared utility types for components
 */

import type { Component, ComponentType } from "svelte";

// biome-ignore lint/suspicious/noExplicitAny: Svelte 5 supports both class + function components
export type AnyComponent = ComponentType | Component<any>;
