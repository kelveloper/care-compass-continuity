import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation, useListKeyboardNavigation } from '../use-keyboard-navigation';

// Mock data for testing
const mockItems = [
  { id: '1', name: 'Item 1' },
  { id: '2', name: 'Item 2' },
  { id: '3', name: 'Item 3' },
];

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    // Clear any existing event listeners
    document.removeEventListener('keydown', jest.fn());
  });

  it('should call onArrowUp when ArrowUp key is pressed', () => {
    const onArrowUp = jest.fn();
    
    renderHook(() => useKeyboardNavigation({
      onArrowUp,
      enableArrowKeys: true,
    }));

    // Simulate ArrowUp key press
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    document.dispatchEvent(event);

    expect(onArrowUp).toHaveBeenCalledTimes(1);
  });

  it('should call onArrowDown when ArrowDown key is pressed', () => {
    const onArrowDown = jest.fn();
    
    renderHook(() => useKeyboardNavigation({
      onArrowDown,
      enableArrowKeys: true,
    }));

    // Simulate ArrowDown key press
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    document.dispatchEvent(event);

    expect(onArrowDown).toHaveBeenCalledTimes(1);
  });

  it('should call onEnter when Enter key is pressed', () => {
    const onEnter = jest.fn();
    
    renderHook(() => useKeyboardNavigation({
      onEnter,
      enableEnterSelection: true,
    }));

    // Simulate Enter key press
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    document.dispatchEvent(event);

    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it('should call onEscape when Escape key is pressed', () => {
    const onEscape = jest.fn();
    
    renderHook(() => useKeyboardNavigation({
      onEscape,
      enableEscapeClose: true,
    }));

    // Simulate Escape key press
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('should not call handlers when disabled', () => {
    const onArrowUp = jest.fn();
    const onEnter = jest.fn();
    
    renderHook(() => useKeyboardNavigation({
      onArrowUp,
      onEnter,
      disabled: true,
    }));

    // Simulate key presses
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(onArrowUp).not.toHaveBeenCalled();
    expect(onEnter).not.toHaveBeenCalled();
  });
});

describe('useListKeyboardNavigation', () => {
  it('should initialize with selectedIndex -1', () => {
    const { result } = renderHook(() => 
      useListKeyboardNavigation(mockItems)
    );

    expect(result.current.selectedIndex).toBe(-1);
  });

  it('should update selectedIndex when setSelectedIndex is called', () => {
    const { result } = renderHook(() => 
      useListKeyboardNavigation(mockItems)
    );

    act(() => {
      result.current.setSelectedIndex(1);
    });

    expect(result.current.selectedIndex).toBe(1);
  });

  it('should call onSelect when Enter is pressed with valid selection', () => {
    const onSelect = jest.fn();
    
    const { result } = renderHook(() => 
      useListKeyboardNavigation(mockItems, onSelect)
    );

    // Set a selected index first
    act(() => {
      result.current.setSelectedIndex(1);
    });

    // Simulate Enter key press
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    document.dispatchEvent(event);

    expect(onSelect).toHaveBeenCalledWith(mockItems[1], 1);
  });

  it('should call onEscape when Escape is pressed', () => {
    const onEscape = jest.fn();
    
    renderHook(() => 
      useListKeyboardNavigation(mockItems, undefined, onEscape)
    );

    // Simulate Escape key press
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);

    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});