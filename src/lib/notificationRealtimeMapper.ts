import type { NotificationItem } from '../context/NotificationContext';

export interface DbNotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export const dbNotifId = (rowId: string): string => `db_${rowId}`;

export function mapDbNotification(row: DbNotificationRow): NotificationItem {
  return {
    id: dbNotifId(row.id),
    title: row.title,
    body: row.body ?? '',
    url: row.url || '/admin',
    read: false,
    createdAt: row.created_at,
    data: { ...(row.metadata ?? {}), type: row.type },
  };
}
