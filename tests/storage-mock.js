// Used only by the standalone regression page, never shipped in the extension.
(() => {
  let data = {}; const listeners = [];
  globalThis.chrome = { storage: {
    local: {
      async get(key) { return { [key]: data[key] }; },
      async set(patch) { for (const [key, value] of Object.entries(patch)) { const oldValue = data[key]; data[key] = value; listeners.forEach(fn => fn({ [key]: { oldValue, newValue: value } }, 'local')); } }
    },
    onChanged: { addListener(fn) { listeners.push(fn); } }
  }};
})();
