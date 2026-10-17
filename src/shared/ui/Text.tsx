import { Text as RNText, type TextProps } from 'react-native';
import {
  colors,
  typography,
  type TypographyVariant,
} from '@shared/config/theme';

type Props = Omit<TextProps, 'style'> & {
  variant?: TypographyVariant;
  color?: keyof typeof colors;
};

export function Text({
  variant = 'body',
  color = 'textPrimary',
  ...rest
}: Props) {
  return (
    <RNText style={[typography[variant], { color: colors[color] }]} {...rest} />
  );
}
