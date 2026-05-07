const OSS = require('ali-oss');

const BUCKET = process.env.OSS_BUCKET;
const REGION = process.env.OSS_REGION || 'oss-cn-hangzhou';

let client = null;

function getOSSClient() {
  if (client) return client;
  client = new OSS({
    region: REGION,
    accessKeyId: process.env.OSS_AK,
    accessKeySecret: process.env.OSS_SK,
    bucket: BUCKET,
  });
  return client;
}

async function loadKeys(oss) {
  try {
    const r = await oss.get('keys.json');
    return JSON.parse(r.content.toString());
  } catch {
    return {};
  }
}

function jsonResp(statusCode, data) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: typeof data === 'string' ? data : JSON.stringify(data),
  };
}

exports.handler = async (event, context) => {
  // FC 3.0: event is a Buffer, decode to get JSON with request info
  let evt;
  if (Buffer.isBuffer(event)) {
    evt = JSON.parse(event.toString());
  } else if (typeof event === 'string') {
    evt = JSON.parse(event);
  } else {
    evt = event;
  }

  const method = (evt.requestContext && evt.requestContext.http && evt.requestContext.http.method)
    || evt.httpMethod || evt.method || 'GET';

  if (method === 'OPTIONS') {
    return jsonResp(200, '');
  }

  if (method !== 'POST') {
    return jsonResp(405, { error: 'Method not allowed' });
  }

  try {
    let bodyStr = evt.body || '{}';
    if (evt.isBase64Encoded) {
      bodyStr = Buffer.from(bodyStr, 'base64').toString();
    }
    const { action, keyHash, clientId, systemPrompt, userPrompt } = JSON.parse(bodyStr);

    // Proxy: free user AI summarization
    if (action === 'proxy') {
      if (!clientId || !systemPrompt || !userPrompt) {
        return jsonResp(400, { error: 'Missing parameters' });
      }
      const apiKey = process.env.GLM_API_KEY;
      if (!apiKey) {
        return jsonResp(503, { error: 'Service unavailable' });
      }
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        return jsonResp(502, { error: err.error?.message || 'AI model call failed' });
      }
      const data = await response.json();
      return jsonResp(200, { content: data.choices[0].message.content });
    }

    // Activate / Verify
    if (!keyHash) {
      return jsonResp(400, { error: 'Missing keyHash' });
    }

    const oss = getOSSClient();
    const keys = await loadKeys(oss);

    if (action === 'activate') {
      if (keys[keyHash]) {
        return jsonResp(200, { success: false, error: '该激活码已被使用' });
      }
      keys[keyHash] = { activatedAt: new Date().toISOString() };
      await oss.put('keys.json', Buffer.from(JSON.stringify(keys)));
      return jsonResp(200, { success: true });
    }

    if (action === 'verify') {
      return jsonResp(200, { success: !!keys[keyHash] });
    }

    return jsonResp(400, { error: 'Invalid action' });
  } catch (e) {
    return jsonResp(500, { error: 'Server error: ' + e.message });
  }
};
