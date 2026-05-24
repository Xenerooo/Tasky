import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

function uuid(): string {
  return Crypto.randomUUID();
}

export async function seedDatabase(database: SQLiteDatabase): Promise<void> {
  const countResult = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM grouped_tasks'
  );
  if (countResult && countResult.count > 0) return;

  const group1Id = uuid();
  const group2Id = uuid();
  const group3Id = uuid();
  const now = new Date().toISOString();

  await database.runAsync(
    'INSERT INTO grouped_tasks (id, title, created_at) VALUES (?, ?, ?)',
    group1Id, 'Mid-terms Exam', now
  );
  await database.runAsync(
    'INSERT INTO grouped_tasks (id, title, created_at) VALUES (?, ?, ?)',
    group2Id, 'Meeting with Boss', now
  );
  await database.runAsync(
    'INSERT INTO grouped_tasks (id, title, created_at) VALUES (?, ?, ?)',
    group3Id, 'Side Project Ideas', now
  );

  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const nextWeek = new Date(Date.now() + 604800000).toISOString();
  const twoWeeks = new Date(Date.now() + 1209600000).toISOString();

  await database.runAsync(
    'INSERT INTO tasks (id, grouped_task_id, title, description, due_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    uuid(), group1Id, 'Study Chapter 5', 'Read through Chapter 5 of the textbook', tomorrow, 'ongoing', now
  );
  await database.runAsync(
    'INSERT INTO tasks (id, grouped_task_id, title, description, due_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    uuid(), group1Id, 'Practice Problems', 'Complete practice problems 1-10', nextWeek, 'ongoing', now
  );
  await database.runAsync(
    'INSERT INTO tasks (id, grouped_task_id, title, description, due_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    uuid(), group1Id, 'Review Notes', 'Review all lecture notes', twoWeeks, 'done', now
  );
  await database.runAsync(
    'INSERT INTO tasks (id, grouped_task_id, title, description, due_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    uuid(), group2Id, 'Prepare Agenda', 'List topics to discuss', tomorrow, 'ongoing', now
  );
  await database.runAsync(
    'INSERT INTO tasks (id, grouped_task_id, title, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    uuid(), group2Id, 'Send Follow-up Email', 'Send recap email after meeting', 'ongoing', now
  );
  await database.runAsync(
    'INSERT INTO tasks (id, grouped_task_id, title, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    uuid(), null, 'Buy groceries', 'Milk, eggs, bread', 'ongoing', now
  );
  await database.runAsync(
    'INSERT INTO tasks (id, grouped_task_id, title, status, created_at) VALUES (?, ?, ?, ?, ?)',
    uuid(), null, 'Call dentist', 'ongoing', now
  );

  await database.runAsync(
    'INSERT INTO notes (id, grouped_task_id, content, created_at) VALUES (?, ?, ?, ?)',
    uuid(), group1Id, 'Key insight: The professor emphasized that Chapter 5 builds on concepts from Chapter 3. Make sure to review the prerequisite material before diving deep.', now
  );
  await database.runAsync(
    'INSERT INTO notes (id, grouped_task_id, content, created_at) VALUES (?, ?, ?, ?)',
    uuid(), group2Id, 'Meeting notes: John wants to increase Q3 targets. Sarah suggested a new marketing approach. Action items: research competitor pricing.', now
  );
  await database.runAsync(
    'INSERT INTO notes (id, grouped_task_id, content, created_at) VALUES (?, ?, ?, ?)',
    uuid(), group3Id, 'Brainstorming: A mobile app that helps people track daily habits with gamification elements.', now
  );
  await database.runAsync(
    'INSERT INTO notes (id, content, created_at) VALUES (?, ?, ?)',
    uuid(), 'Quick thought: Remember to check the car tires before the weekend trip.', now
  );
}
