module.exports = {
    testEnvironment: 'node',
    verbose: true,
    transform: {
      '^.+\\.m?js$': 'babel-jest', // or any other appropriate transformation
    },
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/$1',
    },
    moduleFileExtensions: ['js', 'mjs'], // Include 'js' for JavaScript files, 'mjs' for ES modules
    testMatch: ['<rootDir>/tests/*.mjs'], // Adjust if your test files have a different pattern or location
  };
  