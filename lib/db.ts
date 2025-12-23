import Dexie, { Table } from 'dexie';

export interface Todo {
  id?: number;
  text: string;
  completed: boolean;
  createdAt: number;
  synced: boolean; // آیا با سرور sync شده؟
}

export class TodoDatabase extends Dexie {
  todos!: Table<Todo>;

  constructor() {
    super('TodoPWADB');
    
    this.version(1).stores({
      todos: '++id, text, completed, createdAt, synced'
    });
  }
}

export const db = new TodoDatabase();