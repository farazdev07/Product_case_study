import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { SEARCH_DEBOUNCE_MS } from '@shared/config/constants';
import { colors, radii, spacing, typography } from '@shared/config/theme';
import { useDebounce } from '@shared/lib/useDebounce';
import { Text } from '@shared/ui';
import {
  selectSearchTerm,
  setSearchTerm,
  type FiltersRootState,
} from '@features/catalog/model/filtersSlice';

export function SearchBar() {
  const dispatch = useDispatch();
  const store = useStore<FiltersRootState>();
  const searchTerm = useSelector(selectSearchTerm);

  // The input keeps the raw text so typing is never delayed; only the debounced
  // value reaches the store, and with it the network.
  const [input, setInput] = useState(searchTerm);
  const debounced = useDebounce(input, SEARCH_DEBOUNCE_MS);

  // Follow the store when something else changes the term (clear all, or the
  // clear button). The debounced value is skipped on purpose: it is the store
  // catching up with typing, and following it would overwrite what the user
  // typed in the meantime.
  const [previousTerm, setPreviousTerm] = useState(searchTerm);
  if (searchTerm !== previousTerm) {
    setPreviousTerm(searchTerm);
    if (searchTerm !== debounced) {
      setInput(searchTerm);
    }
  }

  useEffect(() => {
    // Read the store directly: depending on the term would make this effect
    // push a stale debounced value back right after an external clear.
    if (debounced !== store.getState().filters.searchTerm) {
      dispatch(setSearchTerm(debounced));
    }
  }, [debounced, dispatch, store]);

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="Search products"
        placeholder="Search products"
        placeholderTextColor={colors.textSecondary}
        value={input}
        onChangeText={setInput}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.input}
      />
      {input.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => dispatch(setSearchTerm(''))}
          style={styles.clear}
        >
          <Text color="textSecondary">Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
  },
  clear: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
