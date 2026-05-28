import { prepareInitialData } from './state.mjs';

const defaultStateId = 'default';

export class D1StateStore {
  constructor({ db, seed, stateId = defaultStateId }) {
    if (!db) throw new Error('D1 binding DB is required');
    this.db = db;
    this.seed = seed;
    this.stateId = stateId;
  }

  async ensure() {
    await this.db
      .prepare(
        `create table if not exists app_state (
          id text primary key,
          payload text not null,
          updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        )`,
      )
      .run();
  }

  async read() {
    await this.ensure();
    const row = await this.db.prepare('select payload from app_state where id = ?').bind(this.stateId).first();
    if (!row?.payload) {
      const seeded = prepareInitialData(this.seed);
      await this.write(seeded);
      return seeded;
    }
    return prepareInitialData(JSON.parse(String(row.payload)), this.seed);
  }

  async write(data) {
    await this.ensure();
    await this.db
      .prepare(
        `insert into app_state (id, payload, updated_at)
         values (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         on conflict(id) do update set
           payload = excluded.payload,
           updated_at = excluded.updated_at`,
      )
      .bind(this.stateId, JSON.stringify(prepareInitialData(data)))
      .run();
  }

  async resetFromSeed() {
    const data = prepareInitialData(this.seed);
    await this.write(data);
    return data;
  }

  async transaction(mutator) {
    const data = await this.read();
    const result = mutator(data);
    await this.write(data);
    return result;
  }
}
