// metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");

const config = getDefaultConfig(__dirname);

// Optional: add extra Metro config here
// e.g., for Nativewind / tailwindcss
// config.resolver.sourceExts.push("cjs");

module.exports = config;