import { StyleSheet, View } from 'react-native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';
import { colors, spacing } from '@shared/config/theme';
import { Button, Screen, Text } from '@shared/ui';

const Stack = createNativeStackNavigator<RootStackParamList>();

function CatalogRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Catalog'>) {
  return (
    <Screen>
      <View style={styles.content}>
        <Text variant="title">Product Catalog</Text>
        <Button
          title="Open product 1"
          onPress={() => navigation.navigate('ProductDetail', { id: 1 })}
        />
      </View>
    </Screen>
  );
}

function ProductDetailRoute({
  route,
}: NativeStackScreenProps<RootStackParamList, 'ProductDetail'>) {
  return (
    <Screen>
      <View style={styles.content}>
        <Text variant="title">{`Product ${route.params.id}`}</Text>
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
