import { useNetworkMonitor } from '@features/connectivity';
import { useQueueSync } from '@features/favorites';

// Mounted once for the whole app, not per screen: the subscription and the
// drain must outlive navigation, and a second copy on another screen would
// start a second drain.
export function AppServices() {
  useNetworkMonitor();
  useQueueSync();

  return null;
}
