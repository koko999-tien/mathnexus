import { ATOM_BY_ID, MATH_ATOMS, type MathAtom, type OntologyKind } from '../data/mathOntology.ts';
import { CONCEPT_BY_ID } from '../data/mathKnowledge.ts';

export function atomsForConcept(conceptId: string) {
  return MATH_ATOMS.filter(atom => atom.conceptId === conceptId);
}

export function atomsByKind(conceptId: string) {
  const grouped = new Map<OntologyKind, MathAtom[]>();
  for (const atom of atomsForConcept(conceptId)) {
    const bucket = grouped.get(atom.kind) || [];
    bucket.push(atom);
    grouped.set(atom.kind, bucket);
  }
  return grouped;
}

export function atomDependencies(atomId: string) {
  const atom = ATOM_BY_ID.get(atomId);
  if (!atom) return [];
  return (atom.dependsOn || []).map(id => ATOM_BY_ID.get(id)).filter((item): item is MathAtom => Boolean(item));
}

export function ontologyDepthScore(conceptId: string) {
  const atoms = atomsForConcept(conceptId);
  if (!atoms.length) return 0;
  const kinds = new Set(atoms.map(atom => atom.kind));
  const structuralKinds: OntologyKind[] = ['definition', 'theorem', 'proof', 'example', 'counterexample', 'subskill', 'misconception', 'exercise', 'application'];
  const breadth = structuralKinds.filter(kind => kinds.has(kind)).length / structuralKinds.length;
  const volume = Math.min(1, atoms.length / 8);
  return Math.round((breadth * 0.65 + volume * 0.35) * 100);
}

export function ontologyDiagnostics() {
  const atomIds = new Set(MATH_ATOMS.map(atom => atom.id));
  const duplicateAtomIds = MATH_ATOMS
    .map(atom => atom.id)
    .filter((id, index, all) => all.indexOf(id) !== index);

  const unknownConceptIds = MATH_ATOMS
    .filter(atom => !CONCEPT_BY_ID.has(atom.conceptId))
    .map(atom => ({ atom: atom.id, concept: atom.conceptId }));

  const missingAtomDependencies = MATH_ATOMS.flatMap(atom =>
    (atom.dependsOn || [])
      .filter(id => !atomIds.has(id))
      .map(id => ({ atom: atom.id, missing: id })),
  );

  const conceptsWithDepth = new Set(MATH_ATOMS.map(atom => atom.conceptId));
  return {
    atomCount: MATH_ATOMS.length,
    deepConceptCount: conceptsWithDepth.size,
    duplicateAtomIds,
    unknownConceptIds,
    missingAtomDependencies,
  };
}
