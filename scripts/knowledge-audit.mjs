import {
  buildKnowledgeIntegrityReport,
  coverageGaps,
} from '../src/utils/knowledgeIntegrity.ts';

const report = buildKnowledgeIntegrityReport();
const gaps = coverageGaps(report);

console.log('MathNexus knowledge integrity');
console.log('  concepts:', report.summary.conceptCount);
console.log('  domains:', report.summary.domainCount);
console.log('  lessons:', report.summary.lessonCount);
console.log('  formulas:', report.summary.formulaCount);
console.log('  quizzes:', report.summary.quizCount);
console.log('  ontology atoms:', report.summary.atomCount);
console.log('  concepts with direct learning resource:', report.summary.conceptsWithDirectLearningResource);
console.log('  concepts with assessment:', report.summary.conceptsWithAssessment);
console.log('  concepts with no direct resource:', report.summary.conceptsWithNoDirectResource);
console.log('  concepts with no assessment:', report.summary.conceptsWithNoAssessment);

if (gaps.length) {
  console.log('\nTop content coverage gaps:');
  for (const row of gaps.slice(0, 20)) {
    const missing = [
      !row.hasDirectLearningResource ? 'learning-resource' : '',
      !row.hasAssessment ? 'assessment' : '',
    ].filter(Boolean).join('+');
    console.log(
      '  -',
      row.conceptId,
      '[' + missing + ']',
      'lesson=' + row.lessonCount,
      'quiz=' + row.quizCount,
      'atom=' + row.atomCount,
      'formula=' + row.formulaCount,
      'tool=' + row.toolCount,
    );
  }
}

if (!report.ok) {
  console.error('\nStructural integrity errors:');
  for (const issue of report.structuralIssues) {
    console.error('  -', issue.type + ':', issue.detail);
  }
  process.exitCode = 1;
} else {
  console.log('\nStructural integrity: OK');
}
