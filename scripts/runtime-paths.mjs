import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const resolvePythonBin = ({
  env = process.env,
  execPath = process.execPath,
  pathExists = existsSync,
} = {}) => {
  if (env.PYTHON_BIN) return env.PYTHON_BIN;

  const bundledPython = resolve(dirname(execPath), '..', '..', 'python', 'bin', 'python3');
  return pathExists(bundledPython) ? bundledPython : 'python3';
};
