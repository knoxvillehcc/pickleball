import './globals.css';
import ClientLayout from '@/components/ClientLayout';

export const metadata = {
  title: 'HCC Agent | Admin Portal',
  description: 'Knoxville Hindu Community Center — Admin Portal',
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F5F7' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0B' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var pref = localStorage.getItem('hcc-theme') || 'system';
                  var resolved = pref === 'system'
                    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : pref;
                  document.documentElement.setAttribute('data-theme', resolved);
                  document.documentElement.setAttribute('data-theme-pref', pref);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}