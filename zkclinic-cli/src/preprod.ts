import { inspect } from "node:util";
import { runCli } from "./cli.js";
import { PreprodConfig } from "./config.js";

function formatError(err: unknown): string {
  if (err instanceof Error) return `${err.message}${err.stack ? `\n${err.stack}` : ""}`;
  if (typeof err === "object" && err !== null) return inspect(err, { depth: 5, breakLength: 80 });
  return String(err);
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", formatError(err));
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", formatError(reason));
  process.exit(1);
});

try {
  await runCli(new PreprodConfig());
} catch (err) {
  console.error("Error:", formatError(err));
  process.exit(1);
}
