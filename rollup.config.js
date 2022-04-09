import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import pkg from './package.json'

const extensions = ['.js', '.jsx', '.ts', '.tsx']

export default [
  {
    input: 'src/index.ts',
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
    ],
    output: [
      {
        file: pkg.main,
        format: 'esm',
      },
      {
        file: pkg.module,
        format: 'esm',
      },
    ],
    plugins: [
      json(),
      resolve({ extensions }),
    ],
  }
]
