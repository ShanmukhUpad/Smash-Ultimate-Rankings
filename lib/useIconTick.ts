"use client";

import { useSyncExternalStore } from "react";
import { CYCLE_MS } from "./icons";

/**
 * One global frame counter for every rotating portrait.
 *
 * A single shared interval rather than a timer per mark: it keeps every
 * Pokemon Trainer on screen showing the same Pokemon at the same moment, and
 * the scatter can render 86 marks from one subscription.
 */
let tick = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Honour reduced motion by never starting the timer: everyone stays on frame 0.
  if (timer === null && !prefersReducedMotion()) {
    timer = setInterval(() => {
      tick += 1;
      for (const l of listeners) l();
    }, CYCLE_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => tick;
/** The server has no timer, so it always renders the first frame. */
const getServerSnapshot = () => 0;

export function useIconTick(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
