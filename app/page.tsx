'use client';

import { useState, useEffect } from 'react';
import { db, Todo } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

export default function Home() {
  const [input, setInput] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string>('');

  // خوندن Todo ها از IndexedDB (real-time!)
  const todos = useLiveQuery(
    () => db.todos.orderBy('createdAt').reverse().toArray(),
    []
  ) || [];

  // چک کردن وضعیت اینترنت
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncPendingTodos(); // sync کردن Todo های آفلاین
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // اضافه کردن Todo
  const addTodo = async () => {
    if (input.trim()) {
      const newTodo: Todo = {
        text: input,
        completed: false,
        createdAt: Date.now(),
        synced: isOnline, // اگه آنلاین بود synced=true، وگرنه false
      };

      await db.todos.add(newTodo);
      setInput('');

      // اگه آنلاین بود، فوراً به API بفرست
      if (isOnline) {
        // فعلاً فقط لاگ می‌کنیم (بعداً API واقعی)
        console.log('✅ Sending to API:', newTodo);
        // await fetch('/api/todos', { method: 'POST', body: JSON.stringify(newTodo) });
      } else {
        setSyncStatus('⏳ Todo شما بعد از اتصال ارسال میشه');
        setTimeout(() => setSyncStatus(''), 3000);
      }
    }
  };

  // Toggle کردن Todo
  const toggleTodo = async (id: number) => {
    await db.todos.update(id, { 
      completed: !todos.find(t => t.id === id)?.completed 
    });
  };

  // حذف Todo
  const deleteTodo = async (id: number) => {
    await db.todos.delete(id);
  };

  // Sync کردن Todo های آفلاین
  const syncPendingTodos = async () => {
    const pendingTodos = await db.todos
      .filter(todo => !todo.synced)
      .toArray();

    if (pendingTodos.length > 0) {
      setSyncStatus(`🔄 در حال sync کردن ${pendingTodos.length} Todo...`);

      for (const todo of pendingTodos) {
        // فعلاً فقط لاگ می‌کنیم (بعداً API واقعی)
        console.log('📤 Syncing to API:', todo);
        // await fetch('/api/todos', { method: 'POST', body: JSON.stringify(todo) });

        // علامت بزن که sync شد
        await db.todos.update(todo.id!, { synced: true });
      }

      setSyncStatus('✅ همه Todo ها sync شدن!');
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  // پاک کردن همه Todo ها
  const clearAll = async () => {
    if (confirm('همه Todo ها پاک بشن?')) {
      await db.todos.clear();
    }
  };

  // تعداد Todo های sync نشده
  const unsyncedCount = todos.filter(t => !t.synced).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto pt-10">
        {/* هدر */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📝 Todo PWA با IndexedDB
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isOnline ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-gray-600">
                {isOnline ? 'آنلاین' : 'آفلاین'}
              </span>
            </div>
            
            {unsyncedCount > 0 && (
              <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                ⏳ {unsyncedCount} Todo sync نشده
              </span>
            )}
          </div>

          {syncStatus && (
            <div className="mt-3 text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
              {syncStatus}
            </div>
          )}
        </div>

        {/* فرم اضافه کردن */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
              placeholder="یه کار جدید اضافه کن..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addTodo}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              اضافه کن
            </button>
          </div>
        </div>

        {/* دکمه‌های کنترل */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4 flex gap-2">
          <button
            onClick={syncPendingTodos}
            disabled={!isOnline || unsyncedCount === 0}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            🔄 Sync کردن ({unsyncedCount})
          </button>
          <button
            onClick={clearAll}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            🗑️ پاک کردن همه
          </button>
        </div>

        {/* لیست Todo ها */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {todos.length === 0 ? (
            <p className="text-center text-gray-500">هیچ کاری نداری! 🎉</p>
          ) : (
            <ul className="space-y-2">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition ${
                    !todo.synced ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id!)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <span
                    className={`flex-1 ${
                      todo.completed
                        ? 'line-through text-gray-500'
                        : 'text-gray-800'
                    }`}
                  >
                    {todo.text}
                  </span>
                  
                  {!todo.synced && (
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                      ⏳ منتظر sync
                    </span>
                  )}
                  
                  <button
                    onClick={() => deleteTodo(todo.id!)}
                    className="text-red-500 hover:text-red-700 font-bold"
                  >
                    ❌
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 text-center text-sm text-gray-500">
            {todos.filter(t => !t.completed).length} کار باقی مونده
          </div>
        </div>

        {/* توضیحات */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 mb-2">💡 تست کن:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>چند تا Todo اضافه کن (آنلاین)</li>
            <li>اینترنت رو قطع کن (DevTools → Network → Offline)</li>
            <li>چند تا Todo دیگه اضافه کن (آفلاین)</li>
            <li>اینترنت رو وصل کن</li>
            <li>ببین Todo های آفلاین خودکار sync میشن!</li>
          </ol>
        </div>
      </div>
    </main>
  );
}