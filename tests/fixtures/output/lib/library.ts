import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const packageName = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).name;

export { packageName };
