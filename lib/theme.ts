"use client";

/**
 * Light / dark theme. The choice lives on <html data-theme>, set before first
 * paint by THEME_SCRIPT (saved choice, else the system setting), so there is
 * no flash. Components subscribe to the attribute instead of holding a copy.
 */
import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme-script";

export type Theme = "light" | "dark";

function read(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "light");
}

export function setTheme(next: Theme) {
  const html = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) html.classList.add("theme-fade");
  html.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* private mode: the choice just won't persist */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#0E1014" : "#F7F5EF");
  if (!reduce) window.setTimeout(() => html.classList.remove("theme-fade"), 400);
}
