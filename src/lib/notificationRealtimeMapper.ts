import type { NotificationItem } from '../context/NotificationContext';

export interface DbNotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  metadata: Record<string, any> | null;
  read_by?: string[] | null;
  created_at: string;
}

export const dbNotifId = (rowId: string): string => `db_${rowId}`;

/** Id crudo (uuid) a partir del id de la campanita (`db_<uuid>`). */
export const rawDbId = (notifId: string): string => notifId.replace(/^db_/, '');

/** `read` sale de read_by (leído cross-device): true si mi uid ya está. */
export function mapDbNotification(row: DbNotificationRow, uid?: string | null): NotificationItem {
  const read = !!uid && Array.isArray(row.read_by) && row.read_by.includes(uid);
  return {
    id: dbNotifId(row.id),
    title: row.title,
    body: row.body ?? '',
    url: row.url || '/admin',
    read,
    createdAt: row.created_at,
    data: { ...(row.metadata ?? {}), type: row.type },
  };
}
