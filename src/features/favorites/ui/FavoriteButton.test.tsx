import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import {
  favoritesReducer,
  toggleFavorite,
} from '@features/favorites/model/favoritesSlice';
import { makeStore } from '@features/favorites/testing/testStore';
import { FavoriteButton } from '@features/favorites/ui/FavoriteButton';

const setup = () => {
  const store = makeStore();
  render(
    <Provider store={store}>
      <FavoriteButton productId={4} />
    </Provider>,
  );
  return store;
};

describe('FavoriteButton', () => {
  it('offers to add a product that is not a favourite', () => {
    setup();

    expect(
      screen.getByRole('button', { name: 'Add to favorites' }),
    ).not.toBeSelected();
    expect(screen.getByText('Save')).toBeOnTheScreen();
  });

  it('marks the product immediately and queues the action when pressed', () => {
    const store = setup();

    fireEvent.press(screen.getByRole('button', { name: 'Add to favorites' }));

    expect(store.getState().favorites.ids).toEqual([4]);
    expect(store.getState().favorites.queue).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Remove from favorites' }),
    ).toBeSelected();
    expect(screen.getByText('Saved')).toBeOnTheScreen();
  });

  it('removes the favourite on a second press', () => {
    const store = setup();

    fireEvent.press(screen.getByRole('button', { name: 'Add to favorites' }));
    fireEvent.press(
      screen.getByRole('button', { name: 'Remove from favorites' }),
    );

    expect(store.getState().favorites.ids).toEqual([]);
    expect(store.getState().favorites.queue).toEqual([]);
  });

  it('ignores other products', () => {
    const state = favoritesReducer(undefined, toggleFavorite(9));
    const store = makeStore(state);
    render(
      <Provider store={store}>
        <FavoriteButton productId={4} />
      </Provider>,
    );

    expect(screen.getByText('Save')).toBeOnTheScreen();
  });
});
