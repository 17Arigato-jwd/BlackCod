import { useEffect } from 'react';
import { NavigationAction, NAVIGATION_EVENT, initNavigation } from '../input/navigation';

export const useNavigationControls = (
  callback: (action: NavigationAction) => void,
  deps: any[] = []
) => {
  useEffect(() => {
    // Ensure the global listener is initialized
    initNavigation();

    const handler = (e: Event) => {
      const evt = e as CustomEvent<NavigationAction>;
      callback(evt.detail);
    };

    window.addEventListener(NAVIGATION_EVENT, handler);
    return () => window.removeEventListener(NAVIGATION_EVENT, handler);
  }, deps);
};