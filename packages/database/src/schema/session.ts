import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { user } from './user';

// Sesi login aktif. Dipakai untuk:
// - mencabut sesi saat logout (server-side revocation, bukan hanya hapus cookie)
// - membatasi masa berlaku sesi (NFR-SEC-04)
// - melacak aktivitas terakhir (dasar session timeout karena inaktivitas)
export const session = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 128 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_session_user').on(t.userId),
  index('idx_session_active').on(t.revokedAt, t.expiresAt),
]);
