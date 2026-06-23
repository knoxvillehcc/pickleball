import './globals.css';
import ClientLayout from '@/components/ClientLayout';

export const metadata = {
  title: 'HCC Agent | Admin Portal',
  description: 'Knoxville Hindu Community Center — Admin Portal',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('hcc-theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', saved);
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