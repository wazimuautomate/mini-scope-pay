import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: 600 }}>
        <h1 style={{ marginBottom: 12 }}>M-Pesa STK Gateway</h1>
        <p style={{ marginBottom: 16, color: '#5b6577' }}>
          Integration docs are available at the link below.
        </p>
        <Link href="/docs">Open Documentation</Link>
      </div>
    </main>
  );
}
