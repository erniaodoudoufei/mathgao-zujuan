const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup() {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(__dirname + '/storage-mock.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync(__dirname + '/../extension/settings.js', 'utf8'), context);
  return context.MathGaoSettings;
}
test('默认值、边界与损坏设置恢复', async () => {
  const api = setup();
  assert.equal((await api.read()).fontSize, 22);
  assert.equal(api.normalize(null).fontSize, 22);
  const s = api.normalize({ enabled: 'no', fontSize: 100, lineHeight: NaN, width: 100 });
  assert.equal(s.enabled, true); assert.equal(s.fontSize, 32); assert.equal(s.lineHeight, 1.8); assert.equal(s.width, 640);
});
test('快速并发调整不覆盖其他设置', async () => {
  const api = setup();
  await Promise.all([api.update({ fontSize: 28 }), api.update({ width: 800 }), api.update({ lineHeight: 2.1 })]);
  const s = await api.read(); assert.equal(s.fontSize, 28); assert.equal(s.width, 800); assert.equal(s.lineHeight, 2.1);
  await api.reset(); assert.equal((await api.read()).fontSize, 22);
});
test('旧设置升级及未知外观预设回退', () => {
  const api = setup();
  const old = api.normalize({fontSize:26, width:800});
  assert.equal(old.fontSize,26); assert.equal(old.background,'white'); assert.equal(old.font,'modern');
  const invalid = api.normalize({background:'<script>',font:'toString',ink:'__proto__'});
  assert.equal(invalid.background,'white'); assert.equal(invalid.font,'modern'); assert.equal(invalid.ink,'black');
});
test('所有背景与文字预设保持至少4.5的对比度', () => {
  const api = setup();
  const luminance = hex => {
    const parts = hex.slice(1).match(/../g).map(v => parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return parts[0]*.2126+parts[1]*.7152+parts[2]*.0722;
  };
  for (const bg of Object.values(api.backgrounds)) for (const ink of Object.values(api.inks)) {
    const light=luminance(bg.paper),dark=luminance(ink.color);
    assert.ok((light+.05)/(dark+.05)>=4.5,`${bg.label}/${ink.label}`);
  }
});
