import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildKnowledgeIntegrityReport,
  coverageGaps,
} from '../../src/utils/knowledgeIntegrity.ts';

test('knowledge graph structural integrity is clean', () => {
  const report = buildKnowledgeIntegrityReport();

  assert.equal(report.ok, true, report.structuralIssues.map(issue => issue.detail).join('\n'));
  assert.deepEqual(report.structuralIssues, []);
  assert.ok(report.summary.conceptCount > 0);
  assert.ok(report.summary.domainCount > 0);
  assert.ok(report.summary.lessonCount > 0);
  assert.ok(report.summary.quizCount > 0);
});

test('content coverage distinguishes missing learning resources from missing assessment', () => {
  const report = buildKnowledgeIntegrityReport();
  const gaps = coverageGaps(report);

  assert.equal(gaps.length, report.coverage.filter(row => !row.hasDirectLearningResource || !row.hasAssessment).length);
  assert.equal(
    report.summary.conceptsWithDirectLearningResource + report.summary.conceptsWithNoDirectResource,
    report.summary.conceptCount,
  );
  assert.equal(
    report.summary.conceptsWithAssessment + report.summary.conceptsWithNoAssessment,
    report.summary.conceptCount,
  );

  for (const row of report.coverage) {
    assert.equal(
      row.resourceCount,
      row.lessonCount + row.formulaCount + row.quizCount + row.atomCount + row.toolCount,
    );
  }
});
