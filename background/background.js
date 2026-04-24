// background.js - 后台服务脚本

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  // 右键菜单 - 选中文字摘要
  chrome.contextMenus.create({
    id: 'summarize-selection',
    title: '🤖 AI 摘要选中内容',
    contexts: ['selection']
  });

  // 右键菜单 - 翻译选中文字
  chrome.contextMenus.create({
    id: 'translate-selection',
    title: '🌐 AI 翻译选中内容',
    contexts: ['selection']
  });

  // 右键菜单 - 整页摘要
  chrome.contextMenus.create({
    id: 'summarize-page',
    title: '🤖 AI 摘要整页',
    contexts: ['page']
  });

  console.log('AI 网页摘要已安装');
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'summarize-selection') {
    const selectedText = info.selectionText;
    if (selectedText) {
      await chrome.storage.local.set({
        pendingSummary: {
          type: 'selection',
          content: selectedText,
          timestamp: Date.now()
        }
      });
      chrome.action.openPopup();
    }
  } else if (info.menuItemId === 'translate-selection') {
    const selectedText = info.selectionText;
    if (selectedText) {
      await chrome.storage.local.set({
        pendingTranslate: {
          content: selectedText,
          timestamp: Date.now()
        }
      });
      chrome.action.openPopup();
    }
  } else if (info.menuItemId === 'summarize-page') {
    chrome.action.openPopup();
  }
});

// 处理快捷键
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'summarize') {
    await chrome.storage.local.set({ autoSummarize: true });
    chrome.action.openPopup();
  }
});

// 监听标签页更新，清除待处理数据
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    chrome.storage.local.remove(['pendingSummary', 'pendingTranslate']);
  }
});
