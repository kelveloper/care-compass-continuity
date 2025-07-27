# Keyboard Navigation Support

This document describes the keyboard navigation features implemented in the Healthcare Continuity MVP application.

## Overview

The application now supports comprehensive keyboard navigation to improve accessibility and user experience. Users can navigate through the interface using keyboard shortcuts without relying on a mouse.

## Features Implemented

### 1. Dashboard Navigation

#### Global Shortcuts

- **`/` (Forward Slash)**: Focus the search input field from anywhere on the dashboard
- **`Escape`**: Clear all filters (search query, risk filter, status filter) when not focused on an input field

#### Patient List Navigation

- **`↑` (Arrow Up)**: Navigate to the previous patient in the list
- **`↓` (Arrow Down)**: Navigate to the next patient in the list
- **`Enter`**: Select the currently focused patient and navigate to their detail view
- **`Space`**: Alternative to Enter for selecting a patient

#### Search Input

- **`Escape`**: Clear the search query when focused on the search input
- **`↓` (Arrow Down)**: Move focus from search input to the first patient in the list

### 2. Patient Detail View Navigation

#### Global Shortcuts

- **`Escape`**:
  - Close the provider matching interface if open
  - Return to the dashboard if no modal is open

### 3. Provider Matching Navigation

#### Provider Card Navigation

- **`↑` (Arrow Up)**: Navigate to the previous provider card
- **`↓` (Arrow Down)**: Navigate to the next provider card
- **`Enter`**: Select the currently focused provider
- **`Space`**: Alternative to Enter for selecting a provider
- **`Escape`**: Close the provider matching interface

## Visual Indicators

### Focus States

- All focusable elements have clear focus indicators with ring outlines
- Selected items in lists are highlighted with background color changes
- Keyboard shortcuts are displayed in the UI using `<kbd>` elements

### Help Text

- Keyboard shortcuts are displayed in help text throughout the application
- Instructions appear in muted text below main headings

## Accessibility Features

### ARIA Labels

- All interactive elements have appropriate `aria-label` attributes
- Role attributes are used for custom interactive elements
- Screen reader friendly descriptions for complex interactions

### Tab Navigation

- All interactive elements are included in the tab order
- Tab navigation follows logical flow through the interface
- Skip links and focus management for complex interactions

## Implementation Details

### Custom Hooks

#### `useKeyboardNavigation`

A flexible hook for handling keyboard events with configurable options:

- Arrow key navigation
- Enter/Space selection
- Escape key handling
- Tab navigation support
- Conditional enabling/disabling

#### `useListKeyboardNavigation`

Specialized hook for navigating lists of items:

- Automatic focus management
- Circular navigation (wraps around at ends)
- Selection callbacks
- Integration with React refs

### Components Enhanced

1. **Dashboard Component**

   - Patient list keyboard navigation
   - Global keyboard shortcuts
   - Search input keyboard handling

2. **PatientDetailView Component**

   - Escape key navigation
   - Modal management

3. **ProviderMatchCards Component**
   - Provider card navigation
   - Selection keyboard shortcuts

## Testing

### Unit Tests

- Comprehensive tests for keyboard navigation hooks
- Event simulation and callback verification
- Edge case handling

### Integration Tests

- End-to-end keyboard navigation workflows
- Cross-component navigation testing
- Accessibility compliance verification

## Browser Support

The keyboard navigation features are supported in all modern browsers:

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Future Enhancements

Potential improvements for keyboard navigation:

- Vim-style navigation shortcuts (j/k for up/down)
- Quick jump shortcuts (numbers for direct selection)
- Advanced filtering shortcuts
- Customizable keyboard shortcuts
- Voice navigation integration

## Usage Examples

### Navigating the Dashboard

1. Press `/` to focus the search input
2. Type to search for patients
3. Press `↓` to move to the patient list
4. Use `↑`/`↓` to navigate between patients
5. Press `Enter` to view patient details

### Selecting a Provider

1. From patient detail view, click "Add Follow-up Care"
2. Use `↑`/`↓` to navigate between provider cards
3. Press `Enter` to select a provider
4. Press `Escape` to cancel selection

### Quick Actions

- Press `Escape` anywhere to clear filters or go back
- Use `Tab` to navigate through form fields and buttons
- Press `Enter` or `Space` on buttons to activate them
