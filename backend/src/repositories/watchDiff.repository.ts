import { receitaPool } from "../lib/receitaDb.js";

export type WatchSnapshotRow = {
  id: string;
  watch_id: string;
  snapshot: WatchMonitorSnapshot;
  created_at: string;
};

export type WatchMonitorSnapshot = {
  cnpjBasico: string;
  capturedAt: string;
  partners: string[];
  partnerLabels: Record<string, string>;
  phones: string[];
  emails: string[];
};

export type WatchDiffEventInput = {
  category: "partners" | "phones" | "emails";
  changeType: "added" | "removed" | "baseline";
  description: string;
};

export type WatchDiffEventRow = WatchDiffEventInput & {
  id: string;
  watch_id: string;
  created_at: string;
};

export async function getLatestWatchSnapshot(watchId: string): Promise<WatchSnapshotRow | null> {
  const { rows } = await receitaPool.query<{
    id: string;
    watch_id: string;
    snapshot: WatchMonitorSnapshot;
    created_at: string;
  }>(
    `
      select id, watch_id, snapshot, created_at::text
      from investigation_watch_snapshot
      where watch_id = $1
      order by created_at desc
      limit 1
    `,
    [watchId],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    watch_id: row.watch_id,
    snapshot: row.snapshot,
    created_at: row.created_at,
  };
}

export async function insertWatchSnapshot(watchId: string, snapshot: WatchMonitorSnapshot): Promise<void> {
  await receitaPool.query(
    `
      insert into investigation_watch_snapshot (watch_id, snapshot)
      values ($1, $2::jsonb)
    `,
    [watchId, JSON.stringify(snapshot)],
  );
}

export async function insertWatchEvents(watchId: string, events: WatchDiffEventInput[]): Promise<void> {
  if (events.length === 0) return;

  const values: unknown[] = [];
  const placeholders = events.map((event, index) => {
    const base = index * 4;
    values.push(watchId, event.category, event.changeType, event.description);
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
  });

  await receitaPool.query(
    `
      insert into investigation_watch_event (watch_id, category, change_type, description)
      values ${placeholders.join(", ")}
    `,
    values,
  );
}

export async function listRecentWatchEvents(watchId: string, limit = 20): Promise<WatchDiffEventRow[]> {
  const { rows } = await receitaPool.query<{
    id: string;
    watch_id: string;
    category: WatchDiffEventInput["category"];
    change_type: WatchDiffEventInput["changeType"];
    description: string;
    created_at: string;
  }>(
    `
      select id, watch_id, category, change_type, description, created_at::text
      from investigation_watch_event
      where watch_id = $1
      order by created_at desc
      limit $2
    `,
    [watchId, limit],
  );

  return rows.map((row) => ({
    id: row.id,
    watch_id: row.watch_id,
    category: row.category,
    changeType: row.change_type,
    description: row.description,
    created_at: row.created_at,
  }));
}
