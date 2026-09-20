import { useSyncExternalStore } from 'react';
import { getProgress, STORAGE_EVENT } from '../utils/storage';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function snapshot() {
  try { return localStorage.getItem('mathnexus_progress'); } catch { return null; }
}

export function useProgress() {
  useSyncExternalStore(subscribe, snapshot);
  return getProgress();
}
