module.exports = {
  root: true,
  env: { browser: true, es2020: true, worker: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.3' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/prop-types': 'off',
  },
  overrides: [
    {
      files: ['server/**/*.js', 'prisma/**/*.js', 'scripts/**/*.js'],
      env: { node: true, browser: false },
    },
    {
      // react-three-fiber usa prop JSX proprie di three.js (position, args…)
      files: ['src/components/3D/**/*.jsx'],
      rules: { 'react/no-unknown-property': 'off' },
    },
    {
      // Provider/hook e bootstrap del router esportano più di soli componenti
      files: ['src/auth/AuthContext.jsx', 'src/main.jsx'],
      rules: { 'react-refresh/only-export-components': 'off' },
    },
  ],
}
