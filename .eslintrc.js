// Layering keeps dependencies pointing one way: app composes features, features
// build on shared, shared knows nothing about the product. A feature reaching
// into another feature's internals would make slices impossible to change or
// delete independently, so cross-feature access goes through index.ts only.
module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['/android/', '/ios/', '/node_modules/', '/coverage/'],
  plugins: ['boundaries'],
  settings: {
    'import/resolver': {
      typescript: { project: './tsconfig.json' },
    },
    'boundaries/elements': [
      { type: 'app', pattern: 'src/app' },
      { type: 'feature', pattern: 'src/features/*' },
      { type: 'shared', pattern: 'src/shared' },
    ],
  },
  rules: {
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          { from: 'app', allow: ['feature', 'shared'] },
          { from: 'feature', allow: ['shared', 'feature'] },
          { from: 'shared', allow: [] },
        ],
      },
    ],
    'boundaries/entry-point': [
      'error',
      {
        default: 'disallow',
        rules: [
          { target: 'feature', allow: 'index.ts' },
          { target: ['app', 'shared'], allow: '**' },
        ],
      },
    ],
  },
};
