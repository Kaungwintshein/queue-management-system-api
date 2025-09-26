#!/usr/bin/env node

/**
 * Script to toggle API routes on/off for focused development
 * Usage: node toggle-apis.js [enable|disable] [all|auth-only]
 */

const fs = require("fs");
const path = require("path");

const APP_FILE = path.join(__dirname, "src", "app.ts");

const ROUTES_TO_TOGGLE = [
  "tokensRouter",
  "queueRouter",
  "staffRouter",
  "analyticsRouter",
  "countersRouter",
];

const IMPORTS_TO_TOGGLE = [
  '{ tokensRouter } from "@/routes/tokens"',
  '{ queueRouter } from "@/routes/queue"',
  '{ staffRouter } from "@/routes/staff"',
  '{ analyticsRouter } from "@/routes/analytics"',
  '{ countersRouter } from "@/routes/counters"',
  '{ setupWebSocket } from "@/services/websocketService"',
];

const ROUTE_USES_TO_TOGGLE = [
  'app.use("/api/tokens", tokensRouter)',
  'app.use("/api/queue", queueRouter)',
  'app.use("/api/staff", staffRouter)',
  'app.use("/api/analytics", analyticsRouter)',
  'app.use("/api/counters", countersRouter)',
];

const WEBSOCKET_TO_TOGGLE = ["setupWebSocket(io)"];

function readAppFile() {
  return fs.readFileSync(APP_FILE, "utf8");
}

function writeAppFile(content) {
  fs.writeFileSync(APP_FILE, content, "utf8");
}

function enableAllAPIs() {
  let content = readAppFile();

  // Enable imports
  IMPORTS_TO_TOGGLE.forEach((importLine) => {
    const commentedPattern = new RegExp(
      `//\\s*import\\s+${importLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "g"
    );
    content = content.replace(commentedPattern, `import ${importLine}`);
  });

  // Enable route uses
  ROUTE_USES_TO_TOGGLE.forEach((routeUse) => {
    const commentedPattern = new RegExp(
      `//\\s*${routeUse.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "g"
    );
    content = content.replace(commentedPattern, routeUse);
  });

  // Enable WebSocket
  WEBSOCKET_TO_TOGGLE.forEach((wsLine) => {
    const commentedPattern = new RegExp(
      `//\\s*${wsLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "g"
    );
    content = content.replace(commentedPattern, wsLine);
  });

  writeAppFile(content);
  console.log("✅ All APIs enabled");
}

function disableNonAuthAPIs() {
  let content = readAppFile();

  // Disable imports (add comments)
  IMPORTS_TO_TOGGLE.forEach((importLine) => {
    const pattern = new RegExp(
      `^(\\s*)import\\s+${importLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "gm"
    );
    content = content.replace(pattern, "$1// import " + importLine);
  });

  // Disable route uses (add comments)
  ROUTE_USES_TO_TOGGLE.forEach((routeUse) => {
    const pattern = new RegExp(
      `^(\\s*)${routeUse.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "gm"
    );
    content = content.replace(pattern, "$1// " + routeUse);
  });

  // Disable WebSocket (add comments)
  WEBSOCKET_TO_TOGGLE.forEach((wsLine) => {
    const pattern = new RegExp(
      `^(\\s*)${wsLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "gm"
    );
    content = content.replace(pattern, "$1// " + wsLine);
  });

  writeAppFile(content);
  console.log("✅ Non-auth APIs disabled (auth-only mode)");
}

function showUsage() {
  console.log(`
Usage: node toggle-apis.js [command]

Commands:
  enable     Enable all APIs (tokens, queue, staff, analytics, counters, websocket)
  disable    Disable non-auth APIs (keep only authentication)
  status     Show current status of APIs
  help       Show this help message

Examples:
  node toggle-apis.js disable   # Focus on auth only
  node toggle-apis.js enable    # Enable all APIs
  node toggle-apis.js status    # Check current state
`);
}

function showStatus() {
  const content = readAppFile();

  console.log("\n📊 API Status:");
  console.log("================");

  // Check auth status
  const authEnabled =
    content.includes('app.use("/api/auth", authRouter)') &&
    !content.includes('// app.use("/api/auth", authRouter)');
  console.log(
    `🔐 Authentication: ${authEnabled ? "✅ ENABLED" : "❌ DISABLED"}`
  );

  // Check other APIs
  ROUTE_USES_TO_TOGGLE.forEach((route) => {
    const enabled = content.includes(route) && !content.includes("// " + route);
    const apiName = route.match(/\/api\/(\w+)/)[1].toUpperCase();
    console.log(`📡 ${apiName}: ${enabled ? "✅ ENABLED" : "❌ DISABLED"}`);
  });

  // Check WebSocket
  const wsEnabled =
    content.includes("setupWebSocket(io)") &&
    !content.includes("// setupWebSocket(io)");
  console.log(`🔌 WebSocket: ${wsEnabled ? "✅ ENABLED" : "❌ DISABLED"}`);

  console.log("================\n");
}

// Main execution
const command = process.argv[2];

switch (command) {
  case "enable":
    enableAllAPIs();
    break;
  case "disable":
    disableNonAuthAPIs();
    break;
  case "status":
    showStatus();
    break;
  case "help":
  case "--help":
  case "-h":
    showUsage();
    break;
  default:
    console.log('❌ Invalid command. Use "help" for usage information.');
    showUsage();
    process.exit(1);
}
