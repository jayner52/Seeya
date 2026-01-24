import { ReactNode } from 'react';
import { Navigation } from './Navigation';
interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}
export function PageLayout({
  children,
  title,
  subtitle
}: PageLayoutProps) {
  return <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-16 pb-20 md:pt-32 md:pb-8">
        <div className="container mx-auto px-4 md:px-8">
          {(title || subtitle) && <header className="px-4 md:px-8 py-6 mb-6 animate-fade-in -mx-4 md:-mx-8">
              {title && <h1 className="font-display text-2xl font-bold text-foreground mb-1">
                  {title}
                </h1>}
              {subtitle && <p className="text-muted-foreground text-sm">
                  {subtitle}
                </p>}
            </header>}
          {children}
        </div>
      </main>
    </div>;
}