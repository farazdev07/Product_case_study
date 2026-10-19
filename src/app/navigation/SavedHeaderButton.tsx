import { Pressable } from 'react-native';
import { useAppSelector } from '@app/store/hooks';
import { Text } from '@shared/ui';
import { selectFavoriteIds } from '@features/favorites';

type Props = {
  onPress: () => void;
};

export function SavedHeaderButton({ onPress }: Props) {
  const count = useAppSelector(state => selectFavoriteIds(state).length);
  const title = `Saved (${count})`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      hitSlop={8}
      onPress={onPress}
    >
      <Text variant="subtitle" color="primary">
        {title}
      </Text>
    </Pressable>
  );
}
