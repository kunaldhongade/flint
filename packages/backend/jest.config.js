module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@flint/shared$': '<rootDir>/../shared/src/index.ts',
    '^../utils/logger$': '<rootDir>/src/utils/logger',
    '^./blockchain$': '<rootDir>/src/services/blockchain',
    '^./fdc$': '<rootDir>/src/services/fdc',
    '^./ftso$': '<rootDir>/src/services/ftso',
    '^./risk$': '<rootDir>/src/services/risk'
  }
};
