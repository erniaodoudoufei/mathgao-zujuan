(() => {
  if (document.documentElement.hasAttribute('data-mgq-installed')) return;
  document.documentElement.setAttribute('data-mgq-installed', '');
  const api = MathGaoSettings;
  const selector = '.quest-cnt, .quesdiv > .exam-item__cnt';
  const bodies = new Map();
  const measurements = new WeakMap();
  let settings = { ...api.defaults };
  let preview = null;
  let scheduled = false;
  const formula = image => /\/Upload\/formula\//i.test(image.getAttribute('src') || image.getAttribute('data-src') || '');
  const visible = element => !element.closest('[hidden]') && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden';

  function measure(body) {
    // Temporarily remove our class to measure the site's original font and image sizes.
    const applied = body.classList.contains('mgq-body');
    body.classList.remove('mgq-body');
    for (const image of body.querySelectorAll('img')) {
      if (!formula(image) || measurements.has(image)) continue;
      const size = parseFloat(getComputedStyle(image.parentElement).fontSize) || 14;
      const width = image.getBoundingClientRect().width || image.naturalWidth;
      if (width > 0 && image.complete) {
        measurements.set(image, { emWidth: width / size });
        image.dataset.mgqFormula = '';
        image.style.setProperty('--mgq-image-width', `${width / size}em`);
      } else if (!image.dataset.mgqWaiting) {
        image.dataset.mgqWaiting = '';
        image.addEventListener('load', () => { delete image.dataset.mgqWaiting; measure(body); apply(body); }, { once: true });
      }
    }
    if (applied) body.classList.add('mgq-body');
  }

  function apply(body) {
    body.style.setProperty('--mgq-font-size', `${settings.fontSize}px`);
    body.style.setProperty('--mgq-line-height', settings.lineHeight);
    body.style.setProperty('--mgq-font-family', api.fonts[settings.font].family);
    body.style.setProperty('--mgq-ink', api.inks[settings.ink].color);
    body.style.setProperty('--mgq-paper', api.backgrounds[settings.background].paper);
    body.classList.toggle('mgq-body', settings.enabled);
  }

  function applyPageTheme() {
    const root = document.documentElement;
    root.classList.toggle('mgq-page', settings.enabled && bodies.size > 0);
    root.style.setProperty('--mgq-page', api.backgrounds[settings.background].page);
    root.style.setProperty('--mgq-paper', api.backgrounds[settings.background].paper);
  }

  function scan() {
    scheduled = false;
    for (const [body, button] of bodies) {
      if (!body.isConnected) { button.remove(); bodies.delete(body); }
    }
    for (const body of document.querySelectorAll(selector)) {
      if (!visible(body) || body.closest('.exam-item__opt, .answer, .analysis')) continue;
      measure(body);
      apply(body);
      body.closest('.quesroot')?.classList.add('mgq-surface');
      if (bodies.has(body)) {
        const button = bodies.get(body);
        if (!button.isConnected) body.after(button);
        continue;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mgq-launch';
      button.textContent = '单题展示';
      button.addEventListener('click', () => openPreview(body, button));
      body.after(button);
      bodies.set(body, button);
    }
    applyPageTheme();
  }

  function copyQuestion(body) {
    const clone = body.cloneNode(true);
    const originals = [body, ...body.querySelectorAll('*')];
    const copies = [clone, ...clone.querySelectorAll('*')];
    for (let i = copies.length - 1; i >= 0; i--) {
      const el = copies[i];
      const source = originals[i];
      if (i > 0 && (!visible(source) || source.matches('script,style,link,iframe,object,embed,button,input,textarea,select,.exam-item__opt,.answer,.analysis,.mgq-launch'))) {
        el.remove(); continue;
      }
      for (const attr of Array.from(el.attributes)) {
        if (/^on/i.test(attr.name) || ['id','contenteditable','autofocus'].includes(attr.name)) el.removeAttribute(attr.name);
      }
      if (el.tagName === 'A') { el.removeAttribute('href'); el.removeAttribute('target'); }
      if (el.tagName === 'IMG') {
        el.src = source.currentSrc || source.src;
        el.loading = 'eager';
        el.removeAttribute('srcset');
        const baseline = measurements.get(source);
        if (baseline) {
          el.dataset.mgqFormula = '';
          el.style.setProperty('--mgq-image-width', `${baseline.emWidth}em`);
        }
      }
    }
    // List numbering is a leading text node, not part of the actual stem.
    if (body.matches('.exam-item__cnt')) {
      for (const node of clone.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          node.textContent = node.textContent.replace(/^\s*\d+\s*[.．、]\s*/, '');
          break;
        }
        if (node.nodeType === Node.ELEMENT_NODE) break;
      }
    }
    clone.className = 'question';
    clone.removeAttribute('style');
    return clone;
  }

  function openPreview(body, trigger) {
    if (preview) preview.close();
    measure(body);
    const host = document.createElement('div');
    host.dataset.mgqPreview = '';
    host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important;';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host{font-family:"Noto Sans SC","Microsoft YaHei",sans-serif;color:#151515;font-size:14px;line-height:1.5}
      *{box-sizing:border-box}button,input{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible{outline:3px solid #508fc5;outline-offset:3px}
      .backdrop{position:absolute;inset:0;background:var(--page-background);display:flex;flex-direction:column}
      .toolbar{flex:none;display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;padding:12px 20px;background:white;border-bottom:1px solid #dbe2e8}
      .toolbar label{display:flex;align-items:center;gap:6px;font-size:13px}.toolbar input{width:100px;accent-color:#315c78}.toolbar output{min-width:40px;font-variant-numeric:tabular-nums}
      button{padding:7px 12px;background:#f6faff;color:#315c78;border:1px solid #c9d8e6;border-radius:6px}
      .workspace{overflow:auto;flex:1;padding:28px 24px;overscroll-behavior:contain}
      .paper{background:var(--paper-background);width:var(--paper-width);max-width:100%;padding:32px;margin:0 auto;min-height:120px}
      .question{font-family:var(--font-family)!important;font-size:var(--font-size)!important;line-height:var(--line-height)!important;color:var(--ink)!important;overflow-wrap:anywhere}
      .question :where(span,p,div,td,th,a,li,b,strong,em,i,u,font){font-size:inherit!important;line-height:inherit!important;color:inherit!important}
      .question :where(span,p,div,td,th,a,li,b,strong,u,font){font-family:inherit!important}
      .question :where(span,p,div,td,th){background-color:transparent!important}
      .question :where(i,em){font-family:"Times New Roman",serif!important}
      .question :where(sup,sub){font-size:.72em!important;line-height:0!important}
      .question img{max-width:100%;height:auto!important;object-fit:contain}
      .question img[data-mgq-formula]{width:var(--mgq-image-width)!important;vertical-align:middle!important}
      .question table{border-collapse:collapse;max-width:100%;font-size:inherit!important;line-height:inherit!important}
      .question td,.question th{padding:6px 10px}.question [hidden]{display:none!important}
      .restore{position:absolute;top:10px;right:10px;font-size:12px}.hint{color:#607585;font-size:12px}
      .toolbar select{max-width:155px;padding:5px;border:1px solid #c9d8e6;border-radius:5px;background:#fff;color:#234a64;font:inherit}
      [hidden]{display:none!important}@media(max-width:650px){.workspace{padding:16px 12px}.paper{padding:24px}.toolbar{gap:8px}.toolbar input{width:65px}}
    </style><section class="backdrop" role="dialog" aria-modal="true" aria-label="单题展示">
    <div class="toolbar"><label>字体<select data-preset="font"></select></label><label>背景<select data-preset="background"></select></label><label>文字<select data-preset="ink"></select></label>
    <label>字号<input data-key="fontSize" type="range" min="16" max="32" step="1"><output></output></label>
    <label>行距<input data-key="lineHeight" type="range" min="1.4" max="2.2" step="0.1"><output></output></label>
    <label>宽度<input data-key="width" type="range" min="640" max="1200" step="20"><output></output></label>
    <button data-action="reset">恢复默认</button><button data-action="hide">隐藏工具栏</button><button data-action="close">关闭 Esc</button><span class="hint" role="status">隐藏工具栏后，可手动框选题面截图 · 公式保留原图颜色</span></div>
    <div class="workspace"><article class="paper"></article></div><button class="restore" hidden>显示工具栏</button></section>`;
    root.querySelector('.paper').append(copyQuestion(body));
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
      if (event.key === 'Tab') {
        const controls = Array.from(root.querySelectorAll('button,input,select')).filter(el => !el.closest('[hidden]'));
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && root.activeElement === first) {event.preventDefault();last.focus();}
        else if (!event.shiftKey && root.activeElement === last) {event.preventDefault();first.focus();}
      }
    };
    function close() {
      host.remove();
      document.documentElement.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey, true);
      preview = null;
      if (trigger.isConnected) trigger.focus({ preventScroll: true });
    }
    function render() {
      host.style.setProperty('--font-size', `${settings.fontSize}px`);
      host.style.setProperty('--line-height', settings.lineHeight);
      host.style.setProperty('--paper-width', `${settings.width}px`);
      host.style.setProperty('--font-family', api.fonts[settings.font].family);
      host.style.setProperty('--paper-background', api.backgrounds[settings.background].paper);
      host.style.setProperty('--page-background', api.backgrounds[settings.background].page);
      host.style.setProperty('--ink', api.inks[settings.ink].color);
      for (const select of root.querySelectorAll('select[data-preset]')) select.value = settings[select.dataset.preset];
      for (const input of root.querySelectorAll('input[data-key]')) {
        input.value = settings[input.dataset.key];
        input.nextElementSibling.value = input.value + (input.dataset.key === 'lineHeight' ? ' 倍' : 'px');
      }
    }
    async function save(patch) {
      settings = api.normalize({ ...settings, ...patch }); render();
      try { await api.update(patch); }
      catch { root.querySelector('.hint').textContent = '设置保存失败，可继续截图；请刷新页面后重试。'; }
    }
    for (const [key, choices] of Object.entries({font:api.fonts, background:api.backgrounds, ink:api.inks})) {
      const select = root.querySelector(`[data-preset="${key}"]`);
      for (const [value, preset] of Object.entries(choices)) select.add(new Option(preset.label, value));
      select.addEventListener('change', () => save({[key]:select.value}));
    }
    root.querySelectorAll('input[data-key]').forEach(input => input.addEventListener('input', () => save({ [input.dataset.key]: Number(input.value) })));
    root.querySelector('[data-action="reset"]').addEventListener('click', () => save(api.defaults));
    root.querySelector('[data-action="close"]').addEventListener('click', close);
    root.querySelector('[data-action="hide"]').addEventListener('click', () => {
      root.querySelector('.toolbar').hidden = true;
      root.querySelector('.restore').hidden = false;
      root.querySelector('.restore').focus();
    });
    root.querySelector('.restore').addEventListener('click', () => {
      root.querySelector('.toolbar').hidden = false;
      root.querySelector('.restore').hidden = true;
      root.querySelector('[data-action="hide"]').focus();
    });
    preview = { close, render, host };
    document.addEventListener('keydown', onKey, true);
    document.body.append(host);
    render();
    root.querySelector('[data-action="close"]').focus();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.mathgaoSettings) return;
    settings = api.normalize(changes.mathgaoSettings.newValue);
    bodies.forEach((button, body) => apply(body));
    applyPageTheme();
    if (preview) preview.render();
  });
  api.read().then(value => { settings = value; }).catch(() => {}).finally(() => {
    scan();
    const observer = new MutationObserver(records => {
      if (!records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === Node.ELEMENT_NODE && !node.matches('.mgq-launch') && node !== preview?.host))) return;
      if (!scheduled) { scheduled = true; setTimeout(scan, 50); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
