import React, { createContext, useContext, useEffect, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database/database';
import { seedDatabase } from '../database/seed';

interface DatabaseContextValue {
  db: SQLiteDatabase | null;
  loading: boolean;
}

const DatabaseContext = createContext<DatabaseContextValue>({ db: null, loading: true });

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const database = await getDatabase();
      await seedDatabase(database);
      setDb(database);
      setLoading(false);
    })();
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, loading }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): DatabaseContextValue {
  return useContext(DatabaseContext);
}
