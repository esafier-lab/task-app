module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    setupFiles: ["<rootDir>/jest.setup.js"],
    roots: ["<rootDir>/tests"],
    transform: {
      "^.+\\.(ts|tsx)$": "ts-jest",
    },
    transformIgnorePatterns: [],
    moduleFileExtensions: ["ts", "js", "json"],
  };
  