import { describe, it, expect } from 'vitest';
import { createApp } from './app.js';
import { registerCleanupTask, runCleanupTasks } from './lib/cleanup.js';

describe('createApp', () => {
  it('creates an express application with disabled x-powered-by', () => {
    const app = createApp();
    expect(app.get('x-powered-by')).toBe(false);
  });

  it('runs registered cleanup tasks in LIFO order', async () => {
    const executionOrder: string[] = [];

    registerCleanupTask('task-first', () => {
      executionOrder.push('first');
    });

    registerCleanupTask('task-second', () => {
      executionOrder.push('second');
    });

    await runCleanupTasks();

    expect(executionOrder).toEqual(['second', 'first']);
  });
});
