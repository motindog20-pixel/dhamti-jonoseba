import { DatabaseSync } from 'node:sqlite';
export function createClient({ url }) {
  const db = new DatabaseSync(url.replace(/^file:/, ''));
  return {
    raw: db,
    async execute(q) {
      const sql = typeof q === 'string' ? q : q.sql;
      const args = typeof q === 'string' ? [] : q.args || [];
      if (/^\s*create/i.test(sql)) { db.exec(sql); return { rows: [], rowsAffected: 0 }; }
      const stmt = db.prepare(sql);
      if (/^\s*(select|pragma)/i.test(sql)) return { rows: stmt.all(...args).map((r) => ({ ...r })), rowsAffected: 0 };
      const r = stmt.run(...args);
      return { rows: [], rowsAffected: Number(r.changes) };
    },
  };
}
