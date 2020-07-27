module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ["core-js"],
  transform: {
    "^.+\\.jsx?$": "babel-jest", // Adding this line solved the issue
    "^.+\\.tsx?$": "ts-jest"
  },
};
