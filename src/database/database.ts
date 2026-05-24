import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('tasky.db');
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON;');

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS grouped_tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_synced INT DEFAULT 0,
      is_deleted INT DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      grouped_task_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      due_date TIMESTAMP,
      status TEXT DEFAULT 'ongoing',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_synced INT DEFAULT 0,
      is_deleted INT DEFAULT 0,
      FOREIGN KEY (grouped_task_id) REFERENCES grouped_tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      grouped_task_id TEXT,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_synced INT DEFAULT 0,
      is_deleted INT DEFAULT 0,
      FOREIGN KEY (grouped_task_id) REFERENCES grouped_tasks(id) ON DELETE CASCADE
    );

    DROP VIEW IF EXISTS global_timeline;
    CREATE VIEW IF NOT EXISTS global_timeline AS
      SELECT id AS item_id, grouped_task_id AS group_id, title AS display_text, 'task_created' AS event_type, created_at AS event_date
      FROM tasks WHERE is_deleted = 0
      UNION ALL
      SELECT id AS item_id, grouped_task_id AS group_id, title AS display_text, 'task_due' AS event_type, due_date AS event_date
      FROM tasks WHERE due_date IS NOT NULL AND is_deleted = 0
      UNION ALL
      SELECT id AS item_id, grouped_task_id AS group_id, SUBSTR(content, 1, 80) AS display_text, 'note_created' AS event_type, created_at AS event_date
      FROM notes WHERE is_deleted = 0;
  `);
}
