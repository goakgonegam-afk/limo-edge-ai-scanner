import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Keep the JSON store out of the repository during tests.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "limo-edge-test-"));
