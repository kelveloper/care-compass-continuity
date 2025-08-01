const React = require('react');

// Create a generic mock component for all lucide icons
const MockIcon = (props) => {
  return React.createElement('svg', {
    'data-testid': 'mock-icon',
    ...props
  }, null);
};

// Export all the icons used in the components
module.exports = {
  AlertTriangle: MockIcon,
  RefreshCw: MockIcon,
  Home: MockIcon,
  Wifi: MockIcon,
  Shield: MockIcon,
  AlertCircle: MockIcon,
  Bug: MockIcon,
  WifiOff: MockIcon,
  Lock: MockIcon,
  User: MockIcon,
  HelpCircle: MockIcon,
  Search: MockIcon,
  Bell: MockIcon,
  Settings: MockIcon,
  default: MockIcon
};
