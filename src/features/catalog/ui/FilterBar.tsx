import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { spacing } from '@shared/config/theme';
import { Text } from '@shared/ui';
import { useGetCategoriesQuery } from '@features/catalog/api/catalogApi';
import {
  PRICE_OPTIONS,
  RATING_OPTIONS,
  SORT_OPTIONS,
  type FilterOption,
} from '@features/catalog/model/filterOptions';
import {
  clearFilters,
  selectActiveFilterCount,
  selectFilters,
  setCategory,
  setMaxPrice,
  setMinRating,
  setSortBy,
} from '@features/catalog/model/filtersSlice';
import { ChipRow } from '@features/catalog/ui/ChipRow';
import { SearchBar } from '@features/catalog/ui/SearchBar';

const ALL_CATEGORIES: FilterOption<string | null> = {
  value: null,
  label: 'All',
};

export function FilterBar() {
  const dispatch = useDispatch();
  const { categorySlug, maxPrice, minRating, sortBy } =
    useSelector(selectFilters);
  const activeCount = useSelector(selectActiveFilterCount);
  const [expanded, setExpanded] = useState(false);
  const { data: categories } = useGetCategoriesQuery();

  const categoryOptions: FilterOption<string | null>[] = [
    ALL_CATEGORIES,
    ...(categories ?? []).map(({ slug, name }) => ({
      value: slug,
      label: name,
    })),
  ];

  return (
    <View style={styles.bar}>
      <SearchBar />
      {categories ? (
        <ChipRow
          label="Category"
          options={categoryOptions}
          selected={categorySlug}
          onSelect={slug => dispatch(setCategory(slug))}
        />
      ) : null}
      <View style={styles.summary}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Hide filters' : 'More filters'}
          onPress={() => setExpanded(open => !open)}
        >
          <Text color="primary">
            {expanded ? 'Hide filters' : 'More filters'}
          </Text>
        </Pressable>
        {activeCount > 0 ? (
          <View style={styles.active}>
            <Text variant="caption" color="textSecondary">
              {`${activeCount} ${
                activeCount === 1 ? 'filter' : 'filters'
              } active`}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
              onPress={() => dispatch(clearFilters())}
            >
              <Text variant="caption" color="primary">
                Clear all
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {expanded ? (
        <View style={styles.panel}>
          <ChipRow
            label="Sort by"
            options={SORT_OPTIONS}
            selected={sortBy}
            onSelect={value => dispatch(setSortBy(value))}
          />
          <ChipRow
            label="Price"
            options={PRICE_OPTIONS}
            selected={maxPrice}
            onSelect={value => dispatch(setMaxPrice(value))}
          />
          <ChipRow
            label="Rating"
            options={RATING_OPTIONS}
            selected={minRating}
            onSelect={value => dispatch(setMinRating(value))}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  active: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  panel: {
    gap: spacing.sm,
  },
});
