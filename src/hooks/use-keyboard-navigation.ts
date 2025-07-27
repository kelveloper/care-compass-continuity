import { useEffect, useCallback, useRef, useState } from 'react';

export interface KeyboardNavigationOptions {
  // Navigation keys
  enableArrowKeys?: boolean;
  enableTabNavigation?: boolean;
  enableEnterSelection?: boolean;
  enableEscapeClose?: boolean;
  
  // Callbacks
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onTab?: (shiftKey: boolean) => void;
  
  // Configuration
  preventDefaultOnKeys?: string[];
  disabled?: boolean;
}

export const useKeyboardNavigation = (options: KeyboardNavigationOptions = {}) => {
  const {
    enableArrowKeys = true,
    enableTabNavigation = true,
    enableEnterSelection = true,
    enableEscapeClose = true,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onEscape,
    onTab,
    preventDefaultOnKeys = [],
    disabled = false,
  } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return;

    const { key, shiftKey } = event;
    
    // Prevent default for specified keys
    if (preventDefaultOnKeys.includes(key)) {
      event.preventDefault();
    }

    switch (key) {
      case 'ArrowUp':
        if (enableArrowKeys && onArrowUp) {
          event.preventDefault();
          onArrowUp();
        }
        break;
      case 'ArrowDown':
        if (enableArrowKeys && onArrowDown) {
          event.preventDefault();
          onArrowDown();
        }
        break;
      case 'ArrowLeft':
        if (enableArrowKeys && onArrowLeft) {
          event.preventDefault();
          onArrowLeft();
        }
        break;
      case 'ArrowRight':
        if (enableArrowKeys && onArrowRight) {
          event.preventDefault();
          onArrowRight();
        }
        break;
      case 'Enter':
        if (enableEnterSelection && onEnter) {
          event.preventDefault();
          onEnter();
        }
        break;
      case 'Escape':
        if (enableEscapeClose && onEscape) {
          event.preventDefault();
          onEscape();
        }
        break;
      case 'Tab':
        if (enableTabNavigation && onTab) {
          onTab(shiftKey);
        }
        break;
    }
  }, [
    disabled,
    enableArrowKeys,
    enableTabNavigation,
    enableEnterSelection,
    enableEscapeClose,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onEscape,
    onTab,
    preventDefaultOnKeys,
  ]);

  useEffect(() => {
    if (disabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, disabled]);

  return { handleKeyDown };
};

// Hook for managing focus within a list of items
export const useListKeyboardNavigation = <T>(
  items: T[],
  onSelect?: (item: T, index: number) => void,
  onEscape?: () => void
) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const focusItem = useCallback((index: number) => {
    if (index >= 0 && index < items.length && itemRefs.current[index]) {
      itemRefs.current[index]?.focus();
      setSelectedIndex(index);
    }
  }, [items.length]);

  const handleArrowUp = useCallback(() => {
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
    focusItem(newIndex);
  }, [selectedIndex, items.length, focusItem]);

  const handleArrowDown = useCallback(() => {
    const newIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
    focusItem(newIndex);
  }, [selectedIndex, items.length, focusItem]);

  const handleEnter = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < items.length && onSelect) {
      onSelect(items[selectedIndex], selectedIndex);
    }
  }, [selectedIndex, items, onSelect]);

  const handleEscape = useCallback(() => {
    setSelectedIndex(-1);
    if (onEscape) {
      onEscape();
    }
  }, [onEscape]);

  useKeyboardNavigation({
    onArrowUp: handleArrowUp,
    onArrowDown: handleArrowDown,
    onEnter: handleEnter,
    onEscape: handleEscape,
    preventDefaultOnKeys: ['ArrowUp', 'ArrowDown', 'Enter'],
  });

  const setItemRef = useCallback((index: number) => (ref: HTMLElement | null) => {
    itemRefs.current[index] = ref;
  }, []);

  return {
    selectedIndex,
    setSelectedIndex,
    focusItem,
    setItemRef,
  };
};