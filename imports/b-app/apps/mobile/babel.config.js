module.exports = function (api) {
  // Cache based on the value of NODE_ENV
  api.cache(() => process.env.NODE_ENV || 'development');
  
  const isTest = process.env.NODE_ENV === 'test';
  
  const presets = [
    ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
  ];
  
  if (isTest) {
    presets.push(['@babel/preset-env', { targets: { node: 'current' } }]);
    presets.push('@babel/preset-typescript');
  }
  
  return {
    presets,
    plugins: [
      'react-native-reanimated/plugin',
      ['module-resolver', {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
        },
      }],
    ].filter(Boolean),
  };
};

