import { readFileSync } from 'fs';
import path from 'path';
import process from 'process';

const packageName = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).name;

export { packageName };
