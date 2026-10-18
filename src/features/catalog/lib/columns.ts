// Window widths in points. A phone in portrait stays on one column; a tablet in
// portrait gets two and in landscape three, so the cards keep a readable width
// instead of stretching across the screen.
const TWO_COLUMNS_FROM = 768;
const THREE_COLUMNS_FROM = 1100;

export const columnsForWidth = (width: number): number => {
  if (width >= THREE_COLUMNS_FROM) {
    return 3;
  }
  return width >= TWO_COLUMNS_FROM ? 2 : 1;
};
