import { useEffect, useState } from 'react';
import { getExplorationSummary, subscribeExploration } from '../exploration/explorationState';

export function useExplorationSummary() {
  const [summary, setSummary] = useState(getExplorationSummary);

  useEffect(() => subscribeExploration(() => setSummary(getExplorationSummary())), []);

  return summary;
}
