import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'RecipeAssist',
  description: 'Your family recipe collection powered by AI',
  icons: {
    icon: '/icon1.svg',
    shortcut: '/icon1.svg',
    apple: '/icon1.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
