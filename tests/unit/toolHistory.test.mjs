import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearToolHistory,
  historySignature,
  historyTime,
  loadToolHistory,
  pushToolHistory,
  saveToolHistory,
  TOOL_HISTORY_LIMIT,
} from '../../src/utils/toolHistory.ts';

const memory = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) } });
globalThis.window = new EventTarget();
beforeEach(() => memory.clear());

const make = (tool, input, result, at = new Date().toISOString()) => ({
  id: `calc-${tool}-${input}`,
  tool,
  title: tool,
  input,
  result,
  values: [],
  meta: '',
  at,
});

test('luu va doc lich su, bo qua ban ghi hong', () => {
  assert.equal(saveToolHistory([make('gcd', 'a=48', 'ƯCLN = 6')]), true);
  memory.set('mathnexus_tool_history_v1', JSON.stringify([{ tool: 'gcd' }, { tool: '', result: 'x' }, make('gcd', 'a=8', 'ok')]));
  const history = loadToolHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].input, 'a=8');
});

test('day lich su: trung thi dua len dau, gioi han 30', () => {
  let history = [];
  for (let index = 0; index < 105; index += 1) {
    history = pushToolHistory(history, make('gcd', `a=${index}`, `kq ${index}`));
  }
  assert.equal(history.length, TOOL_HISTORY_LIMIT);
  assert.equal(history[0].input, 'a=104');

  const repeated = make('gcd', 'a=103', 'kq 103');
  history = pushToolHistory(history, repeated);
  assert.equal(history.length, TOOL_HISTORY_LIMIT);
  assert.equal(historySignature(history[0]), historySignature(repeated));
  assert.equal(history.filter(entry => entry.input === 'a=103').length, 1);
});

test('xoa lich su', () => {
  saveToolHistory([make('gcd', 'a=48', 'ok')]);
  clearToolHistory();
  assert.deepEqual(loadToolHistory(), []);
});

test('thoi gian tuong doi de doc', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  assert.equal(historyTime(now.toISOString(), now), 'vừa xong');
  assert.equal(historyTime(new Date(now.getTime() - 5 * 60000).toISOString(), now), '5 phút trước');
  assert.equal(historyTime('khong-phai-ngay', now), '');
});
