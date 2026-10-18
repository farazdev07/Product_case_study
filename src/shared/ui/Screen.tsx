import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors } from '@shared/config/theme';

type Props = PropsWithChildren<{
  // A native header already pads for the status bar; applying the top inset
  // again leaves an empty band under it.
  belowHeader?: boolean;
}>;

const ALL_EDGES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];
const BELOW_HEADER_EDGES: readonly Edge[] = ['right', 'bottom', 'left'];

export function Screen({ belowHeader = false, children }: Props) {
  return (
    <SafeAreaView
      edges={belowHeader ? BELOW_HEADER_EDGES : ALL_EDGES}
      style={styles.screen}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
