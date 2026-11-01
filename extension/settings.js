(() => {
  const fonts = Object.freeze({
    modern: { label: '思源黑体 · 清爽', family: '"Noto Sans SC", "Microsoft YaHei", sans-serif' },
    yahei: { label: '微软雅黑 · 熟悉', family: '"Microsoft YaHei", sans-serif' },
    serif: { label: '思源宋体 · 教材', family: '"Noto Serif SC", SimSun, serif' },
    song: { label: '宋体 · 试卷', family: 'SimSun, "Noto Serif SC", serif' },
    kai: { label: '楷体 · 书写', family: 'KaiTi, STKaiti, serif' }
  });
  const backgrounds = Object.freeze({
    white: { label: '纯白', page: '#f0f2f4', paper: '#ffffff' },
    grass: { label: '浅草绿', page: '#dfe8d7', paper: '#e8f0e0' },
    cream: { label: '暖米黄', page: '#eee7d6', paper: '#fff8e8' },
    blue: { label: '淡雾蓝', page: '#dfe8ef', paper: '#edf5fb' },
    gray: { label: '柔雾灰', page: '#e3e6e8', paper: '#f2f3f3' },
    rose: { label: '浅藕粉', page: '#eee1dd', paper: '#fcf0ec' }
  });
  const inks = Object.freeze({
    black: { label: '墨黑', color: '#151515' },
    charcoal: { label: '深灰绿', color: '#34413b' },
    navy: { label: '藏蓝', color: '#203c54' },
    brown: { label: '深棕', color: '#4b382a' }
  });
  const defaults = Object.freeze({ enabled: true, fontSize: 22, lineHeight: 1.8, width: 960, font: 'modern', background: 'white', ink: 'black' });
  const preset = (value, choices, fallback) => typeof value === 'string' && Object.hasOwn(choices, value) ? value : fallback;
  const clamp = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  const normalize = (input = {}) => { const value = input && typeof input === 'object' ? input : {}; return ({
    enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
    fontSize: Math.round(clamp(value.fontSize, 16, 32, defaults.fontSize)),
    lineHeight: Math.round(clamp(value.lineHeight, 1.4, 2.2, defaults.lineHeight) * 10) / 10,
    width: Math.round(clamp(value.width, 640, 1200, defaults.width) / 20) * 20,
    font: preset(value.font, fonts, defaults.font),
    background: preset(value.background, backgrounds, defaults.background),
    ink: preset(value.ink, inks, defaults.ink)
  }); };
  let queue = Promise.resolve();
  globalThis.MathGaoSettings = Object.freeze({
    defaults, normalize, fonts, backgrounds, inks,
    async read() { return normalize((await chrome.storage.local.get('mathgaoSettings')).mathgaoSettings); },
    update(patch) {
      const task = queue.then(async () => {
        const current = await this.read();
        const next = normalize({ ...current, ...patch });
        await chrome.storage.local.set({ mathgaoSettings: next });
        return next;
      });
      queue = task.catch(() => {});
      return task;
    },
    reset() { return this.update(defaults); }
  });
})();
