import { MATH_CONCEPTS, CONCEPT_BY_ID, type MathConcept, type MathDomainId } from '../data/mathKnowledge';
import type { ProgressData } from './storage';

export type ConceptLearningState = 'covered' | 'ready' | 'locked' | 'gap';

export interface ConceptProgress {
  concept: MathConcept;
  state: ConceptLearningState;
  covered: boolean;
  prerequisiteIds: string[];
  unmetPrerequisiteIds: string[];
  depth: number;
}

export function getConcept(id: string) {
  return CONCEPT_BY_ID.get(id);
}

export function directDependents(id: string) {
  return MATH_CONCEPTS.filter(concept => concept.prerequisites.includes(id));
}

export function prerequisiteClosure(id: string): MathConcept[] {
  const ordered: MathConcept[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function walk(currentId: string) {
    if (visited.has(currentId)) return;
    if (visiting.has(currentId)) throw new Error('Knowledge graph contains a prerequisite cycle at ' + currentId);

    const current = getConcept(currentId);
    if (!current) throw new Error('Unknown concept referenced by knowledge graph: ' + currentId);

    visiting.add(currentId);
    for (const prerequisite of current.prerequisites) walk(prerequisite);
    visiting.delete(currentId);
    visited.add(currentId);

    if (currentId !== id) ordered.push(current);
  }

  walk(id);
  return ordered;
}

export function conceptDepth(id: string): number {
  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  function depth(currentId: string): number {
    if (memo.has(currentId)) return memo.get(currentId)!;
    if (visiting.has(currentId)) throw new Error('Knowledge graph contains a prerequisite cycle at ' + currentId);

    const concept = getConcept(currentId);
    if (!concept) throw new Error('Unknown concept referenced by knowledge graph: ' + currentId);
    if (!concept.prerequisites.length) {
      memo.set(currentId, 0);
      return 0;
    }

    visiting.add(currentId);
    const value = 1 + Math.max(...concept.prerequisites.map(depth));
    visiting.delete(currentId);
    memo.set(currentId, value);
    return value;
  }

  return depth(id);
}

export function coveredConceptIds(progress: ProgressData) {
  const read = new Set(progress.lessonsRead);
  return new Set(
    MATH_CONCEPTS
      .filter(concept => concept.lessonIds?.length && concept.lessonIds.every(id => read.has(id)))
      .map(concept => concept.id),
  );
}

export function conceptProgress(progress: ProgressData): ConceptProgress[] {
  const covered = coveredConceptIds(progress);

  return MATH_CONCEPTS.map(concept => {
    const unmet = concept.prerequisites.filter(id => !covered.has(id));
    const isCovered = covered.has(concept.id);
    const hasLearningResource = Boolean(concept.lessonIds?.length);

    let state: ConceptLearningState;
    if (isCovered) state = 'covered';
    else if (!hasLearningResource) state = unmet.length ? 'gap' : 'ready';
    else state = unmet.length ? 'locked' : 'ready';

    return {
      concept,
      state,
      covered: isCovered,
      prerequisiteIds: concept.prerequisites,
      unmetPrerequisiteIds: unmet,
      depth: conceptDepth(concept.id),
    };
  });
}

export function domainConcepts(domain: MathDomainId) {
  return MATH_CONCEPTS.filter(concept => concept.domain === domain);
}

export function learningPathTo(id: string) {
  const prerequisites = prerequisiteClosure(id);
  const target = getConcept(id);
  return target ? [...prerequisites, target] : prerequisites;
}

export function conceptForLesson(lessonId: string) {
  return MATH_CONCEPTS.find(concept => concept.lessonIds?.includes(lessonId));
}

export function readyConcepts(progress: ProgressData) {
  return conceptProgress(progress)
    .filter(item => item.state === 'ready')
    .sort((a, b) => a.depth - b.depth || a.concept.title.localeCompare(b.concept.title, 'vi'));
}

export function knowledgeGraphDiagnostics() {
  const ids = new Set(MATH_CONCEPTS.map(concept => concept.id));
  const duplicateIds = MATH_CONCEPTS
    .map(concept => concept.id)
    .filter((id, index, all) => all.indexOf(id) !== index);
  const missingPrerequisites = MATH_CONCEPTS.flatMap(concept =>
    concept.prerequisites
      .filter(id => !ids.has(id))
      .map(id => ({ concept: concept.id, missing: id })),
  );

  for (const concept of MATH_CONCEPTS) conceptDepth(concept.id);

  return {
    duplicateIds,
    missingPrerequisites,
    conceptCount: MATH_CONCEPTS.length,
    domainCount: new Set(MATH_CONCEPTS.map(concept => concept.domain)).size,
  };
}
