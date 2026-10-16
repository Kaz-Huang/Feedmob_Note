import { closeSync, openSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Pre-create SQLite without truncating it. This also avoids the schema
// engine's create-file failure observed in the macOS Unicode workspace path.
closeSync(openSync(fileURLToPath(new URL('../prisma/dev.db', import.meta.url)), 'a'));
