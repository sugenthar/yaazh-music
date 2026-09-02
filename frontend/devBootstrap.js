// Dev-only diagnostic harness. MUST be the FIRST import in index.js so it runs before
// any other app module evaluates (ES imports evaluate in import order, so devBootstrap
// fully evaluates before './App'). No production code imports this.
// Goal: pinpoint the source of `ReferenceError: Property 'error' doesn't exist` at
// Android startup. Prints only plain strings; never throws; always forwards to the
// original console.error / ErrorUtils handler.

const read = (value, key) => {
  try {
    const v = value[key];
    return v === undefined || v === null ? '' : String(v);
  } catch (e) {
    return '';
  }
};

const stringify = (value) => {
  try {
    return String(value);
  } catch (e) {
    return '[unprintable]';
  }
};

const valueType = (value) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  const t = typeof value;
  if (t !== 'object') return t;
  let ctor = '';
  try {
    ctor = value.constructor && value.constructor.name ? value.constructor.name : '';
  } catch (e) {
    ctor = '[ctor-unreadable]';
  }
  let tag = '';
  try {
    tag = Object.prototype.toString.call(value);
  } catch (e) {
    tag = '[tag-unreadable]';
  }
  return 'object ctor=' + ctor + ' tag=' + tag;
};

const log = (...args) => {
  try {
    if (originalLog) originalLog.apply(console, args);
  } catch (e) {}
};

let originalConsoleError = null;
let originalLog = null;

if (typeof globalThis.__DEV__ === 'boolean' && globalThis.__DEV__) {
  originalConsoleError = console.error;
  originalLog = console.warn && console.log ? console.log : console.error;

  console.error = (...args) => {
    try {
      if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        const v = args[0];
        log('[Yaazh][CONSOLE_ERR] valueType=' + valueType(v));
        if (v instanceof Error) {
          log('[Yaazh][CONSOLE_ERR]   isError=true');
          log('[Yaazh][CONSOLE_ERR]   name=' + (read(v, 'name') || '(none)'));
          log('[Yaazh][CONSOLE_ERR]   message=' + (read(v, 'message') || '(none)'));
          const stack = read(v, 'stack');
          log('[Yaazh][CONSOLE_ERR]   stack=' + (stack || '(none)'));
        } else {
          let keys = '';
          try {
            keys = Object.keys(v).join(',');
          } catch (e) {
            keys = '[unreadable]';
          }
          log('[Yaazh][CONSOLE_ERR]   isError=false keys=' + (keys || '(none)'));
          log('[Yaazh][CONSOLE_ERR]   name=' + (read(v, 'name') || '(none)'));
          log('[Yaazh][CONSOLE_ERR]   message=' + (read(v, 'message') || '(none)'));
        }
      }
    } catch (e) {
      log('[Yaazh][CONSOLE_ERR] interceptor-error ' + stringify(e));
    }
    return originalConsoleError.apply(console, args);
  };

  try {
    const eu = globalThis.ErrorUtils;
    const prev = eu && typeof eu.getGlobalHandler === 'function' ? eu.getGlobalHandler() : null;
    const handler = (error, isFatal) => {
      log('[Yaazh][FATAL] isFatal=' + String(isFatal) + ' valueType=' + valueType(error));
      log('[Yaazh][FATAL]   name=' + (read(error, 'name') || '(none)'));
      log('[Yaazh][FATAL]   message=' + (read(error, 'message') || '(none)'));
      const stack = read(error, 'stack');
      log('[Yaazh][FATAL]   stack=' + (stack || '(none)'));
      if (prev && typeof prev === 'function' && prev !== handler) {
        try {
          prev(error, isFatal);
        } catch (e) {}
      }
    };
    if (eu && typeof eu.setGlobalHandler === 'function') {
      eu.setGlobalHandler(handler);
    }
  } catch (e) {
    log('[Yaazh][FATAL] ErrorUtils-install-failed ' + stringify(e));
  }

  log('[Yaazh][BOOT] devBootstrap installed');
}