// popup.js - 弹窗逻辑

class AIWebSummary {
  constructor() {
    this.currentMode = 'brief';
    this.currentSummary = null;
    this.currentPageInfo = null;
    this.translatedSummary = null;
    this.showingOriginal = true;
    this.settings = null;
    this.MAX_HISTORY = 20;
    this.FREE_DAILY_LIMIT = 5;
    this.isPro = false;
    this.todayUsage = 0;
    this.cachedSummaries = {};

    this.init();
  }

  async init() {
    // 加载设置
    await this.loadSettings();

    // 加载 Pro 状态和用量
    await this.loadProStatus();

    // 绑定事件
    this.bindEvents();

    // 更新状态
    this.updateStatus();

    // 检查是否自动摘要
    await this.checkAutoSummarize();

    // 检查是否有右键翻译请求
    await this.checkPendingTranslate();
  }

  bindEvents() {
    // 模式选择
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => this.selectMode(btn.dataset.mode));
    });

    // 生成摘要
    document.getElementById('summarizeBtn').addEventListener('click', () => this.summarize());

    // 操作按钮
    document.getElementById('copyBtn').addEventListener('click', () => this.copyResult());
    document.getElementById('exportBtn').addEventListener('click', () => this.exportMarkdown());
    document.getElementById('regenerateBtn').addEventListener('click', () => this.summarize());

    // 翻译
    document.getElementById('translateBtn').addEventListener('click', () => this.translateSummary());
    document.getElementById('toggleOriginalBtn').addEventListener('click', () => this.toggleOriginal());

    // 设置
    document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
    document.getElementById('backBtn').addEventListener('click', () => this.hideSettings());
    document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());

    // 模型切换时自动填充对应的 key
    document.getElementById('apiProvider').addEventListener('change', async (e) => {
      const result = await chrome.storage.local.get(['apiKeys']);
      const apiKeys = result.apiKeys || {};
      document.getElementById('apiKey').value = apiKeys[e.target.value] || '';
    });

    // 帮助展开/收起
    document.getElementById('helpToggle').addEventListener('click', () => {
      const content = document.getElementById('helpContent');
      const toggle = document.getElementById('helpToggle');
      content.classList.toggle('hidden');
      toggle.textContent = content.classList.contains('hidden')
        ? '如何获取 API Key？ ▼' : '如何获取 API Key？ ▲';
    });

    // 历史记录
    document.getElementById('historyBtn').addEventListener('click', () => this.showHistory());
    document.getElementById('backFromHistoryBtn').addEventListener('click', () => this.hideHistory());
    document.getElementById('clearHistoryBtn').addEventListener('click', () => this.clearHistory());

    // Pro
    document.getElementById('proBtn').addEventListener('click', () => {
      if (this.isPro) return;
      this.showProView();
    });
    document.getElementById('backFromProBtn').addEventListener('click', () => this.hideProView());
    document.getElementById('activateBtn').addEventListener('click', () => this.activatePro());
  }

  selectMode(mode) {
    // 免费版模式限制
    if (!this.isPro && (mode === 'keypoints' || mode === 'timeline')) {
      this.showError('要点和时间线模式为 Pro 功能，升级后解锁。');
      return;
    }

    const modeChanged = mode !== this.currentMode;
    this.currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // 首次切到新模式且已有内容时自动生成，已生成过的不再重复
    if (modeChanged && this.currentSummary && !this.cachedSummaries[mode]) {
      this.summarize();
    } else if (this.cachedSummaries[mode]) {
      this.showResult(this.cachedSummaries[mode]);
      this.currentSummary = this.cachedSummaries[mode];
    }
  }

  async loadSettings() {
    const result = await chrome.storage.local.get(['apiKeys', 'apiProvider', 'language']);
    const apiKeys = result.apiKeys || {};
    const provider = result.apiProvider || 'deepseek';

    this.settings = {
      apiKey: apiKeys[provider] || '',
      apiProvider: provider,
      language: result.language || 'auto'
    };

    // 更新设置界面
    document.getElementById('apiKey').value = this.settings.apiKey;
    document.getElementById('apiProvider').value = this.settings.apiProvider;
    document.getElementById('language').value = this.settings.language;
  }

  async loadProStatus() {
    const result = await chrome.storage.local.get(['proKey', 'dailyUsage', 'usageDate']);
    this.isPro = !!result.proKey;

    // 检查是否新的一天，重置计数
    const today = new Date().toDateString();
    if (result.usageDate !== today) {
      this.todayUsage = 0;
      await chrome.storage.local.set({ dailyUsage: 0, usageDate: today });
    } else {
      this.todayUsage = result.dailyUsage || 0;
    }

    // 更新 UI
    this.updateProUI();
  }

  updateProUI() {
    const proBtn = document.getElementById('proBtn');
    const usageCounter = document.getElementById('usageCounter');

    if (this.isPro) {
      proBtn.textContent = 'PRO';
      proBtn.classList.add('active');
      usageCounter.textContent = 'Pro · 无限使用';
    } else {
      const remaining = this.FREE_DAILY_LIMIT - this.todayUsage;
      usageCounter.textContent = `今日剩余: ${remaining}/${this.FREE_DAILY_LIMIT}`;
      if (remaining <= 0) {
        usageCounter.style.color = '#f87171';
      }
    }

    // 免费版锁定某些模式
    document.querySelectorAll('.mode-btn').forEach(btn => {
      const mode = btn.dataset.mode;
      if (!this.isPro && (mode === 'keypoints' || mode === 'timeline')) {
        btn.classList.add('locked');
      } else {
        btn.classList.remove('locked');
      }
    });

    // 免费版隐藏翻译
    if (!this.isPro) {
      const translateSection = document.querySelector('.translate-section');
      if (translateSection) translateSection.classList.add('pro-only');
    }
  }

  checkUsageLimit() {
    if (this.isPro) return true;
    if (this.todayUsage >= this.FREE_DAILY_LIMIT) {
      this.showError(`今日已用 ${this.todayUsage} 次，免费版每日限 ${this.FREE_DAILY_LIMIT} 次。升级 Pro 解锁无限使用。`);
      return false;
    }
    return true;
  }

  async recordUsage() {
    this.todayUsage++;
    await chrome.storage.local.set({
      dailyUsage: this.todayUsage,
      usageDate: new Date().toDateString()
    });
    this.updateProUI();
  }

  async activatePro() {
    const input = document.getElementById('proKeyInput');
    const btn = document.getElementById('activateBtn');
    const code = input.value.trim().toUpperCase();

    if (!code) {
      input.style.borderColor = '#f87171';
      input.setAttribute('placeholder', '请输入激活码');
      return;
    }

    // 格式校验
    const pattern = /^SD-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!pattern.test(code)) {
      input.style.borderColor = '#f87171';
      input.value = '';
      input.setAttribute('placeholder', '格式: SD-XXXX-XXXX-XXXX');
      return;
    }

    // SHA-256 哈希
    const hash = await this.sha256(code);

    // 本地格式校验
    const validHashes = VALID_KEY_HASHES;
    if (!validHashes.includes(hash)) {
      input.style.borderColor = '#f87171';
      input.value = '';
      input.setAttribute('placeholder', '激活码无效，请重新输入');
      return;
    }

    // 服务端验证：一码一用
    btn.disabled = true;
    btn.textContent = '验证中...';
    input.style.borderColor = '';

    try {
      const resp = await fetch('https://shandu-api.z-yingshuang.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', keyHash: hash })
      });

      const result = await resp.json();

      if (result.success) {
        await chrome.storage.local.set({ proKey: code });
        this.isPro = true;
        this.updateProUI();
        this.hideProView();
      } else {
        input.style.borderColor = '#f87171';
        input.value = '';
        input.setAttribute('placeholder', result.error || '激活码已被使用');
      }
    } catch (e) {
      // 网络失败时回退到本地验证
      const usedResult = await chrome.storage.local.get(['usedKeys']);
      const usedKeys = usedResult.usedKeys || [];
      if (usedKeys.includes(hash)) {
        input.style.borderColor = '#f87171';
        input.value = '';
        input.setAttribute('placeholder', '激活码已被使用');
      } else {
        usedKeys.push(hash);
        await chrome.storage.local.set({ proKey: code, usedKeys });
        this.isPro = true;
        this.updateProUI();
        this.hideProView();
      }
    } finally {
      btn.disabled = false;
      btn.textContent = '激活 Pro';
    }
  }

  async sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async saveSettings() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const apiProvider = document.getElementById('apiProvider').value;
    const language = document.getElementById('language').value;

    // 保存当前模型的 key 到对应槽位
    const result = await chrome.storage.local.get(['apiKeys']);
    const apiKeys = result.apiKeys || {};
    apiKeys[apiProvider] = apiKey;

    await chrome.storage.local.set({
      apiKeys,
      apiProvider,
      language
    });

    this.settings = { apiKey, apiProvider, language };
    this.hideSettings();
    this.updateStatus();
  }

  showSettings() {
    this.hideAllViews();
    document.getElementById('settingsView').classList.remove('hidden');
  }

  hideSettings() {
    this.hideAllViews();
    document.getElementById('mainView').classList.remove('hidden');
  }

  async showHistory() {
    this.hideAllViews();
    document.getElementById('historyView').classList.remove('hidden');
    await this.loadHistory();
  }

  hideHistory() {
    this.hideAllViews();
    document.getElementById('mainView').classList.remove('hidden');
  }

  showProView() {
    this.hideAllViews();
    document.getElementById('proView').classList.remove('hidden');
  }

  hideProView() {
    this.hideAllViews();
    document.getElementById('mainView').classList.remove('hidden');
  }

  hideAllViews() {
    document.getElementById('mainView').classList.add('hidden');
    document.getElementById('settingsView').classList.add('hidden');
    document.getElementById('historyView').classList.add('hidden');
    document.getElementById('proView').classList.add('hidden');
  }

  updateStatus() {
    const statusText = document.getElementById('statusText');
    if (!this.settings.apiKey) {
      statusText.textContent = '⚠️ 请先设置 API Key';
      statusText.style.color = '#f59e0b';
    } else {
      statusText.textContent = '⚡ 准备就绪 | 快捷键: Ctrl+Shift+S';
      statusText.style.color = '#666';
    }
  }

  async checkAutoSummarize() {
    // 检查是否通过快捷键触发自动摘要
    const result = await chrome.storage.local.get(['autoSummarize']);
    if (result.autoSummarize) {
      await chrome.storage.local.remove('autoSummarize');
      setTimeout(() => this.summarize(), 100);
    }
  }

  async checkPendingTranslate() {
    const result = await chrome.storage.local.get(['pendingTranslate']);
    if (result.pendingTranslate) {
      await chrome.storage.local.remove('pendingTranslate');
      const content = result.pendingTranslate.content;
      // 直接翻译选中文字并显示
      setTimeout(() => this.translateText(content), 100);
    }
  }

  // 翻译摘要结果
  async translateSummary() {
    if (!this.currentSummary) return;
    if (!this.settings.apiKey) {
      this.showError('请先在设置中配置 API Key');
      return;
    }

    const targetLang = document.getElementById('translateTarget').value;
    const btn = document.getElementById('translateBtn');
    btn.disabled = true;
    btn.textContent = '⏳ 翻译中...';

    try {
      const textToTranslate = this.formatSummaryForTranslation(this.currentSummary);
      const translated = await this.callTranslateAPI(textToTranslate, targetLang);
      this.translatedSummary = translated;
      this.showingOriginal = false;
      this.showTranslateResult(translated, targetLang);
    } catch (error) {
      console.error('Translate error:', error);
      this.showError('翻译失败: ' + (error.message || '请重试'));
    } finally {
      btn.disabled = false;
      btn.textContent = '🌐 翻译摘要';
    }
  }

  // 右键翻译选中文字
  async translateText(text) {
    if (!this.settings.apiKey) {
      this.showError('请先在设置中配置 API Key');
      return;
    }

    this.hideResult();
    this.hideError();
    this.setLoading(true);

    try {
      const targetLang = 'zh'; // 默认翻译为中文
      const translated = await this.callTranslateAPI(text, targetLang);

      // 构造一个简单的 summary 对象来显示翻译结果
      const fakeSummary = {
        keyPoints: [translated],
        keyData: [],
        actions: []
      };

      this.currentSummary = fakeSummary;
      this.currentPageInfo = { title: '翻译结果', url: '' };
      this.showResult(fakeSummary);
    } catch (error) {
      console.error('Translate error:', error);
      this.showError('翻译失败: ' + (error.message || '请重试'));
    } finally {
      this.setLoading(false);
    }
  }

  async callTranslateAPI(text, targetLang) {
    const langNames = {
      zh: '中文', en: 'English', ja: '日本語',
      ko: '한국어', fr: 'Français', de: 'Deutsch'
    };

    const systemPrompt = `你是一个专业翻译。请将以下内容翻译为${langNames[targetLang]}。
只返回翻译结果，不要添加解释或注释。保持原文的格式和结构。`;

    const { apiKey, apiProvider } = this.settings;
    const userPrompt = text;

    switch (apiProvider) {
      case 'openai':
      case 'openai-gpt35':
        return await this.translateOpenAI(apiKey, apiProvider, systemPrompt, userPrompt);
      case 'claude':
        return await this.translateClaude(apiKey, systemPrompt, userPrompt);
      default:
        // 国内模型都走 OpenAI 兼容接口
        return await this.translateCompatible(apiKey, apiProvider, systemPrompt, userPrompt);
    }
  }

  async translateOpenAI(apiKey, provider, systemPrompt, userPrompt) {
    const model = provider === 'openai-gpt35' ? 'gpt-3.5-turbo' : 'gpt-4o';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3
      })
    });
    if (!response.ok) throw new Error('翻译 API 调用失败');
    const data = await response.json();
    return data.choices[0].message.content;
  }

  async translateClaude(apiKey, systemPrompt, userPrompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    if (!response.ok) throw new Error('翻译 API 调用失败');
    const data = await response.json();
    return data.content[0].text;
  }

  async translateCompatible(apiKey, provider, systemPrompt, userPrompt) {
    const endpoints = {
      deepseek: 'https://api.deepseek.com/v1/chat/completions',
      qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      glm: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      kimi: 'https://api.moonshot.cn/v1/chat/completions',
      yi: 'https://api.lingyiwanwu.com/v1/chat/completions'
    };
    const models = {
      deepseek: 'deepseek-chat',
      qwen: 'qwen-turbo',
      glm: 'glm-4-flash',
      kimi: 'moonshot-v1-8k',
      yi: 'yi-lightning'
    };

    const response = await fetch(endpoints[provider], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: models[provider],
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3
      })
    });
    if (!response.ok) throw new Error('翻译 API 调用失败');
    const data = await response.json();
    return data.choices[0].message.content;
  }

  formatSummaryForTranslation(summary) {
    let text = '核心观点：\n';
    summary.keyPoints.forEach((p, i) => { text += `${i + 1}. ${p}\n`; });
    if (summary.keyData && summary.keyData.length > 0) {
      text += '\n关键数据：\n';
      summary.keyData.forEach((d, i) => { text += `${i + 1}. ${d}\n`; });
    }
    if (summary.actions && summary.actions.length > 0) {
      text += '\n行动建议：\n';
      summary.actions.forEach((a, i) => { text += `${i + 1}. ${a}\n`; });
    }
    return text;
  }

  showTranslateResult(translated, langCode) {
    const langNames = {
      zh: '中文', en: 'English', ja: '日本語',
      ko: '한국어', fr: 'Français', de: 'Deutsch'
    };

    const container = document.getElementById('translateResult');
    container.classList.remove('hidden');
    document.getElementById('translateLang').textContent = `🌐 ${langNames[langCode]} 译文`;

    // 将翻译结果按行解析
    const lines = translated.split('\n').filter(l => l.trim());
    const pointsList = document.getElementById('translatedPoints');
    pointsList.innerHTML = lines.map(l => `<li>${l.replace(/^\d+\.\s*/, '')}</li>`).join('');

    // 隐藏原文，显示翻译结果
    document.getElementById('keyPoints').parentElement.classList.add('hidden');
    document.getElementById('dataSection').classList.add('hidden');
    document.getElementById('actionSection').classList.add('hidden');

    const toggleBtn = document.getElementById('toggleOriginalBtn');
    toggleBtn.textContent = '查看原文';
    toggleBtn.classList.remove('active');
  }

  toggleOriginal() {
    const toggleBtn = document.getElementById('toggleOriginalBtn');
    const translateResult = document.getElementById('translateResult');
    const keyPointsSection = document.getElementById('keyPoints').parentElement;

    if (this.showingOriginal) {
      // 显示译文
      if (this.translatedSummary) {
        keyPointsSection.classList.add('hidden');
        document.getElementById('dataSection').classList.add('hidden');
        document.getElementById('actionSection').classList.add('hidden');
        translateResult.classList.remove('hidden');
        toggleBtn.textContent = '查看原文';
        toggleBtn.classList.remove('active');
      }
    } else {
      // 显示原文
      keyPointsSection.classList.remove('hidden');
      if (this.currentSummary.keyData && this.currentSummary.keyData.length > 0) {
        document.getElementById('dataSection').classList.remove('hidden');
      }
      if (this.currentSummary.actions && this.currentSummary.actions.length > 0) {
        document.getElementById('actionSection').classList.remove('hidden');
      }
      translateResult.classList.add('hidden');
      toggleBtn.textContent = '查看译文';
      toggleBtn.classList.add('active');
    }

    this.showingOriginal = !this.showingOriginal;
  }

  async summarize() {
    // 检查 API Key
    if (!this.settings.apiKey) {
      this.showError('请先在设置中配置 API Key');
      return;
    }

    // 检查用量限制
    if (!this.checkUsageLimit()) return;

    // 检查免费版模式限制
    if (!this.isPro && (this.currentMode === 'keypoints' || this.currentMode === 'timeline')) {
      this.showError('要点和时间线模式为 Pro 功能，请升级解锁。');
      return;
    }

    // 显示加载状态
    this.setLoading(true);
    this.hideError();
    this.hideResult();

    try {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // 向 content script 请求页面内容
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getPageContent'
      });

      if (!response || !response.content) {
        throw new Error('无法获取页面内容');
      }

      // 保存页面信息
      this.currentPageInfo = {
        title: response.title,
        url: response.url
      };

      // 调用 API 生成摘要
      const summary = await this.callAPI(response.content, response.title, response.url);

      // 显示结果
      this.showResult(summary);
      this.currentSummary = summary;
      this.cachedSummaries[this.currentMode] = summary;

      // 保存到历史记录
      await this.saveToHistory(summary, response.title, response.url);

      // 记录用量
      await this.recordUsage();

    } catch (error) {
      console.error('Summarize error:', error);
      this.showError(error.message || '生成摘要失败，请重试');
    } finally {
      this.setLoading(false);
    }
  }

  async callAPI(content, title, url) {
    const { apiKey, apiProvider, language } = this.settings;

    const languagePrompt = language === 'zh' ? '请用中文回答。'
      : language === 'en' ? 'Please respond in English.'
      : '请用文章的原始语言回答。';

    // 每种模式用完全不同的 prompt 和 JSON 结构
    const modeConfigs = {
      brief: {
        prompt: `你是一个内容摘要助手。请用极其简洁的方式总结这篇文章，总共不超过100字。${languagePrompt}

请以 JSON 格式返回：
{
  "oneSentence": "一句话总结这篇文章的核心内容",
  "keyPoints": ["最关键的2-3个观点，每个不超过15字"],
  "reading": "这篇文章值不值得细读？为什么？（一句话）"
}

只返回 JSON，不要其他内容。`,
        parse: (data) => ({
          mode: 'brief',
          keyPoints: data.keyPoints || [],
          keyData: data.oneSentence ? [`📝 一句话：${data.oneSentence}`] : [],
          actions: data.reading ? [`📖 ${data.reading}`] : []
        })
      },

      detailed: {
        prompt: `你是一个深度分析助手。请对这篇文章进行全面、深入的分析。${languagePrompt}

请以 JSON 格式返回：
{
  "summary": "200字以内的完整摘要",
  "arguments": [
    {"point": "核心论点", "evidence": "支撑论据"}
  ],
  "keyData": ["关键数据或事实，至少3个"],
  "conclusion": "作者的最终结论",
  "actions": ["读者可以采取的实际行动建议，至少2个"]
}

只返回 JSON，不要其他内容。确保分析深入，论据充分。`,
        parse: (data) => ({
          mode: 'detailed',
          keyPoints: [
            data.summary,
            ...(data.arguments || []).map(a => `${a.point}：${a.evidence}`)
          ],
          keyData: data.keyData || [],
          actions: [
            ...(data.conclusion ? [`🎯 结论：${data.conclusion}`] : []),
            ...(data.actions || [])
          ]
        })
      },

      keypoints: {
        prompt: `你是一个信息提取专家。请从这篇文章中提取所有重要信息点，越多越好。${languagePrompt}

请以 JSON 格式返回：
{
  "facts": ["文章中的关键事实，8-12条，每条一句话"],
  "numbers": ["文章中提到的所有数字/数据/统计，如'用户增长30%'"],
  "names": ["文章中提到的重要人物/公司/产品名称"]
}

只返回 JSON，不要其他内容。力求全面，不遗漏重要信息。`,
        parse: (data) => ({
          mode: 'keypoints',
          keyPoints: data.facts || [],
          keyData: [
            ...(data.numbers || []).map(n => `📊 ${n}`),
            ...(data.names || []).map(n => `👤 ${n}`)
          ],
          actions: []
        })
      },

      timeline: {
        prompt: `你是一个事件分析专家。请按时间线梳理这篇文章涉及的事件发展脉络。${languagePrompt}

请以 JSON 格式返回：
{
  "background": "事件背景（一两句话）",
  "events": [
    {"time": "时间点或阶段", "event": "发生了什么", "significance": "为什么重要"}
  ],
  "currentStatus": "目前的状态/进展",
  "futureOutlook": "未来可能的走向预测"
}

只返回 JSON，不要其他内容。如果文章不是事件类内容，请按逻辑顺序梳理关键节点。`,
        parse: (data) => ({
          mode: 'timeline',
          keyPoints: [
            ...(data.background ? [`📌 背景：${data.background}`] : []),
            ...(data.events || []).map(e => `⏰ ${e.time}：${e.event}（${e.significance}）`)
          ],
          keyData: [
            ...(data.currentStatus ? [`📍 当前：${data.currentStatus}`] : []),
            ...(data.futureOutlook ? [`🔮 预测：${data.futureOutlook}`] : [])
          ],
          actions: []
        })
      }
    };

    const config = modeConfigs[this.currentMode];
    const systemPrompt = config.prompt;
    const userPrompt = `文章标题：${title}\n文章链接：${url}\n\n文章内容：\n${content.substring(0, 8000)}`;

    let rawResult;
    switch (apiProvider) {
      case 'openai':
      case 'openai-gpt35':
        rawResult = await this.callOpenAI(apiKey, apiProvider, systemPrompt, userPrompt);
        break;
      case 'claude':
        rawResult = await this.callClaude(apiKey, systemPrompt, userPrompt);
        break;
      case 'deepseek':
        rawResult = await this.callDeepSeek(apiKey, systemPrompt, userPrompt);
        break;
      case 'qwen':
        rawResult = await this.callQwen(apiKey, systemPrompt, userPrompt);
        break;
      case 'glm':
        rawResult = await this.callGLM(apiKey, systemPrompt, userPrompt);
        break;
      case 'kimi':
        rawResult = await this.callKimi(apiKey, systemPrompt, userPrompt);
        break;
      case 'yi':
        rawResult = await this.callYi(apiKey, systemPrompt, userPrompt);
        break;
      default:
        throw new Error('不支持的 API 提供商');
    }

    // 用对应模式的解析器处理结果
    try {
      const parsed = JSON.parse(rawResult);
      if (rawResult.keyPoints) {
        // 旧格式直接返回
        return rawResult;
      }
      return config.parse(parsed);
    } catch {
      // 解析失败，用默认格式
      return config.parse(rawResult);
    }
  }

  // DeepSeek API
  async callDeepSeek(apiKey, systemPrompt, userPrompt) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'DeepSeek API 调用失败');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // 通义千问 API
  async callQwen(apiKey, systemPrompt, userPrompt) {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '通义千问 API 调用失败');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // 智谱 GLM-4 API
  async callGLM(apiKey, systemPrompt, userPrompt) {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '智谱 API 调用失败');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Kimi API
  async callKimi(apiKey, systemPrompt, userPrompt) {
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Kimi API 调用失败');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // 零一万物 Yi API
  async callYi(apiKey, systemPrompt, userPrompt) {
    const response = await fetch('https://api.lingyiwanwu.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'yi-lightning',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Yi API 调用失败');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // OpenAI API
  async callOpenAI(apiKey, provider, systemPrompt, userPrompt) {
    const model = provider === 'openai-gpt35' ? 'gpt-3.5-turbo' : 'gpt-4o';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API 调用失败');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Claude API
  async callClaude(apiKey, systemPrompt, userPrompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Claude API 调用失败');
    }

    const data = await response.json();
    return data.content[0].text;
  }

  // 解析响应
  parseResponse(content) {
    try {
      return JSON.parse(content);
    } catch {
      return this.parseUnstructuredResponse(content);
    }
  }

  parseUnstructuredResponse(content) {
    const lines = content.split('\n').filter(l => l.trim());
    return {
      keyPoints: lines.slice(0, 5),
      keyData: [],
      actions: []
    };
  }

  showResult(summary) {
    const container = document.getElementById('resultContainer');
    container.classList.remove('hidden');

    // 显示页面标题
    if (this.currentPageInfo) {
      document.getElementById('pageTitle').textContent = this.currentPageInfo.title;
    }

    // 核心观点
    const keyPointsList = document.getElementById('keyPoints');
    keyPointsList.innerHTML = summary.keyPoints.map(p => `<li>${p}</li>`).join('');

    // 关键数据
    const dataSection = document.getElementById('dataSection');
    const keyDataList = document.getElementById('keyData');
    if (summary.keyData && summary.keyData.length > 0) {
      dataSection.classList.remove('hidden');
      keyDataList.innerHTML = summary.keyData.map(d => `<li>${d}</li>`).join('');
    } else {
      dataSection.classList.add('hidden');
    }

    // 行动建议
    const actionSection = document.getElementById('actionSection');
    const actionsList = document.getElementById('actions');
    if (summary.actions && summary.actions.length > 0) {
      actionSection.classList.remove('hidden');
      actionsList.innerHTML = summary.actions.map(a => `<li>${a}</li>`).join('');
    } else {
      actionSection.classList.add('hidden');
    }
  }

  hideResult() {
    document.getElementById('resultContainer').classList.add('hidden');
    document.getElementById('translateResult').classList.add('hidden');
    this.translatedSummary = null;
    this.showingOriginal = true;
  }

  async copyResult() {
    if (!this.currentSummary) return;

    const text = this.formatSummaryForCopy(this.currentSummary);

    try {
      await navigator.clipboard.writeText(text);
      this.showButtonFeedback('copyBtn', '✅ 已复制');
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }

  exportMarkdown() {
    if (!this.currentSummary || !this.currentPageInfo) return;

    const markdown = this.formatSummaryForMarkdown(this.currentSummary, this.currentPageInfo);

    // 创建下载
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `摘要_${this.currentPageInfo.title.substring(0, 30)}.md`;
    a.click();
    URL.revokeObjectURL(url);

    this.showButtonFeedback('exportBtn', '✅ 已导出');
  }

  formatSummaryForCopy(summary) {
    let text = '📌 核心观点\n';
    summary.keyPoints.forEach((p, i) => {
      text += `${i + 1}. ${p}\n`;
    });

    if (summary.keyData && summary.keyData.length > 0) {
      text += '\n📊 关键数据\n';
      summary.keyData.forEach((d, i) => {
        text += `${i + 1}. ${d}\n`;
      });
    }

    if (summary.actions && summary.actions.length > 0) {
      text += '\n💡 行动建议\n';
      summary.actions.forEach((a, i) => {
        text += `${i + 1}. ${a}\n`;
      });
    }

    if (this.currentPageInfo) {
      text += `\n📖 来源: ${this.currentPageInfo.title}\n`;
      text += `🔗 链接: ${this.currentPageInfo.url}\n`;
    }

    text += '\n—— 由 AI 网页摘要生成';
    return text;
  }

  formatSummaryForMarkdown(summary, pageInfo) {
    let md = `# ${pageInfo.title}\n\n`;
    md += `> 来源: [${pageInfo.url}](${pageInfo.url})\n\n`;

    md += `## 📌 核心观点\n\n`;
    summary.keyPoints.forEach(p => {
      md += `- ${p}\n`;
    });

    if (summary.keyData && summary.keyData.length > 0) {
      md += `\n## 📊 关键数据\n\n`;
      summary.keyData.forEach(d => {
        md += `- ${d}\n`;
      });
    }

    if (summary.actions && summary.actions.length > 0) {
      md += `\n## 💡 行动建议\n\n`;
      summary.actions.forEach(a => {
        md += `- ${a}\n`;
      });
    }

    md += `\n---\n*由 AI 网页摘要生成于 ${new Date().toLocaleString('zh-CN')}*\n`;
    return md;
  }

  showButtonFeedback(btnId, message) {
    const btn = document.getElementById(btnId);
    const originalText = btn.textContent;
    btn.textContent = message;
    setTimeout(() => {
      btn.textContent = originalText;
    }, 1500);
  }

  // 历史记录功能
  async saveToHistory(summary, title, url) {
    const result = await chrome.storage.local.get(['history']);
    let history = result.history || [];

    // 添加新记录到开头
    history.unshift({
      summary,
      title,
      url,
      timestamp: Date.now()
    });

    // 限制历史记录数量
    if (history.length > this.MAX_HISTORY) {
      history = history.slice(0, this.MAX_HISTORY);
    }

    await chrome.storage.local.set({ history });
  }

  async loadHistory() {
    const result = await chrome.storage.local.get(['history']);
    const history = result.history || [];
    const container = document.getElementById('historyList');

    if (history.length === 0) {
      container.innerHTML = '<p class="empty-state">暂无历史记录</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => `
      <div class="history-item" data-index="${index}">
        <div class="history-item-header">
          <span class="history-item-title">${this.escapeHtml(item.title)}</span>
          <span class="history-item-time">${this.formatTime(item.timestamp)}</span>
        </div>
        <div class="history-item-preview">${this.escapeHtml(item.summary.keyPoints[0] || '')}</div>
      </div>
    `).join('');

    // 绑定点击事件
    container.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => this.loadHistoryItem(parseInt(item.dataset.index)));
    });
  }

  async loadHistoryItem(index) {
    const result = await chrome.storage.local.get(['history']);
    const history = result.history || [];
    const item = history[index];

    if (item) {
      this.currentSummary = item.summary;
      this.currentPageInfo = {
        title: item.title,
        url: item.url
      };
      this.showResult(item.summary);
      this.hideHistory();
    }
  }

  async clearHistory() {
    if (confirm('确定要清空所有历史记录吗？')) {
      await chrome.storage.local.set({ history: [] });
      await this.loadHistory();
    }
  }

  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return new Date(timestamp).toLocaleDateString('zh-CN');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  setLoading(loading) {
    const btn = document.getElementById('summarizeBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');

    btn.disabled = loading;
    btnText.classList.toggle('hidden', loading);
    btnLoading.classList.toggle('hidden', !loading);
  }

  showError(message) {
    const container = document.getElementById('errorContainer');
    const messageEl = document.getElementById('errorMessage');
    container.classList.remove('hidden');
    messageEl.textContent = message;
  }

  hideError() {
    document.getElementById('errorContainer').classList.add('hidden');
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new AIWebSummary();
});
