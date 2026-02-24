export type NavigationAction = 'NAV_UP' | 'NAV_DOWN' | 'NAV_LEFT' | 'NAV_RIGHT' | 'CONFIRM' | 'BACK';

export const NAVIGATION_EVENT = 'blackcod:nav';

const KEY_MAPPING: Record<string, NavigationAction> = {
  'ArrowUp': 'NAV_UP',
  'ArrowDown': 'NAV_DOWN',
  'ArrowLeft': 'NAV_LEFT',
  'ArrowRight': 'NAV_RIGHT',
  'Enter': 'CONFIRM',
  'Backspace': 'BACK',
  'Escape': 'BACK'
};

let initialized = false;

export const initNavigation = () => {
  if (initialized) return;
  initialized = true;

  window.addEventListener('keydown', (e) => {
    const action = KEY_MAPPING[e.key];
    const target = e.target as HTMLElement;
    
    // Prevent navigation triggers when typing in input fields
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (action) {
      // Don't trigger directional nav while typing
      if (isInput && ['NAV_UP', 'NAV_DOWN', 'NAV_LEFT', 'NAV_RIGHT'].includes(action)) {
        return;
      }
      
      const event = new CustomEvent(NAVIGATION_EVENT, { detail: action });
      window.dispatchEvent(event);
    }
  });
};