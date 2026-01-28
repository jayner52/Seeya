import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import {
  Plane,
  Users,
  Calendar,
  MapPin,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Share2,
  Clock,
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Plan Together',
    description:
      'Invite friends and family to collaborate on trip planning in real-time.',
  },
  {
    icon: Calendar,
    title: 'Organized Itineraries',
    description:
      'Keep all your flights, hotels, activities, and reservations in one place.',
  },
  {
    icon: MapPin,
    title: 'Multi-City Trips',
    description:
      'Plan complex itineraries across multiple destinations with ease.',
  },
  {
    icon: Share2,
    title: 'Easy Sharing',
    description:
      'Share your trip with anyone using a simple invite link.',
  },
];

const howItWorks = [
  {
    step: 1,
    title: 'Create a Trip',
    description: 'Start by creating a trip and adding your destinations.',
  },
  {
    step: 2,
    title: 'Add Your Plans',
    description: 'Add flights, hotels, restaurants, and activities to your itinerary.',
  },
  {
    step: 3,
    title: 'Invite Friends',
    description: 'Share with friends so everyone can contribute and stay informed.',
  },
  {
    step: 4,
    title: 'Travel Together',
    description: 'Everyone has access to the full itinerary, online or offline.',
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-seeya-bg via-white to-seeya-purple/5">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-seeya-purple/10 text-seeya-purple text-sm font-medium mb-6">
                <Sparkles size={16} />
                Plan trips with friends
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold text-seeya-text leading-tight mb-6">
                Travel planning,{' '}
                <span className="text-seeya-purple">together</span>
              </h1>
              <p className="text-lg text-seeya-text-secondary mb-8 max-w-lg">
                Seeya makes it easy to plan trips with friends and family.
                Create itineraries, share plans, and make memories together.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup">
                  <Button variant="purple" size="lg" rightIcon={<ArrowRight size={20} />}>
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/download">
                  <Button variant="outline" size="lg">
                    Download App
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero Illustration */}
            <div className="relative animate-fade-in">
              <div className="relative aspect-square max-w-md mx-auto">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-to-br from-seeya-purple/20 to-purple-300/20 rounded-3xl rotate-6" />
                <div className="absolute inset-0 bg-gradient-to-br from-seeya-purple/30 to-purple-400/30 rounded-3xl -rotate-3" />

                {/* Mock app card */}
                <Card variant="elevated" className="relative p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                      <Plane className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-seeya-text">
                        Summer in Europe
                      </h3>
                      <p className="text-sm text-seeya-text-secondary">
                        Jun 15 - Jul 5
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin size={16} className="text-seeya-purple" />
                      <span>Paris, Barcelona, Rome</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users size={16} className="text-seeya-purple" />
                      <span>4 travelers</span>
                    </div>
                  </div>

                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-seeya-purple to-purple-600 border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                      >
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-seeya-purple/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl translate-y-1/2 translate-x-1/2" />
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-semibold text-seeya-text mb-4">
              Everything you need to plan the perfect trip
            </h2>
            <p className="text-lg text-seeya-text-secondary max-w-2xl mx-auto">
              From collaborative planning to organized itineraries, Seeya has
              all the tools you need.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <Card
                key={feature.title}
                variant="outline"
                padding="lg"
                className="hover:shadow-seeya-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-seeya-purple/10 flex items-center justify-center mb-4">
                  <feature.icon className="text-seeya-purple" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-seeya-text mb-2">
                  {feature.title}
                </h3>
                <p className="text-seeya-text-secondary">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-seeya-bg">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-semibold text-seeya-text mb-4">
              How it works
            </h2>
            <p className="text-lg text-seeya-text-secondary max-w-2xl mx-auto">
              Planning your next adventure is simple with Seeya.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <div key={item.step} className="relative">
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gray-200" />
                )}
                <div className="relative text-center">
                  <div className="w-16 h-16 rounded-full bg-seeya-purple text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-seeya-text mb-2">
                    {item.title}
                  </h3>
                  <p className="text-seeya-text-secondary text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-seeya-purple to-purple-700">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-white mb-4">
            Ready to plan your next adventure?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
            Join thousands of travelers who use Seeya to plan unforgettable
            trips with friends and family.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button
                variant="primary"
                size="lg"
                className="bg-white text-seeya-purple hover:bg-gray-100"
              >
                Get Started Free
              </Button>
            </Link>
            <Link href="/download">
              <Button
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10"
              >
                Download the App
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
