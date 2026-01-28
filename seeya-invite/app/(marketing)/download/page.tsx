import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import { Apple, Smartphone, Globe, CheckCircle } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Download - Seeya',
  description:
    'Download Seeya for iOS, Android, or use the web app to start planning your trips.',
};

const platforms = [
  {
    name: 'iOS',
    icon: Apple,
    description: 'Download on the App Store',
    href: process.env.NEXT_PUBLIC_APP_STORE_URL || '#',
    available: true,
  },
  {
    name: 'Android',
    icon: Smartphone,
    description: 'Get it on Google Play',
    href: '#',
    available: false,
    comingSoon: true,
  },
  {
    name: 'Web',
    icon: Globe,
    description: 'Use in your browser',
    href: '/signup',
    available: true,
  },
];

const features = [
  'Sync across all devices',
  'Offline access to itineraries',
  'Real-time collaboration',
  'Push notifications',
];

export default function DownloadPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-seeya-purple to-purple-700">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-display font-semibold mb-6">
            Get Seeya
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Download the app or use the web version to start planning your next
            adventure.
          </p>
        </div>
      </section>

      {/* Download Options */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {platforms.map((platform) => (
              <Card
                key={platform.name}
                variant="outline"
                padding="lg"
                className={`text-center ${!platform.available && 'opacity-60'}`}
              >
                <div className="w-16 h-16 rounded-2xl bg-seeya-text flex items-center justify-center mx-auto mb-4">
                  <platform.icon className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-seeya-text mb-2">
                  {platform.name}
                </h3>
                <p className="text-seeya-text-secondary mb-6">
                  {platform.description}
                </p>
                {platform.available ? (
                  <a href={platform.href}>
                    <Button variant="primary" className="w-full">
                      {platform.name === 'Web' ? 'Open Web App' : 'Download'}
                    </Button>
                  </a>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Coming Soon
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-seeya-bg">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-semibold text-seeya-text mb-4">
              Available everywhere you are
            </h2>
            <p className="text-lg text-seeya-text-secondary">
              Your trips stay in sync no matter which device you use.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-lg mx-auto">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 p-4 bg-white rounded-xl"
              >
                <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
                <span className="text-seeya-text">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-display font-semibold text-seeya-text mb-4">
            Don&apos;t have a trip yet?
          </h2>
          <p className="text-lg text-seeya-text-secondary mb-8">
            Create your free account and start planning your next adventure.
          </p>
          <Link href="/signup">
            <Button variant="purple" size="lg">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
