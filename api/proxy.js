// Vercel Serverless Function - AI 代理接口

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, clientId, systemPrompt, userPrompt } = req.body;

    if (action !== 'proxy') {
      return res.status(400).json({ error: 'Invalid action' });
    }

    if (!clientId || !systemPrompt || !userPrompt) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // 限流：基于 clientId，最多 10 次/天
    // Vercel 无 KV，使用客户端本地计数 + 服务端软限流
    // 这里只做简单的无状态代理，限流由客户端自行控制

    const apiKey = process.env.GLM_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Service unavailable' });
    }

    // 调用智谱 GLM-4-Flash API
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
      const err = await response.json();
      return res.status(502).json({ error: err.error?.message || 'AI model call failed' });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    return res.status(200).json({ content });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
