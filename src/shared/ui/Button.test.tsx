import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '@shared/ui/Button';

describe('Button', () => {
  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button title="Retry" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button title="Retry" onPress={onPress} disabled />);

    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress while loading and hides the title', () => {
    const onPress = jest.fn();
    render(<Button title="Retry" onPress={onPress} loading />);

    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.queryByText('Retry')).not.toBeOnTheScreen();
  });
});
