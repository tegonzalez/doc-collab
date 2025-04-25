declare module 'better-sqlite3' {
  namespace BetterSqlite3 {
    interface Database {
      prepare(sql: string): Statement;
      exec(sql: string): void;
      close(): void;
    }

    interface Statement {
      run(...params: any[]): RunResult;
      get(...params: any[]): any;
      all(...params: any[]): any[];
      iterate(...params: any[]): IterableIterator<any>;
    }

    interface RunResult {
      changes: number;
      lastInsertRowid: number | bigint;
    }
  }

  function BetterSqlite3(path: string, options?: any): BetterSqlite3.Database;
  export = BetterSqlite3;
} 