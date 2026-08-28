import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { getMillisecondsUntilNextCinemaDay } from '../utils/date';

export function useCinemaDateContext(timezone?: string): Date {
  const [now, setNow] = useState(() => new Date());
  const refresh = useCallback(() => setNow(new Date()), []);

  useFocusEffect(
    useCallback(() => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const scheduleRefresh = () => {
        const delay = Math.min(
          getMillisecondsUntilNextCinemaDay(timezone),
          60_000
        );
        timeout = setTimeout(() => {
          refresh();
          scheduleRefresh();
        }, delay);
      };

      refresh();
      scheduleRefresh();

      return () => {
        if (timeout !== null) clearTimeout(timeout);
      };
    }, [refresh, timezone])
  );

  return now;
}
