import { Logo } from '@/components/ui';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-seeya-purple via-purple-600 to-purple-800 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/">
          <Logo size="md" className="text-white [&_span]:text-white" />
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-white/60 text-sm">
          &copy; {new Date().getFullYear()} Seeya. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
