const path = require("path");

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  // Make sure Jest loads environment variables BEFORE any tests run
  setupFiles: [path.resolve(__dirname, "jest.setup.js")],

  roots: ["<rootDir>/tests"],

  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },

  // Ensures node_modules are transformed if needed
  transformIgnorePatterns: [],

  moduleFileExtensions: ["ts", "js", "json"],
};
