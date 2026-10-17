// A plain module rather than a context: the app has a single theme, so a
// provider would add a render dependency without anything to switch between.
export const colors = Object.freeze({
  background: '#F6F7F9',
  surface: '#FFFFFF',
  textPrimary: '#14181F',
  textSecondary: '#5B6472',
  primary: '#1F6FEB',
  onPrimary: '#FFFFFF',
  disabled: '#B8BFCA',
  border: '#DDE1E7',
  error: '#C62828',
});

export const spacing = Object.freeze({
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
});

export const radii = Object.freeze({
  sm: 4,
  md: 8,
  lg: 16,
});

export const typography = Object.freeze({
  title: Object.freeze({ fontSize: 24, fontWeight: '700' }),
  subtitle: Object.freeze({ fontSize: 18, fontWeight: '600' }),
  body: Object.freeze({ fontSize: 16, fontWeight: '400' }),
  caption: Object.freeze({ fontSize: 13, fontWeight: '400' }),
});

export type TypographyVariant = keyof typeof typography;
