"use client";

import { useEffect } from "react";
import { beginNavigation } from "@/lib/nav-state";

/**
 * Reports this subtree's loading state to the progress bar.
 *
 * Mounted by `RouteSkeleton`, which is the fallback of every route's
 * `loading.jsx`. React mounts it for the entire pending navigation and unmounts
 * it when the real page is ready, so its lifetime *is* the loading state. The
 * bar in the header subscribes to it rather than guessing from the URL.
 *
 * It renders nothing: the visible feedback is the bar plus the skeleton, and
 * this is the wiring between them.
 */
export default function RouteActivity() {
  useEffect(() => beginNavigation(), []);
  return null;
}
