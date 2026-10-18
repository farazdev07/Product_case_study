import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';
import { colors, spacing } from '@shared/config/theme';
import { Screen, Text } from '@shared/ui';
import { CatalogScreen } from '@features/catalog';

const Stack = createNativeStackNavigator<RootStackParamList>();

function CatalogRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Catalog'>) {
  // The feature stays unaware of navigation; this wrapper translates its
  // callback into a typed route push.
  const openProduct = useCallback(
    (id: number) => navigation.navigate('ProductDetail', { id }),
    [navigation],
  );

  return <CatalogScreen onProductPress={openProduct} />;
}

function ProductDetailRoute({
  route,
}: NativeStackScreenProps<RootStackParamList, 'ProductDetail'>) {
  return (
    <Screen>
      <View style={styles.content}>
        <Text variant="title">{`Detail for product ${route.params.id}`}</Text>
      </View>
    </Screen>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen
        name="Catalog"
        component={CatalogRoute}
        options={{ title: 'Products' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailRoute}
        options={{ title: 'Product' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
});
