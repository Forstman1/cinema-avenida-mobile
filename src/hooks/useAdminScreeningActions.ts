import { useCallback, useState } from 'react';

import { getApiErrorDetails } from '../api/errors';
import { useAdminScreeningsStore } from '../store/adminScreeningsStore';
import { isScreeningPast } from '../utils/date';
import type { Screening } from '../types';

/**
 * Shared admin-screening behavior. The screens keep their own form state,
 * layout, and user-facing error handling; this hook only owns rules that are
 * identical across screening-management entry points.
 */
export function useAdminScreeningActions(cinemaTimezone?: string) {
  const createScreeningInStore = useAdminScreeningsStore((state) => state.createScreening);
  const isCreatingScreening = useAdminScreeningsStore((state) => state.isCreatingScreening);
  const createScreeningError = useAdminScreeningsStore((state) => state.createScreeningError);
  const updateScreeningInStore = useAdminScreeningsStore((state) => state.updateScreening);
  const isUpdatingScreening = useAdminScreeningsStore((state) => state.isUpdatingScreening);
  const updatingScreeningId = useAdminScreeningsStore((state) => state.updatingScreeningId);
  const updateScreeningError = useAdminScreeningsStore((state) => state.updateScreeningError);
  const deleteScreeningInStore = useAdminScreeningsStore((state) => state.deleteScreening);
  const isDeletingScreening = useAdminScreeningsStore((state) => state.isDeletingScreening);
  const deletingScreeningId = useAdminScreeningsStore((state) => state.deletingScreeningId);
  const deleteScreeningError = useAdminScreeningsStore((state) => state.deleteScreeningError);
  const clearCreateError = useAdminScreeningsStore((state) => state.clearCreateError);
  const clearUpdateError = useAdminScreeningsStore((state) => state.clearUpdateError);
  const clearDeleteError = useAdminScreeningsStore((state) => state.clearDeleteError);

  const [backendReadOnlyScreeningIds, setBackendReadOnlyScreeningIds] = useState<number[]>([]);

  const markScreeningReadOnly = useCallback((screeningId: number) => {
    setBackendReadOnlyScreeningIds((ids) => (
      ids.includes(screeningId) ? ids : [...ids, screeningId]
    ));
  }, []);

  const isScreeningReadOnly = useCallback(
    (screening: Screening, now = new Date()) => (
      backendReadOnlyScreeningIds.includes(screening.id)
      || isScreeningPast(screening, cinemaTimezone, now)
    ),
    [backendReadOnlyScreeningIds, cinemaTimezone],
  );

  const updateScreening = useCallback(
    async (
      id: Parameters<typeof updateScreeningInStore>[0],
      payload: Parameters<typeof updateScreeningInStore>[1],
    ) => {
      try {
        return await updateScreeningInStore(id, payload);
      } catch (error: unknown) {
        if (getApiErrorDetails(error).code === 'SCREENING_PAST_READ_ONLY') {
          markScreeningReadOnly(id);
        }
        throw error;
      }
    },
    [markScreeningReadOnly, updateScreeningInStore],
  );

  const deleteScreening = useCallback(
    async (id: Parameters<typeof deleteScreeningInStore>[0]) => {
      try {
        return await deleteScreeningInStore(id);
      } catch (error: unknown) {
        if (getApiErrorDetails(error).code === 'SCREENING_PAST_READ_ONLY') {
          markScreeningReadOnly(id);
        }
        throw error;
      }
    },
    [deleteScreeningInStore, markScreeningReadOnly],
  );

  return {
    isScreeningReadOnly,
    createScreening: createScreeningInStore,
    isCreatingScreening,
    createScreeningError,
    updateScreening,
    isUpdatingScreening,
    updatingScreeningId,
    updateScreeningError,
    deleteScreening,
    isDeletingScreening,
    deletingScreeningId,
    deleteScreeningError,
    clearCreateError,
    clearUpdateError,
    clearDeleteError,
  };
}
