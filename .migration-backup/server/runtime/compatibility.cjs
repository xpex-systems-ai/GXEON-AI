'use strict';

/**
 * GXEON runtime compatibility layer.
 *
 * The repository intentionally runs with package.json "type":"module" while
 * legacy subsystems still expose CommonJS .js files. Native Node require()
 * rejects those files as ERR_REQUIRE_ESM before their code can run. This layer
 * keeps the public ESM runtime intact and safely compiles only GXEON-owned .js
 * files that are clearly CommonJS, preventing boot-time module crashes without
 * changing third-party dependency semantics.
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');
const { pathToFileURL } = require('url');

const repoRoot = path.resolve(__dirname, '..', '..');
const guardedRoots = new Set(['server', 'core', 'agents', 'scripts']);
const originalJsLoader = Module._extensions['.js'];
let registered = false;

function isInsideRepo(filename) {
  const relative = path.relative(repoRoot, filename);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return false;
  if (relative.includes(`${path.sep}node_modules${path.sep}`)) return false;
  return guardedRoots.has(relative.split(path.sep)[0]);
}

function looksCommonJs(source) {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  const hasCjs = /\b(require\s*\(|module\.exports\b|exports\.)/.test(withoutComments);
  const hasEsm = /(^|\n)\s*(import\s+(?:[^'"()]+\s+from\s+)?['"]|import\s+[\w*{]|export\s+)/.test(withoutComments);
  return hasCjs && !hasEsm;
}

function registerCommonJsBoundary() {
  if (registered) return;

  Module._extensions['.js'] = function gxeonJsLoader(module, filename) {
    if (isInsideRepo(filename)) {
      const source = fs.readFileSync(filename, 'utf8');
      if (looksCommonJs(source)) {
        module._compile(source, filename);
        return;
      }
    }

    return originalJsLoader(module, filename);
  };

  registered = true;
}

function normalizeDefault(mod) {
  return mod && mod.__esModule && Object.prototype.hasOwnProperty.call(mod, 'default')
    ? mod.default
    : mod;
}

async function importCompat(specifier, parentFile = __filename) {
  const resolved = require.resolve(specifier, { paths: [path.dirname(parentFile)] });

  try {
    return normalizeDefault(require(resolved));
  } catch (error) {
    if (error && (error.code === 'ERR_REQUIRE_ESM' || /Cannot use import statement/.test(error.message))) {
      const imported = await import(pathToFileURL(resolved).href);
      return normalizeDefault(imported);
    }
    throw error;
  }
}

function getNativeFetch() {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('Native fetch is unavailable. GXEON requires Node.js >=18.');
  }
  return globalThis.fetch.bind(globalThis);
}

function getSupabaseUrl(env = process.env) {
  return env.SUPABASE_URL || env.SUPABASE_PROJECT_URL || '';
}

function getSupabaseKey(env = process.env) {
  return env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || env.SUPABASE_ANON_KEY || '';
}

function validateSupabaseEnv(env = process.env) {
  const url = getSupabaseUrl(env);
  const key = getSupabaseKey(env);
  const warnings = [];

  if (!url) warnings.push('SUPABASE_URL is not configured; persistence runs in degraded mode.');
  if (env.SUPABASE_PROJECT_URL && !env.SUPABASE_URL) {
    warnings.push('SUPABASE_PROJECT_URL is deprecated; mirror it to SUPABASE_URL for canonical configuration.');
  }
  if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
    warnings.push('SUPABASE_URL does not match the expected https://<project>.supabase.co format.');
  }
  if (!key) warnings.push('SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY is not configured.');
  if (key && (key.length < 80 || !key.includes('.'))) {
    warnings.push('Supabase key format looks invalid for a JWT-like service/anon key.');
  }

  return {
    configured: Boolean(url && key),
    canonical_url: Boolean(env.SUPABASE_URL),
    deprecated_project_url_present: Boolean(env.SUPABASE_PROJECT_URL),
    degraded: Boolean(warnings.length),
    warnings
  };
}

module.exports = {
  repoRoot,
  registerCommonJsBoundary,
  importCompat,
  getNativeFetch,
  getSupabaseUrl,
  getSupabaseKey,
  validateSupabaseEnv
};
