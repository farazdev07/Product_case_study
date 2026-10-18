import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppSelector } from '@app/store/hooks';
import { NetworkBanner } from '@features/connectivity';
import { selectQueueLength } from '@features/favorites';

// Both features' state is read here because neither may import the other's
// slice for this: the app is the one layer allowed to know about both. The
// native header is part of each screen, so the only place that is "below the
// header" is inside the screen's own content area; every route wraps itself.
export function ScreenWithBanner({ children }: PropsWithChildren) {
  const isOnline = useAppSelector(state => state.network.isOnline);
  const queuedCount = useAppSelector(selectQueueLength);

  return (
    <View style={styles.container}>
      <NetworkBanner isOnline={isOnline} queuedCount={queuedCount} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
