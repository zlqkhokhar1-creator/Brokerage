// Simple React Native mock to avoid circular dependencies
const React = require('react');

const mockRN = {
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: (styles) => styles,
  },
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios || obj.default,
  },
  NativeModules: {
    NativeAnimatedModule: {
      // Add minimal required methods
      createAnimatedNode: jest.fn(),
      connectAnimatedNodes: jest.fn(),
      disconnectAnimatedNodes: jest.fn(),
      startListeningToAnimatedNodeValue: jest.fn(),
      stopListeningToAnimatedNodeValue: jest.fn(),
      // Add other methods as needed
    },
  },
  Animated: {
    View: 'Animated.View',
    Text: 'Animated.Text',
    Value: class Value {
      constructor(value) { this._value = value; }
      setValue(value) { this._value = value; }
      interpolate() { return this; }
    },
    timing: () => ({
      start: (callback) => callback && callback(),
    }),
    spring: () => ({
      start: (callback) => callback && callback(),
    }),
  },
  Dimensions: {
    get: () => ({ width: 375, height: 667 }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
};

// Add all properties from the actual react-native module
Object.assign(mockRN, jest.requireActual('react-native'));

module.exports = mockRN;
