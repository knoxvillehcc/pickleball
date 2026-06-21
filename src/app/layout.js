import './globals.css';
import ClientLayout from '@/components/ClientLayout';

export const metadata = {
  title: 'HCC Agent | Admin Portal',
  description: 'Knoxville Hindu Community Center — Admin Portal',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}