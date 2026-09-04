/**
 * Build-trip wizard state — localStorage-backed.
 *
 * Stage 4: inlined per-page logic, kept simple.
 * Stage 5: extract into a useBuildTrip() hook with full type-safety
 * and a context provider if multiple components need to read it.
 */

const DT_KEY = 'dtripsBuildTrip';

export interface BuildTripState {
  vibe?: string;
  destinations?: string[];
  otherDestination?: string;
  dateFrom?: string;
  dateTo?: string;
  duration?: string;
  travelers?: number;
  budget?: string;
  notes?: string;
  // contact (review stage)
  name?: string;
  email?: string;
  phone?: string;
}

export function dtLoad(): BuildTripState {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(DT_KEY) || '{}') as BuildTripState;
  } catch {
    return {};
  }
}

export function dtSave(patch: Partial<BuildTripState>): BuildTripState {
  if (typeof window === 'undefined') return patch as BuildTripState;
  const data = { ...dtLoad(), ...patch };
  window.localStorage.setItem(DT_KEY, JSON.stringify(data));
  return data;
}

export function dtClear(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DT_KEY);
}
