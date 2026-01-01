const axios = require('axios');
const { URLSearchParams } = require('url');

const normalizeResponse = (data) => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
};

const callSmmApi = async (action, data = {}) => {
  const apiUrl = process.env.METJAR_API_URL;
  const apiKey = process.env.METJAR_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error('SMM API is not configured');
  }

  const params = new URLSearchParams();
  params.append('key', apiKey);
  params.append('action', action);

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.append(key, String(value));
  });

  const response = await axios.post(apiUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 120000,
  });

  const result = normalizeResponse(response.data);
  if (result && typeof result === 'object' && result.error) {
    throw new Error(result.error);
  }

  return result;
};

module.exports = { callSmmApi };
