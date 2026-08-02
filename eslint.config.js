import js from "@eslint/js";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "playwright-report/**", "test-results/**"],
  },
  js.configs.recommended,
  {
    files: ["playwright.config.js"],
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      globals: {
        cancelAnimationFrame: "readonly",
        document: "readonly",
        requestAnimationFrame: "readonly",
        ResizeObserver: "readonly",
        structuredClone: "readonly",
        window: "readonly",
      },
    },
  },
  {
    files: ["tests/e2e/**/*.js"],
    languageOptions: {
      globals: {
        document: "readonly",
        Event: "readonly",
        window: "readonly",
      },
    },
  },
  {
    files: ["tests/unit/**/*.js"],
    languageOptions: {
      globals: {
        document: "readonly",
        Event: "readonly",
      },
    },
  },
];
