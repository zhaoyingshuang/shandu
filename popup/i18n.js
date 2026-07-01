// i18n.js - 国际化初始化
// 在 popup.js 之前运行，把所有 data-i18n* 属性对应的消息填充到 DOM

(function applyI18n() {
  const langMap = {
    zh: 'langZh', en: 'langEn', ja: 'langJa',
    ko: 'langKo', fr: 'langFr', de: 'langDe'
  };

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.setAttribute('title', msg);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.setAttribute('placeholder', msg);
  });

  document.querySelectorAll('[data-i18n-text]').forEach(el => {
    const key = el.getAttribute('data-i18n-text');
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });

  document.querySelectorAll('[data-i18n-lang]').forEach(el => {
    const code = el.getAttribute('data-i18n-lang');
    const key = langMap[code];
    if (key) {
      const msg = chrome.i18n.getMessage(key);
      if (msg) el.textContent = chrome.i18n.getMessage('translateTo') + ' ' + msg;
    }
  });

  // 设置界面 optgroup 的 label
  const gCn = document.getElementById('providerGroupCN');
  const gGlobal = document.getElementById('providerGroupGlobal');
  if (gCn) gCn.label = chrome.i18n.getMessage('providerGroupCN') || '';
  if (gGlobal) gGlobal.label = chrome.i18n.getMessage('providerGroupGlobal') || '';
})();
