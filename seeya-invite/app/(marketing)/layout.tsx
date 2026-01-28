import { Header, Footer } from '@/components/marketing';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-[73px]">{children}</main>
      <Footer />
    </div>
  );
}
