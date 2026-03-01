import { readFileSync } from "node:fs";

const packageJsonPath = new URL("./package.json", import.meta.url);
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const buildStamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const buildVersion = `${packageJson.version}+${buildStamp}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD_VERSION: buildVersion
  }
};

export default nextConfig;
