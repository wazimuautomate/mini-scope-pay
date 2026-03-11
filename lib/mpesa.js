const MPESA_BASE_URL = 'https://api.safaricom.co.ke';

export async function getMpesaAccessToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error('M-Pesa consumer credentials not configured');
  }

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  const res = await fetch(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` },
    }
  );

  if (!res.ok) {
    throw new Error(`M-Pesa token request failed: ${res.status}`);
  }

  const data = await res.json();

  if (!data.access_token) {
    throw new Error('No access token returned from M-Pesa');
  }

  return data.access_token;
}

export async function sendStkPush(accessToken, stkData) {
  const res = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(stkData),
  });

  const data = await res.json();
  return data;
}

/**
 * Formats a raw phone number to 254XXXXXXXXX
 * Accepts: 07XX, 7XX, 2547XX, +2547XX
 */
export function formatPhone(raw) {
  let phone = String(raw).replace(/[^0-9]/g, '');

  if (phone.length === 9) {
    phone = '254' + phone;
  } else if (phone.length === 10 && phone.startsWith('0')) {
    phone = '254' + phone.slice(1);
  }

  if (phone.length !== 12 || !phone.startsWith('254')) {
    return null;
  }

  return phone;
}

/**
 * Builds the STK push timestamp and password
 */
export function buildStkCredentials() {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;

  if (!shortcode || !passkey) {
    throw new Error('M-Pesa shortcode or passkey not configured');
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, '')
    .slice(0, 14);

  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  return { shortcode, timestamp, password };
}
