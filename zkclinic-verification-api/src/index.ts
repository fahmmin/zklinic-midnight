import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createZkClinicServer } from "./server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "..", ".env") });

const { server } = createZkClinicServer();
const port = Number(process.env.PORT ?? "4100");

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`zkclinic verification api listening on ${port}`);
});
