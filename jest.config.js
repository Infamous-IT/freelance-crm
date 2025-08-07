module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
      '^.+\\.(t|j)s$': ['ts-jest', {
        tsconfig: '<rootDir>/../tsconfig.json',
      }],
    },
    collectCoverageFrom: [
      '**/*.(t|j)s',
      '!**/*.module.ts',
      '!**/*.entity.ts',
      '!**/*.dto.ts',
      '!**/*.interface.ts',
      '!**/*.enum.ts',
      '!**/main.ts',
      '!**/index.ts',
      '!**/node_modules/**',
      '!**/coverage/**',
      '!**/dist/**',
      '!**/*.spec.ts',
      '!**/*.test.ts',
    ],
    coverageDirectory: '../coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json'],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    testEnvironment: 'node',
    moduleNameMapper: {
      '^src/(.*)$': '<rootDir>/$1',
    },
    testTimeout: 10000,
  };