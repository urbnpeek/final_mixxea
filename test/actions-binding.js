/**
 * Ensures data-act dotted methods keep their receiver (ADMIN.viewDemo).
 * Regression: View demo modal no-op / throw when this === window.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '../public/js/actions.js'), 'utf8');

function withDom(run) {
  const listeners = {};
  const document = {
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
  };
  const window = { document };
  // jsdom-less: actions.js closes over window from sandbox global
  const sandbox = { window, document, console };
  sandbox.window = sandbox;
  // Provide window as global for the IIFE's free `window` identifier
  vm.createContext(sandbox);
  // Rewrite is unnecessary if we assign global window
  sandbox.global = sandbox;
  vm.runInContext('var window = this; var document = this.document;\n' + src, sandbox);
  return run(sandbox, listeners);
}

withDom((sandbox, listeners) => {
  let opened = null;
  sandbox.ADMIN = {
    _demosCache: [{ id: 'd1', trackTitle: 'Track', artistName: 'Artist', status: 'new' }],
    viewDemo(id) {
      const d = this._demosCache.find((x) => x.id === id);
      assert.ok(d, 'demo should resolve via this._demosCache');
      opened = d.id;
    },
  };

  const clickHandlers = listeners.click || [];
  assert.ok(clickHandlers.length, 'click listener registered');

  const el = {
    getAttribute(name) {
      if (name === 'data-act') return JSON.stringify(['ADMIN.viewDemo', 'd1']);
      if (name === 'data-act-on') return null;
      if (name === 'data-act-prevent') return null;
      return null;
    },
    closest() { return this; },
  };
  const event = { type: 'click', target: el, preventDefault() {} };
  clickHandlers.forEach((fn) => fn(event));
  assert.strictEqual(opened, 'd1', 'ADMIN.viewDemo should open with correct this');
});

console.log('ok actions-binding');
