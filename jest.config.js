module.exports = {
  transform: {
    '^.+\\.m?js$': 'babel-jest', // Adjusted to include both .js and .mjs files
  },
  // Ensure Jest handles `.mjs` files
  moduleFileExtensions: ['js', 'json', 'jsx', 'node', 'mjs'],
  transformIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.js?(x)',
    '**/?(*.)+(spec|test).js?(x)',
    '**/__tests__/**/*.mjs',
    '**/?(*.)+(spec|test).mjs'
  ],
};
