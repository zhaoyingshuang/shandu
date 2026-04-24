// content.js - 内容脚本，提取页面内容

(function() {
  'use strict';

  /**
   * 提取页面正文内容
   * 使用多种策略确保提取质量
   */
  function extractContent() {
    // 策略1: 尝试使用 Readability 风格的提取
    let content = extractWithReadability();

    // 策略2: 如果提取内容太少，尝试其他方法
    if (!content || content.length < 200) {
      content = extractMainContent();
    }

    // 策略3: 最后备选 - 获取所有段落
    if (!content || content.length < 100) {
      content = extractAllParagraphs();
    }

    return cleanContent(content);
  }

  /**
   * Readability 风格的内容提取
   */
  function extractWithReadability() {
    // 克隆 DOM 以避免修改原页面
    const clone = document.body.cloneNode(true);

    // 移除不需要的元素
    const removeSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 'aside',
      '.sidebar', '.navigation', '.menu', '.ads', '.advertisement',
      '.social-share', '.comments', '.related-posts', '.recommendation',
      '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
      '.hidden', '[style*="display: none"]', '[style*="display:none"]'
    ];

    removeSelectors.forEach(selector => {
      try {
        clone.querySelectorAll(selector).forEach(el => el.remove());
      } catch (e) {}
    });

    // 查找最可能是正文内容的容器
    const contentSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      '#content',
      '.post',
      '.article',
      'body'
    ];

    for (const selector of contentSelectors) {
      const el = clone.querySelector(selector);
      if (el) {
        const text = el.innerText || el.textContent;
        if (text && text.length > 200) {
          return text;
        }
      }
    }

    return null;
  }

  /**
   * 提取主要内容区域
   */
  function extractMainContent() {
    // 找出文本密度最高的元素
    const candidates = document.querySelectorAll('div, section, article, main');
    let bestElement = null;
    let bestScore = 0;

    candidates.forEach(el => {
      const text = el.innerText || el.textContent;
      if (!text) return;

      const paragraphs = el.querySelectorAll('p');
      const links = el.querySelectorAll('a');

      // 计算得分：段落数量 + 文本长度 - 链接数量
      const score =
        paragraphs.length * 10 +
        text.length * 0.1 -
        links.length * 5;

      if (score > bestScore) {
        bestScore = score;
        bestElement = el;
      }
    });

    return bestElement ? (bestElement.innerText || bestElement.textContent) : null;
  }

  /**
   * 提取所有段落
   */
  function extractAllParagraphs() {
    const paragraphs = document.querySelectorAll('p');
    const texts = [];

    paragraphs.forEach(p => {
      const text = p.innerText.trim();
      if (text.length > 20) {  // 过滤太短的段落
        texts.push(text);
      }
    });

    return texts.join('\n\n');
  }

  /**
   * 清理内容
   */
  function cleanContent(content) {
    if (!content) return '';

    return content
      // 移除多余的空白
      .replace(/\s+/g, ' ')
      // 移除连续的换行
      .replace(/\n\s*\n/g, '\n\n')
      // 移除首尾空白
      .trim()
      // 限制长度
      .substring(0, 15000);
  }

  /**
   * 获取页面标题
   */
  function getTitle() {
    // 尝试多种标题来源
    const titleSelectors = [
      'h1',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'title'
    ];

    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const title = el.getAttribute('content') || el.innerText;
        if (title && title.trim()) {
          return title.trim();
        }
      }
    }

    return document.title || '无标题';
  }

  // 监听来自 popup 的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPageContent') {
      const content = extractContent();
      const title = getTitle();

      sendResponse({
        content,
        title,
        url: window.location.href
      });
    }

    return true;  // 保持消息通道开放
  });

})();
