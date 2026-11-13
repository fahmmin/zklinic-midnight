import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createZkClinicServer } from "./server.js";

// Package root is two levels up from dist/src (built) or one from src (tsx); .env.local wins over .env.
const here = dirname(fileURLToPath(import.meta.url));
const root = here.endsWith(join("dist", "src")) ? join(here, "..", "..") : join(here, "..");
loadEnv({ path: [join(root, ".env.local"), join(root, ".env")], quiet: true });

const { server } = createZkClinicServer();
const port = Number(process.env.PORT ?? "4100");

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`zkclinic verification api listening on ${port}`);
});
