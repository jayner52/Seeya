import { Card } from '@/components/ui';
import { Heart, Target, Users, Globe } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About - Seeya',
  description:
    'Learn about Seeya and our mission to make collaborative trip planning effortless.',
};

const values = [
  {
    icon: Heart,
    title: 'Travel Together',
    description:
      "We believe the best trips are shared experiences. Seeya makes it easy to plan and travel with the people you love.",
  },
  {
    icon: Target,
    title: 'Simplicity First',
    description:
      "Trip planning shouldn't be stressful. We focus on creating intuitive tools that get out of your way.",
  },
  {
    icon: Users,
    title: 'Built for Groups',
    description:
      "From couples to large friend groups, Seeya is designed to handle the complexity of group travel.",
  },
  {
    icon: Globe,
    title: 'Global Adventures',
    description:
      "Whether it's a weekend getaway or a month-long adventure, Seeya scales to fit your travel style.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-seeya-bg to-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-seeya-text mb-6">
            Making travel planning{' '}
            <span className="text-seeya-purple">a joy</span>
          </h1>
          <p className="text-lg text-seeya-text-secondary max-w-2xl mx-auto">
            Seeya was born from a simple idea: planning trips with friends
            should be as fun as the trip itself.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-display font-semibold text-seeya-text mb-6">
              Our Story
            </h2>
            <div className="space-y-4 text-seeya-text-secondary">
              <p>
                We&apos;ve all been there - endless group chats, scattered
                spreadsheets, and that one friend who still hasn&apos;t
                confirmed their flight. Planning trips with friends and family
                can quickly become overwhelming.
              </p>
              <p>
                Seeya was created to solve this problem. We built an app that
                brings everyone together in one place, making it easy to
                collaborate on plans, stay organized, and focus on what really
                matters - creating memories together.
              </p>
              <p>
                Whether you&apos;re planning a weekend getaway with your partner
                or coordinating a multi-city adventure with a dozen friends,
                Seeya adapts to your needs and keeps everyone on the same page.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-seeya-bg">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-display font-semibold text-seeya-text text-center mb-12">
            What we believe in
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value) => (
              <Card key={value.title} variant="elevated" padding="lg">
                <div className="w-12 h-12 rounded-xl bg-seeya-purple/10 flex items-center justify-center mb-4">
                  <value.icon className="text-seeya-purple" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-seeya-text mb-2">
                  {value.title}
                </h3>
                <p className="text-seeya-text-secondary">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-display font-semibold text-seeya-text mb-4">
            Get in touch
          </h2>
          <p className="text-lg text-seeya-text-secondary mb-8">
            Have questions, feedback, or just want to say hi? We&apos;d love to
            hear from you.
          </p>
          <a
            href="mailto:hello@seeya.app"
            className="inline-flex items-center justify-center px-8 py-4 bg-seeya-purple text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Contact Us
          </a>
        </div>
      </section>
    </>
  );
}
