import Link from 'next/link';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com';

const initiateRequest = `{
  "phone": "0712345678",
  "amount": 100,
  "reference": "ORDER-1033",
  "agent_id": "agent_01",
  "till_number": "123456"
}`;

const initiateSuccess = `{
  "success": true,
  "message": "STK push sent. Awaiting customer payment.",
  "checkout_request_id": "ws_CO_191220191020363925",
  "reference": "ORDER-1033"
}`;

const statusSuccess = `{
  "success": true,
  "status": "completed",
  "receipt_number": "QH91HJK2L",
  "agent_id": "agent_01",
  "till_number": "123456",
  "amount": 100,
  "phone": "254712345678",
  "reference": "ORDER-1033",
  "result_desc": "The service request is processed successfully.",
  "created_at": "2026-03-19T09:22:11.509Z",
  "updated_at": "2026-03-19T09:23:03.997Z"
}`;

const callbackExample = `{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_191220191020363925",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 100.00 },
          { "Name": "MpesaReceiptNumber", "Value": "QH91HJK2L" },
          { "Name": "TransactionDate", "Value": 20260319122259 },
          { "Name": "PhoneNumber", "Value": 254712345678 }
        ]
      }
    }
  }
}`;

const supabaseSql = `create table if not exists payments (
  id bigint generated always as identity primary key,
  phone text,
  amount numeric,
  amount_paid numeric,
  reference text,
  agent_id text,
  till_number text,
  checkout_request_id text unique,
  merchant_request_id text,
  status text default 'pending',
  result_code integer,
  result_desc text,
  receipt_number text,
  transaction_date text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);`;

const jsExample = `const response = await fetch('${baseUrl}/api/stk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '0712345678',
    amount: 100,
    reference: 'ORDER-1033'
  })
});

const result = await response.json();

if (!result.success) throw new Error(result.message);

const checkoutRequestId = result.checkout_request_id;

// Poll until completed/failed
const poll = async () => {
  const statusRes = await fetch(
    '${baseUrl}/api/status?checkout_request_id=' + encodeURIComponent(checkoutRequestId)
  );
  const statusData = await statusRes.json();

  if (statusData.status === 'pending') {
    setTimeout(poll, 3000);
  } else {
    console.log('Final status:', statusData);
  }
};

poll();`;

const curlExample = `curl -X POST ${baseUrl}/api/stk \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "0712345678",
    "amount": 100,
    "reference": "ORDER-1033"
  }'`;

export default function DocsPage() {
  return (
    <div className="docs-shell">
      <aside className="sidebar">
        <Link href="/docs" className="brand">ScopePay Docs</Link>

        <div className="side-group">
          <p className="side-title">Getting Started</p>
          <ul className="side-list">
            <li><a href="#overview">Overview</a></li>
            <li><a href="#setup">Environment Setup</a></li>
            <li><a href="#flow">Payment Flow</a></li>
          </ul>
        </div>

        <div className="side-group">
          <p className="side-title">Endpoints</p>
          <ul className="side-list">
            <li><a href="#stk">Initiate STK Push</a></li>
            <li><a href="#status">Check Transaction Status</a></li>
            <li><a href="#callback">Safaricom Callback</a></li>
          </ul>
        </div>

        <div className="side-group">
          <p className="side-title">Reference</p>
          <ul className="side-list">
            <li><a href="#errors">Error Handling</a></li>
            <li><a href="#examples">Code Examples</a></li>
            <li><a href="#database">Database Schema</a></li>
          </ul>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <span className="tag">M-Pesa STK Gateway Integration</span>
            <h1>ScopePay M-Pesa Gateway Documentation</h1>
            <p>
              Use this guide to integrate STK push collection on your site, process callbacks,
              and verify transaction status.
            </p>
          </div>
          <div className="top-links">
            <a className="top-chip" href="https://scopepay.co.ke/">Home</a>
            <a className="top-chip" href="https://scopepay.co.ke/dashboard.php">Dashboard</a>
          </div>
        </div>

        <section id="overview" className="panel">
          <h2>Overview</h2>
          <p>
            This gateway exposes two integration endpoints for your checkout flow and one internal
            callback endpoint for Safaricom.
          </p>
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Base URL</td>
                <td><code>{baseUrl}</code></td>
              </tr>
              <tr>
                <td>Content Type</td>
                <td><code>application/json</code></td>
              </tr>
              <tr>
                <td>Main Endpoint</td>
                <td><code>POST /api/stk</code></td>
              </tr>
              <tr>
                <td>Status Endpoint</td>
                <td><code>GET /api/status?checkout_request_id=...</code></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section id="setup" className="panel">
          <h2>Environment Setup</h2>
          <p>Set these environment variables in your deployment environment.</p>
          <table>
            <thead>
              <tr>
                <th>Variable</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>SUPABASE_URL</code></td><td>Yes</td><td>Supabase project URL.</td></tr>
              <tr><td><code>SUPABASE_SERVICE_ROLE_KEY</code></td><td>Yes</td><td>Server key used to write payment records.</td></tr>
              <tr><td><code>MPESA_CONSUMER_KEY</code></td><td>Yes</td><td>Safaricom app consumer key.</td></tr>
              <tr><td><code>MPESA_CONSUMER_SECRET</code></td><td>Yes</td><td>Safaricom app consumer secret.</td></tr>
              <tr><td><code>MPESA_PASSKEY</code></td><td>Yes</td><td>Lipa Na M-Pesa online passkey.</td></tr>
              <tr><td><code>MPESA_SHORTCODE</code></td><td>Yes</td><td>Paybill or till shortcode used in password generation.</td></tr>
              <tr><td><code>MPESA_PAYMENT_MODE</code></td><td>Yes</td><td><code>paybill</code> or <code>till</code>.</td></tr>
              <tr><td><code>MPESA_PAYBILL_NUMBER</code></td><td>Paybill mode</td><td>Destination paybill.</td></tr>
              <tr><td><code>MPESA_TILL_NUMBER</code></td><td>Till mode</td><td>Default till number (optional, per-request till is supported).</td></tr>
              <tr><td><code>MPESA_ACCOUNT_NUMBER</code></td><td>Optional</td><td>Default account reference when using paybill mode.</td></tr>
              <tr><td><code>MPESA_CALLBACK_URL</code></td><td>Yes</td><td>Public HTTPS URL that points to <code>/api/callback</code>.</td></tr>
            </tbody>
          </table>
        </section>

        <section id="flow" className="panel">
          <h2>Payment Flow</h2>
          <ol>
            <li>Your checkout calls <code>POST /api/stk</code> with phone and amount.</li>
            <li>Gateway validates input and sends STK push to Safaricom.</li>
            <li>Gateway stores a <code>pending</code> record in Supabase with <code>checkout_request_id</code>.</li>
            <li>Safaricom posts payment result to <code>/api/callback</code>.</li>
            <li>Gateway updates transaction as <code>completed</code> or <code>failed</code>.</li>
            <li>Your system polls <code>/api/status</code> using <code>checkout_request_id</code>.</li>
          </ol>
        </section>

        <section id="stk" className="panel">
          <h2>Initiate STK Push</h2>
          <p><code>POST /api/stk</code></p>

          <h3>Request Parameters</h3>
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Type</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>phone</code></td><td>string</td><td>Yes</td><td>Accepts <code>07...</code>, <code>7...</code>, <code>2547...</code>, <code>+2547...</code>. Stored as <code>254...</code>.</td></tr>
              <tr><td><code>amount</code></td><td>number</td><td>Yes</td><td>Must be greater than zero. Sent as rounded integer to Safaricom.</td></tr>
              <tr><td><code>reference</code></td><td>string</td><td>No</td><td>If omitted, gateway generates <code>PAY_{Date.now()}</code>.</td></tr>
              <tr><td><code>till_number</code></td><td>string</td><td>Till mode</td><td>Required when <code>MPESA_PAYMENT_MODE=till</code>.</td></tr>
              <tr><td><code>agent_id</code></td><td>string</td><td>No</td><td>Optional business identifier, stored in payments record.</td></tr>
            </tbody>
          </table>

          <h3>Example Request</h3>
          <pre><code>{initiateRequest}</code></pre>

          <h3>Success Response</h3>
          <pre><code>{initiateSuccess}</code></pre>
        </section>

        <section id="status" className="panel">
          <h2>Check Transaction Status</h2>
          <p><code>GET /api/status?checkout_request_id=ws_CO_XXXXXXXX</code></p>
          <p>
            Poll this endpoint every 2 to 5 seconds until status changes from <code>pending</code> to
            <code> completed</code> or <code>failed</code>.
          </p>

          <h3>Success Response</h3>
          <pre><code>{statusSuccess}</code></pre>
        </section>

        <section id="callback" className="panel">
          <h2>Safaricom Callback</h2>
          <p><code>POST /api/callback</code></p>
          <p>
            Safaricom sends callback data here once customer accepts or declines payment. The
            gateway always responds with HTTP 200 and <code>{`{ "ResultCode": 0, "ResultDesc": "Accepted" }`}</code>.
          </p>

          <h3>Callback Payload Example</h3>
          <pre><code>{callbackExample}</code></pre>
        </section>

        <section id="errors" className="panel">
          <h2>Error Handling</h2>
          <table>
            <thead>
              <tr>
                <th>HTTP Code</th>
                <th>When It Happens</th>
                <th>Typical Fix</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>400</td><td>Missing phone, invalid amount, invalid phone format, missing checkout_request_id.</td><td>Validate user input before request.</td></tr>
              <tr><td>500</td><td>Missing env vars or unexpected server error.</td><td>Check deployment env and server logs.</td></tr>
              <tr><td>502</td><td>Safaricom rejected STK request.</td><td>Check shortcode/passkey/token and request payload.</td></tr>
              <tr><td>404</td><td>Status lookup not found in database.</td><td>Confirm checkout_request_id and callback completion.</td></tr>
            </tbody>
          </table>

          <div className="alert">
            The current API endpoints do not enforce merchant API keys. If exposing this gateway publicly,
            add request authentication and rate limiting before production rollout.
          </div>
        </section>

        <section id="examples" className="panel">
          <h2>Code Examples</h2>

          <h3>cURL: Initiate STK</h3>
          <pre><code>{curlExample}</code></pre>

          <h3>JavaScript: Initiate + Poll Status</h3>
          <pre><code>{jsExample}</code></pre>
        </section>

        <section id="database" className="panel">
          <h2>Suggested Payments Table Schema</h2>
          <p>
            This schema matches fields currently written/updated by the API handlers.
          </p>
          <pre><code>{supabaseSql}</code></pre>
        </section>

        <p className="footer">Last updated: March 19, 2026.</p>
      </main>
    </div>
  );
}
