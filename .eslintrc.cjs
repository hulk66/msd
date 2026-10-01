module.exports = {
  root: true,
  extends: 'airbnb-base',
  env: {
    browser: true,
  },
  // tools/, tests/, and vitest config are Node migration scripts, not served site code
  ignorePatterns: ['tools/', 'tests/', 'vitest.config.js'],
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
  },
};
