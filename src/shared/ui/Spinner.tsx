import { ActivityIndicator } from 'react-native';
import { colors } from '@shared/config/theme';

type Props = {
  color?: keyof typeof colors;
};

export function Spinner({ color = 'primary' }: Props) {
  return <ActivityIndicator color={colors[color]} />;
}
