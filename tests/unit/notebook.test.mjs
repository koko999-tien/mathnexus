import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  lessonBlock,
  loadActiveId,
  loadNotes,
  questionBlock,
  saveActiveId,
  saveNotes,
  searchNotes,
} from '../../src/utils/notebook.ts';

const memory = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) } });
globalThis.window = new EventTarget();
beforeEach(() => memory.clear());

test('migrate tu so don cu sang ghi chu dau tien', () => {
  memory.set('mathnexus_notes', JSON.stringify('Đạo hàm của x² bằng 2x.'));
  const notes = loadNotes();
  assert.equal(notes.length, 1);
  assert.equal(notes[0].text, 'Đạo hàm của x² bằng 2x.');
  assert.ok(notes[0].id);
});

test('luu va doc nhieu ghi chu, nho ghi chu dang mo', () => {
  const created = loadNotes();
  const second = { id: 'note-b', title: 'Lượng giác', text: 'sin²+cos²=1', updatedAt: new Date().toISOString() };
  assert.equal(saveNotes([...created, second]), true);
  saveActiveId('note-b');
  assert.equal(loadActiveId('fallback'), 'note-b');
  const reloaded = loadNotes();
  assert.equal(reloaded.length, 2);
  assert.equal(reloaded[1].title, 'Lượng giác');
});

test('tim kiem khong dau, khong phan biet hoa thuong', () => {
  const notes = [
    { id: 'a', title: 'Đạo hàm', text: 'tốc độ thay đổi', updatedAt: '' },
    { id: 'b', title: 'Lượng giác', text: 'sin cos', updatedAt: '' },
  ];
  assert.deepEqual(searchNotes(notes, '').map(note => note.id), ['a', 'b']);
  assert.deepEqual(searchNotes(notes, 'dao ham').map(note => note.id), ['a']);
  assert.deepEqual(searchNotes(notes, 'SIN').map(note => note.id), ['b']);
  assert.deepEqual(searchNotes(notes, 'không có').map(note => note.id), []);
});

test('khoi tao block gan cau hoi va bai hoc', () => {
  const question = questionBlock('C(5,2) bằng?', '10', 'C(5,2)=10.');
  assert.match(question, /C\(5,2\) bằng\?/);
  assert.match(question, /Đáp án: 10/);
  assert.match(question, /Giải thích/);
  const lesson = lessonBlock('Đạo hàm', '/lesson/der');
  assert.match(lesson, /Đạo hàm/);
  assert.match(lesson, /\/lesson\/der/);
});
