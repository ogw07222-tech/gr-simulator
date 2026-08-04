import { defineConfig } from "vite";
import process from "node:process";

const GITHUB_PAGES_BASE = "/gr-simulator/";

export default defineConfig(() => ({
  base: process.env.GITHUB_PAGES === "true" ? GITHUB_PAGES_BASE : "/",
}));
