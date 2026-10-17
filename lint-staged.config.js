// A file must match exactly one key: separate keys run concurrently and would
// race when writing the same file.
module.exports = {
  '{src/**/*.{ts,tsx},*.tsx}': ['eslint --fix', 'prettier --write'],
  '*.{js,json,yml}': 'prettier --write',
};
