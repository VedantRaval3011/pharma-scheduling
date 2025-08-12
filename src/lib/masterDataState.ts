// utils/masterDataState.ts
export type Make = { _id: string; make: string };
export type Prefix = { _id: string; name: string; type: 'PREFIX' };
export type Suffix = { _id: string; name: string; type: 'SUFFIX' };

type ById<T extends { _id: string }> = T & Record<string, unknown>;

export function upsertById<T extends { _id: string }>(list: T[], updated: T): T[] {
  const idx = list.findIndex(i => i._id === updated._id);
  if (idx === -1) return [updated, ...list];
  const next = list.slice();
  next[idx] = { ...list[idx], ...updated };
  return next;
}

export function removeById<T extends { _id: string }>(list: T[], id: string): T[] {
  const idx = list.findIndex(i => i._id === id);
  if (idx === -1) return list;
  const next = list.slice();
  next.splice(idx, 1);
  return next;
}
