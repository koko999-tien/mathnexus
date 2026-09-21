import { useSyncExternalStore } from 'react';
import {
  LEARNING_GOAL_KEY,
  clearLearningGoal,
  getLearningGoal,
  setLearningGoal,
} from '../learning/learningGoal';
import { STORAGE_EVENT } from '../utils/storage';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function snapshot() {
  try { return localStorage.getItem('mathnexus_' + LEARNING_GOAL_KEY); } catch { return null; }
}

export function useLearningGoal() {
  useSyncExternalStore(subscribe, snapshot);
  return {
    goal: getLearningGoal(),
    setGoal: setLearningGoal,
    clearGoal: clearLearningGoal,
  };
}
