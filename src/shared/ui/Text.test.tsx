import { render, screen } from '@testing-library/react-native';
import {
  colors,
  typography,
  type TypographyVariant,
} from '@shared/config/theme';
import { Text } from '@shared/ui/Text';

describe('Text', () => {
  it.each(Object.keys(typography) as TypographyVariant[])(
    'applies the %s typography tokens',
    variant => {
      render(<Text variant={variant}>Hello</Text>);

      expect(screen.getByText('Hello')).toHaveStyle(typography[variant]);
    },
  );

  it('defaults to body text in the primary text colour', () => {
    render(<Text>Hello</Text>);

    expect(screen.getByText('Hello')).toHaveStyle({
      ...typography.body,
      color: colors.textPrimary,
    });
  });

  it('resolves the colour token', () => {
    render(<Text color="error">Hello</Text>);

    expect(screen.getByText('Hello')).toHaveStyle({ color: colors.error });
  });

  it('aligns left unless asked to centre', () => {
    render(<Text>Hello</Text>);

    expect(screen.getByText('Hello')).not.toHaveStyle({ textAlign: 'center' });
  });

  it('centres its text when asked', () => {
    render(<Text centered>Hello</Text>);

    expect(screen.getByText('Hello')).toHaveStyle({ textAlign: 'center' });
  });
});
