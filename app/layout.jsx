import './globals.css';

export const metadata = {
  title: 'EZ Mobile & EZ eSIM — UTM & Customer Journey Dashboard',
  description: 'Unified social UTM builder, shortener, customer funnel, and checkout voucher tracker.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
