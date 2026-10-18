import { StyleSheet, Text as RNText, type TextProps } from 'react-native';
import {
  colors,
  typography,
  type TypographyVariant,
} from '@shared/config/theme';

type Props = Omit<TextProps, 'style'> & {
  variant?: TypographyVariant;
  color?: keyof typeof colors;
  centered?: boolean;
};

export function Text({
  variant = 'body',
  color = 'textPrimary',
  centered = false,
  ...rest
}: Props) {
  return (
    <RNText
      style={[
        typography[variant],
        { color: colors[color] },
        centered && styles.centered,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    textAlign: 'center',
  },
});
