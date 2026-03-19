import './globals.css';

export const metadata = {
  title: 'M-Pesa Gateway Docs',
  description: 'Integration guide for the M-Pesa STK gateway',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
