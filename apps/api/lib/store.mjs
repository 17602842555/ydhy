import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { prepareInitialData } from './state.mjs';

export { clone, prepareInitialData } from './state.mjs';

export class JsonFileStore {
  constructor({ seed, filePath }) {
    this.seed = seed;
    this.filePath = filePath;
  }

  ensure() {
    if (existsSync(this.filePath)) return;
    mkdirSync(dirname(this.filePath), { recursive: true });
    this.write(prepareInitialData(this.seed));
  }

  read() {
    this.ensure();
    return prepareInitialData(JSON.parse(readFileSync(this.filePath, 'utf8')), this.seed);
  }

  write(data) {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    writeFileSync(tmpPath, `${JSON.stringify(prepareInitialData(data), null, 2)}\n`);
    renameSync(tmpPath, this.filePath);
  }

  resetFromSeed() {
    const data = prepareInitialData(this.seed);
    this.write(data);
    return data;
  }

  transaction(mutator) {
    const data = this.read();
    const result = mutator(data);
    this.write(data);
    return result;
  }
}
