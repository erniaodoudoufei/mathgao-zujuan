(() => {
  const api = MathGaoSettings;
  const status = document.getElementById('status');
  for (const [key, choices] of Object.entries({font:api.fonts, background:api.backgrounds, ink:api.inks})) {
    const select = document.getElementById(key);
    for (const [value, preset] of Object.entries(choices)) select.add(new Option(preset.label, value));
    select.addEventListener('change', () => save({[key]:select.value}));
  }
  function render(settings) {
    document.getElementById('enabled').checked = settings.enabled;
    for (const key of ['font','background','ink']) document.getElementById(key).value = settings[key];
    for (const key of ['fontSize', 'lineHeight', 'width']) {
      document.getElementById(key).value = settings[key];
      document.getElementById(key + 'Value').value = settings[key] + (key === 'lineHeight' ? ' 倍' : ' px');
    }
  }
  async function save(patch) {
    try { render(await api.update(patch)); status.textContent = '设置已保存'; }
    catch { status.textContent = '保存失败，请重新打开扩展后重试。'; }
  }
  document.getElementById('enabled').addEventListener('change', event => save({ enabled: event.target.checked }));
  for (const key of ['fontSize', 'lineHeight', 'width']) {
    document.getElementById(key).addEventListener('input', event => {
      document.getElementById(key + 'Value').value = event.target.value + (key === 'lineHeight' ? ' 倍' : ' px');
      save({ [key]: Number(event.target.value) });
    });
  }
  document.getElementById('reset').addEventListener('click', () => save(api.defaults));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.mathgaoSettings) render(api.normalize(changes.mathgaoSettings.newValue));
  });
  api.read().then(settings => { render(settings); status.textContent = '设置自动保存'; }).catch(() => {status.textContent = '读取失败，请重新打开扩展。';});
})();
