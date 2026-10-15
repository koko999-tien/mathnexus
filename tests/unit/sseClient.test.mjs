import test from 'node:test';
import assert from 'node:assert/strict';
import { createSseParser } from '../../src/utils/sseClient.ts';

test('SSE parser ghep chunk cat ngang JSON', () => {
  const events = [];
  const parser = createSseParser(event => events.push(event));

  parser.feed('data: {"type":"delta","delta":"Chào');
  assert.equal(events.length, 0);
  parser.feed(' bạn"}\n\ndata: {"type":"done","text":"Chào bạn"}\n\n');

  assert.equal(events.length, 2);
  assert.equal(events[0].delta, 'Chào bạn');
  assert.equal(events[1].type, 'done');
});

test('SSE parser bo qua dong rac va [DONE]', () => {
  const events = [];
  const parser = createSseParser(event => events.push(event));

  parser.feed(': ping\n\ndata: [DONE]\n\ndata: not-json\n\ndata: {"type":"delta","delta":"ok"}\n\n');

  assert.equal(events.length, 1);
  assert.equal(events[0].delta, 'ok');
});

test('finish day buffer con do', () => {
  const events = [];
  const parser = createSseParser(event => events.push(event));

  parser.feed('data: {"type":"delta","delta":"x"}');
  assert.equal(events.length, 0);
  parser.finish();

  assert.equal(events.length, 1);
  assert.equal(events[0].delta, 'x');
});
