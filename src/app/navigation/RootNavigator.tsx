import { useCallback } from 'react';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';
import { colors } from '@shared/config/theme';
import { CatalogScreen, ProductDetailScreen } from '@features/catalog';

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
  return <ProductDetailScreen productId={route.params.id} />;
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
