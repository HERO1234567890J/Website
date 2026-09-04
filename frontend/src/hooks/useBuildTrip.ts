import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  dtClear,
  dtLoad,
  dtSave,
  type BuildTripState,
} from '@/lib/build-trip-state';

export type BuildTripScene = 1 | 2 | 3 | 4;

export interface UseBuildTripResult {
  state: BuildTripState;
  setVibe: (vibe: string) => void;
  toggleDestination: (dest: string) => void;
  isDestinationSelected: (dest: string) => boolean;
  setOtherDestination: (other: string) => void;
  setDateFrom: (date: string) => void;
  setDateTo: (date: string) => void;
  setDuration: (duration: string) => void;
  setTravelers: (count: number) => void;
  setBudget: (budget: string) => void;
  setNotes: (notes: string) => void;
  setContactName: (name: string) => void;
  setContactEmail: (email: string) => void;
  setContactPhone: (phone: string) => void;
  setContact: (name: string, email: string, phone: string) => void;
  clear: () => void;
  canProceedFromScene1: boolean;
  canProceedFromScene2: boolean;
}

/**
 * Stage 5 — extract build-trip wizard state + own the scene guards.
 *
 * - Centralises dtLoad / dtSave / dtClear behind typed actions.
 * - Hard-redirects to the earliest missing scene when prior state is absent.
 *   This replaces the soft comment in Scene 1 (handoff bug #1) and
 *   extends the same guard to Scenes 2, 3, 4.
 *
 * Still backed by localStorage ('dtripsBuildTrip'); will swap to API
 * state in §12 (NestJS).
 */
export function useBuildTrip(scene: BuildTripScene): UseBuildTripResult {
  const navigate = useNavigate();
  const [state, setState] = useState<BuildTripState>(() => dtLoad());

  useEffect(() => {
    const initial = dtLoad();
    const hasVibe = !!initial.vibe;
    const hasDestinations =
      (initial.destinations?.length ?? 0) > 0 || !!initial.otherDestination?.trim();

    if (scene >= 2 && !hasVibe) {
      navigate('/build-trip', { replace: true });
      return;
    }
    if (scene >= 3 && !hasDestinations) {
      navigate('/build-trip/destinations', { replace: true });
      return;
    }
  }, [scene, navigate]);

  const patch = useCallback((p: Partial<BuildTripState>) => {
    const next = dtSave(p);
    setState(next);
  }, []);

  const setVibe = useCallback((v: string) => patch({ vibe: v }), [patch]);

  const toggleDestination = useCallback(
    (d: string) => {
      const current = new Set(state.destinations ?? []);
      if (current.has(d)) current.delete(d);
      else current.add(d);
      patch({ destinations: Array.from(current) });
    },
    [patch, state.destinations],
  );

  const isDestinationSelected = useCallback(
    (d: string) => (state.destinations ?? []).includes(d),
    [state.destinations],
  );

  const setOtherDestination = useCallback(
    (o: string) => patch({ otherDestination: o.trim() }),
    [patch],
  );

  const setDateFrom = useCallback((d: string) => patch({ dateFrom: d }), [patch]);
  const setDateTo = useCallback((d: string) => patch({ dateTo: d }), [patch]);
  const setDuration = useCallback((d: string) => patch({ duration: d }), [patch]);
  const setTravelers = useCallback((n: number) => patch({ travelers: n }), [patch]);
  const setBudget = useCallback((b: string) => patch({ budget: b }), [patch]);
  const setNotes = useCallback((n: string) => patch({ notes: n.trim() }), [patch]);

  const setContactName = useCallback((n: string) => patch({ name: n }), [patch]);
  const setContactEmail = useCallback((e: string) => patch({ email: e }), [patch]);
  const setContactPhone = useCallback((p: string) => patch({ phone: p }), [patch]);
  const setContact = useCallback(
    (n: string, e: string, p: string) => patch({ name: n, email: e, phone: p }),
    [patch],
  );

  const clear = useCallback(() => {
    dtClear();
    setState({});
  }, []);

  const canProceedFromScene1 = !!state.vibe;
  const canProceedFromScene2 =
    (state.destinations?.length ?? 0) > 0 || !!state.otherDestination?.trim();

  return {
    state,
    setVibe,
    toggleDestination,
    isDestinationSelected,
    setOtherDestination,
    setDateFrom,
    setDateTo,
    setDuration,
    setTravelers,
    setBudget,
    setNotes,
    setContactName,
    setContactEmail,
    setContactPhone,
    setContact,
    clear,
    canProceedFromScene1,
    canProceedFromScene2,
  };
}
