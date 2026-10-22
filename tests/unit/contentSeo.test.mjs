import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOOKS } from '../../src/data/books.ts';
import { FORMS } from '../../src/data/formulas.ts';
import { LESSONS } from '../../src/data/lessons.ts';
import { lessonDescription, lessonPlainText } from '../../src/data/lessonContent.ts';
import { QUIZ } from '../../src/data/quiz.ts';
import { STATIC_PAGE_SEO } from '../../src/data/seo.ts';

const sitemap = readFileSync(new URL('../../public/sitemap.xml', import.meta.url), 'utf8');
const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));

test('all library lessons are deep enough to be useful', () => {
  const short = LESSONS
    .map(lesson => ({ id: lesson.id, words: lessonPlainText(lesson).split(/\s+/).filter(Boolean).length }))
    .filter(lesson => lesson.words < 150);
  assert.deepEqual(short, []);
  assert.equal(new Set(LESSONS.map(lesson => lesson.id)).size, LESSONS.length);
});

test('lesson metadata is plain text and within search snippet limits', () => {
  for (const lesson of LESSONS) {
    const description = lessonDescription(lesson);
    assert.ok(description.length >= 80, `${lesson.id} description too short`);
    assert.ok(description.length <= 158, `${lesson.id} description too long`);
    assert.doesNotMatch(description, /<[^>]+>|&[a-z]+;/i);
  }
});

test('practice bank keeps a meaningful share of hard questions', () => {
  const hard = QUIZ.filter(question => question.difficulty === 'Khó');
  assert.ok(hard.length >= 15, `only ${hard.length} hard questions`);
  assert.equal(new Set(QUIZ.map(question => question.id)).size, QUIZ.length);
  for (const question of QUIZ) {
    assert.equal(new Set(question.a).size, question.a.length, `${question.id} has duplicate answers`);
    assert.ok(question.i >= 0 && question.i < question.a.length, `${question.id} has invalid answer index`);
  }
});

test('sitemap covers public learning content and leaves private routes out', () => {
  for (const lesson of LESSONS) {
    assert.match(sitemap, new RegExp(`/lesson/${lesson.id}<`));
  }
  for (const formula of FORMS) {
    assert.match(sitemap, new RegExp(`/formula/${formula.id}<`));
  }
  for (const book of BOOKS) {
    assert.match(sitemap, new RegExp(`/book/${book.id}<`));
  }
  for (const path of ['/privacy', '/terms', '/cosmos']) {
    assert.match(sitemap, new RegExp(`${path}<`));
  }
  for (const path of ['/progress', '/notebook', '/canvas', '/library/read', '/library/book']) {
    assert.doesNotMatch(sitemap, new RegExp(`${path}<`));
  }
  assert.equal((sitemap.match(/<url>/g) || []).length, 15 + LESSONS.length + FORMS.length + BOOKS.length);
});

test('SEO routes and Vercel static delivery are configured', () => {
  assert.equal(STATIC_PAGE_SEO['/privacy'].robots, 'index,follow');
  assert.equal(STATIC_PAGE_SEO['/terms'].robots, 'index,follow');
  assert.equal(STATIC_PAGE_SEO['/progress'].robots, 'noindex,nofollow');
  assert.equal(vercel.cleanUrls, true);
  assert.equal(vercel.trailingSlash, false);
  assert.equal('rewrites' in vercel, false);
});
