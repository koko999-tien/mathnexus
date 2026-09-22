import { MATH_CONCEPTS, MATH_DOMAINS } from '../data/mathKnowledge.ts';
import { LESSONS } from '../data/lessons.ts';
import { QUIZ } from '../data/quiz.ts';
import { FORMS } from '../data/formulas.ts';
import { MATH_ATOMS, QUIZ_CONCEPT_MAP } from '../data/mathOntology.ts';

export interface KnowledgeIntegrityIssue {
  type: string;
  id: string;
  detail: string;
}

export interface ConceptCoverageRow {
  conceptId: string;
  title: string;
  domain: string;
  lessonCount: number;
  formulaCount: number;
  quizCount: number;
  atomCount: number;
  toolCount: number;
  resourceCount: number;
  hasDirectLearningResource: boolean;
  hasAssessment: boolean;
}

export interface KnowledgeIntegrityReport {
  ok: boolean;
  structuralIssues: KnowledgeIntegrityIssue[];
  coverage: ConceptCoverageRow[];
  summary: {
    conceptCount: number;
    domainCount: number;
    lessonCount: number;
    formulaCount: number;
    quizCount: number;
    atomCount: number;
    conceptsWithDirectLearningResource: number;
    conceptsWithAssessment: number;
    conceptsWithNoDirectResource: number;
    conceptsWithNoAssessment: number;
  };
}

function duplicates(values: readonly string[]) {
  const seen = new Set<string>();
  const duplicate = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value);
    seen.add(value);
  }
  return [...duplicate].sort();
}

function pushDuplicateIssues(
  issues: KnowledgeIntegrityIssue[],
  type: string,
  label: string,
  values: readonly string[],
) {
  for (const id of duplicates(values)) {
    issues.push({ type, id, detail: `Duplicate ${label} id: ${id}` });
  }
}

function detectCycles(
  nodes: readonly string[],
  edgesFor: (id: string) => readonly string[],
  type: string,
) {
  const issues: KnowledgeIntegrityIssue[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const stack: string[] = [];
  const reported = new Set<string>();

  function walk(id: string) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(Math.max(0, start)), id];
      const signature = cycle.join(' -> ');
      if (!reported.has(signature)) {
        reported.add(signature);
        issues.push({
          type,
          id,
          detail: `Cycle detected: ${signature}`,
        });
      }
      return;
    }

    visiting.add(id);
    stack.push(id);
    for (const next of edgesFor(id)) walk(next);
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }

  for (const node of nodes) walk(node);
  return issues;
}

export function buildKnowledgeIntegrityReport(): KnowledgeIntegrityReport {
  const issues: KnowledgeIntegrityIssue[] = [];

  const conceptIds = MATH_CONCEPTS.map(item => item.id);
  const domainIds = MATH_DOMAINS.map(item => item.id);
  const lessonIds = LESSONS.map(item => item.id);
  const formulaIds = FORMS.map(item => item.id);
  const quizIds = QUIZ.map(item => item.id);
  const atomIds = MATH_ATOMS.map(item => item.id);

  pushDuplicateIssues(issues, 'duplicate-concept', 'concept', conceptIds);
  pushDuplicateIssues(issues, 'duplicate-domain', 'domain', domainIds);
  pushDuplicateIssues(issues, 'duplicate-lesson', 'lesson', lessonIds);
  pushDuplicateIssues(issues, 'duplicate-formula', 'formula', formulaIds);
  pushDuplicateIssues(issues, 'duplicate-quiz', 'quiz', quizIds);
  pushDuplicateIssues(issues, 'duplicate-atom', 'atom', atomIds);

  const conceptSet = new Set(conceptIds);
  const domainSet = new Set(domainIds);
  const lessonSet = new Set(lessonIds);
  const formulaSet = new Set(formulaIds);
  const quizSet = new Set(quizIds);
  const atomSet = new Set(atomIds);

  for (const concept of MATH_CONCEPTS) {
    if (!domainSet.has(concept.domain)) {
      issues.push({
        type: 'unknown-domain',
        id: concept.id,
        detail: `Concept ${concept.id} references unknown domain ${concept.domain}`,
      });
    }

    for (const prerequisite of concept.prerequisites) {
      if (!conceptSet.has(prerequisite)) {
        issues.push({
          type: 'missing-prerequisite',
          id: concept.id,
          detail: `Concept ${concept.id} references missing prerequisite ${prerequisite}`,
        });
      }
    }

    for (const lessonId of concept.lessonIds || []) {
      if (!lessonSet.has(lessonId)) {
        issues.push({
          type: 'missing-lesson',
          id: concept.id,
          detail: `Concept ${concept.id} references missing lesson ${lessonId}`,
        });
      }
    }

    for (const formulaId of concept.formulaIds || []) {
      if (!formulaSet.has(formulaId)) {
        issues.push({
          type: 'missing-formula',
          id: concept.id,
          detail: `Concept ${concept.id} references missing formula ${formulaId}`,
        });
      }
    }
  }

  issues.push(...detectCycles(
    conceptIds,
    id => MATH_CONCEPTS.find(item => item.id === id)?.prerequisites || [],
    'concept-cycle',
  ));

  for (const [questionId, conceptId] of Object.entries(QUIZ_CONCEPT_MAP)) {
    if (!quizSet.has(questionId)) {
      issues.push({
        type: 'unknown-quiz-mapping',
        id: questionId,
        detail: `Quiz mapping references missing quiz ${questionId}`,
      });
    }
    if (!conceptSet.has(conceptId)) {
      issues.push({
        type: 'unknown-quiz-concept',
        id: questionId,
        detail: `Quiz ${questionId} maps to missing concept ${conceptId}`,
      });
    }
  }

  for (const quiz of QUIZ) {
    if (!(quiz.id in QUIZ_CONCEPT_MAP)) {
      issues.push({
        type: 'unmapped-quiz',
        id: quiz.id,
        detail: `Quiz ${quiz.id} has no concept mapping`,
      });
    }
  }

  for (const atom of MATH_ATOMS) {
    if (!conceptSet.has(atom.conceptId)) {
      issues.push({
        type: 'unknown-atom-concept',
        id: atom.id,
        detail: `Atom ${atom.id} references missing concept ${atom.conceptId}`,
      });
    }

    for (const dependency of atom.dependsOn || []) {
      if (!atomSet.has(dependency)) {
        issues.push({
          type: 'missing-atom-dependency',
          id: atom.id,
          detail: `Atom ${atom.id} depends on missing atom ${dependency}`,
        });
      }
    }
  }

  issues.push(...detectCycles(
    atomIds,
    id => MATH_ATOMS.find(item => item.id === id)?.dependsOn || [],
    'atom-cycle',
  ));

  const quizCountByConcept = new Map<string, number>();
  for (const conceptId of Object.values(QUIZ_CONCEPT_MAP)) {
    quizCountByConcept.set(conceptId, (quizCountByConcept.get(conceptId) || 0) + 1);
  }

  const atomCountByConcept = new Map<string, number>();
  for (const atom of MATH_ATOMS) {
    atomCountByConcept.set(atom.conceptId, (atomCountByConcept.get(atom.conceptId) || 0) + 1);
  }

  const coverage = MATH_CONCEPTS.map(concept => {
    const lessonCount = concept.lessonIds?.length || 0;
    const formulaCount = concept.formulaIds?.length || 0;
    const quizCount = quizCountByConcept.get(concept.id) || 0;
    const atomCount = atomCountByConcept.get(concept.id) || 0;
    const toolCount = concept.toolPaths?.length || 0;
    const resourceCount = lessonCount + formulaCount + quizCount + atomCount + toolCount;

    return {
      conceptId: concept.id,
      title: concept.title,
      domain: concept.domain,
      lessonCount,
      formulaCount,
      quizCount,
      atomCount,
      toolCount,
      resourceCount,
      hasDirectLearningResource: lessonCount > 0 || atomCount > 0 || toolCount > 0,
      hasAssessment: quizCount > 0,
    };
  });

  return {
    ok: issues.length === 0,
    structuralIssues: issues,
    coverage,
    summary: {
      conceptCount: MATH_CONCEPTS.length,
      domainCount: MATH_DOMAINS.length,
      lessonCount: LESSONS.length,
      formulaCount: FORMS.length,
      quizCount: QUIZ.length,
      atomCount: MATH_ATOMS.length,
      conceptsWithDirectLearningResource: coverage.filter(row => row.hasDirectLearningResource).length,
      conceptsWithAssessment: coverage.filter(row => row.hasAssessment).length,
      conceptsWithNoDirectResource: coverage.filter(row => !row.hasDirectLearningResource).length,
      conceptsWithNoAssessment: coverage.filter(row => !row.hasAssessment).length,
    },
  };
}

export function coverageGaps(report = buildKnowledgeIntegrityReport()) {
  return report.coverage
    .filter(row => !row.hasDirectLearningResource || !row.hasAssessment)
    .sort((a, b) =>
      Number(a.hasDirectLearningResource) - Number(b.hasDirectLearningResource)
      || Number(a.hasAssessment) - Number(b.hasAssessment)
      || a.resourceCount - b.resourceCount
      || a.title.localeCompare(b.title, 'vi')
    );
}
