import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors, spacing } from '@shared/config/theme';
import { Text } from '@shared/ui';

type Props = {
  isOnline: boolean;
  queuedCount: number;
};

const ANIMATION_MS = 200;

// The count is a prop, not a selector on the favourites slice: favourites
// already depends on connectivity, and the reverse import would be a cycle.
// The app reads both slices and passes the values in.
const getMessage = (isOnline: boolean, queuedCount: number) => {
  if (!isOnline) {
    return 'Offline — Serving Cached Data';
  }

  return queuedCount > 0 ? 'Syncing Queued Actions' : null;
};

export function NetworkBanner({ isOnline, queuedCount }: Props) {
  const message = getMessage(isOnline, queuedCount);
  // Kept after `message` goes null so the text stays readable while the bar
  // fades out; it is cleared only when that animation has finished.
  const [rendered, setRendered] = useState(message);
  const progress = useRef(new Animated.Value(message ? 1 : 0)).current;

  useEffect(() => {
    if (message) {
      setRendered(message);
    }
    const animation = Animated.timing(progress, {
      toValue: message ? 1 : 0,
      duration: ANIMATION_MS,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !message) {
        setRendered(null);
      }
    });

    return () => animation.stop();
  }, [message, progress]);

  if (!rendered) {
    return null;
  }

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.bar,
        isOnline ? styles.syncing : styles.offline,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-spacing.md, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text variant="caption" color="onPrimary" centered>
        {rendered}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  offline: {
    backgroundColor: colors.textSecondary,
  },
  syncing: {
    backgroundColor: colors.primary,
  },
});
