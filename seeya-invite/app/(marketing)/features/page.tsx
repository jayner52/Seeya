import { Card } from '@/components/ui';
import {
  Users,
  Calendar,
  MapPin,
  Share2,
  Plane,
  Hotel,
  Utensils,
  Ticket,
  Bell,
  Globe,
  Smartphone,
  Shield,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features - Seeya',
  description:
    'Discover all the features that make Seeya the best collaborative trip planning app.',
};

const mainFeatures = [
  {
    icon: Users,
    title: 'Collaborative Planning',
    description:
      'Invite friends and family to plan together. Everyone can add suggestions, vote on ideas, and contribute to the itinerary.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Calendar,
    title: 'Smart Itinerary',
    description:
      'Automatically organize your plans by date and location. See your entire trip at a glance with our intuitive calendar view.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: MapPin,
    title: 'Multi-Destination Trips',
    description:
      'Plan complex itineraries across multiple cities and countries. Seeya keeps everything organized by location.',
    color: 'from-orange-500 to-orange-600',
  },
  {
    icon: Share2,
    title: 'Easy Sharing',
    description:
      'Share your trip with anyone using a simple invite link. No account needed for guests to view the itinerary.',
    color: 'from-green-500 to-green-600',
  },
];

const tripBitTypes = [
  { icon: Plane, label: 'Flights', color: 'text-blue-500' },
  { icon: Hotel, label: 'Hotels', color: 'text-purple-500' },
  { icon: Utensils, label: 'Restaurants', color: 'text-orange-500' },
  { icon: Ticket, label: 'Activities', color: 'text-green-500' },
  { icon: MapPin, label: 'Transport', color: 'text-red-500' },
];

const additionalFeatures = [
  {
    icon: Bell,
    title: 'Smart Notifications',
    description:
      'Get notified when plans change or when you need to head to your next destination.',
  },
  {
    icon: Globe,
    title: 'Offline Access',
    description:
      'Access your full itinerary even without an internet connection.',
  },
  {
    icon: Smartphone,
    title: 'Cross-Platform',
    description:
      'Available on iOS, Android, and web. Your trips sync seamlessly across all devices.',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description:
      'Your travel data is encrypted and never shared with third parties.',
  },
];

export default function FeaturesPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-seeya-bg to-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-seeya-text mb-6">
            Features that make trip planning{' '}
            <span className="text-seeya-purple">effortless</span>
          </h1>
          <p className="text-lg text-seeya-text-secondary max-w-2xl mx-auto">
            Everything you need to plan, organize, and share your travels with
            the people who matter most.
          </p>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {mainFeatures.map((feature) => (
              <Card
                key={feature.title}
                variant="outline"
                padding="lg"
                className="hover:shadow-seeya-lg transition-shadow"
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5`}
                >
                  <feature.icon className="text-white" size={28} />
                </div>
                <h3 className="text-xl font-semibold text-seeya-text mb-3">
                  {feature.title}
                </h3>
                <p className="text-seeya-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TripBits Section */}
      <section className="py-20 bg-seeya-bg">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-semibold text-seeya-text mb-4">
              Organize everything in TripBits
            </h2>
            <p className="text-lg text-seeya-text-secondary max-w-2xl mx-auto">
              TripBits are the building blocks of your itinerary. Add flights,
              hotels, restaurants, activities, and more.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {tripBitTypes.map((type) => (
              <div
                key={type.label}
                className="flex items-center gap-3 px-6 py-4 bg-white rounded-xl shadow-seeya"
              >
                <type.icon className={type.color} size={24} />
                <span className="font-medium text-seeya-text">{type.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card variant="elevated" padding="md">
              <h4 className="font-semibold text-seeya-text mb-2">
                Store Details
              </h4>
              <p className="text-sm text-seeya-text-secondary">
                Save confirmation numbers, addresses, phone numbers, and notes
                for quick access.
              </p>
            </Card>
            <Card variant="elevated" padding="md">
              <h4 className="font-semibold text-seeya-text mb-2">
                Track Costs
              </h4>
              <p className="text-sm text-seeya-text-secondary">
                Keep track of expenses and see a running total for your trip
                budget.
              </p>
            </Card>
            <Card variant="elevated" padding="md">
              <h4 className="font-semibold text-seeya-text mb-2">
                Assign Travelers
              </h4>
              <p className="text-sm text-seeya-text-secondary">
                Mark which travelers are included in each activity or
                reservation.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-display font-semibold text-seeya-text text-center mb-12">
            And so much more
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalFeatures.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-seeya-purple/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="text-seeya-purple" size={24} />
                </div>
                <h3 className="font-semibold text-seeya-text mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-seeya-text-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
