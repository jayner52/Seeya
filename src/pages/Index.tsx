import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Map, Users, MapPin, CalendarCheck, Compass } from 'lucide-react';
import roamwythLogo from '@/assets/roamwyth-logo.png';

const features = [
  {
    icon: Users,
    title: "See Friends' Plans",
    description: 'Know when friends are traveling somewhere you love — or somewhere new.',
  },
  {
    icon: MapPin,
    title: 'Find Overlaps',
    description: 'Discover when your trips align. Same city, same week — why not meet up?',
  },
  {
    icon: CalendarCheck,
    title: 'Plan Together',
    description: 'Coordinate group trips without endless group chats or lost messages.',
  },
  {
    icon: Compass,
    title: 'Turn Trips into Reunions',
    description: 'A solo trip could become an adventure with old friends.',
  },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/40 to-background" />
        
        <div className="relative container mx-auto px-4 pt-16 pb-20 sm:pt-20 sm:pb-28 md:pt-32 md:pb-40">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            {/* Logo */}
            <div className="flex items-center justify-center mb-6 md:mb-8">
              <div className="h-[200px] sm:h-[280px] md:h-[384px] overflow-hidden">
                <img 
                  src={roamwythLogo} 
                  alt="roamwyth logo" 
                  className="h-[300px] sm:h-[420px] md:h-[576px] w-auto object-cover object-top"
                />
              </div>
            </div>

            <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance leading-tight tracking-tight">
              <span className="font-light">Travel is</span>{' '}
              <span className="font-extrabold">better</span>{' '}
              <span className="font-black">with friends.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed font-light">
              Never miss a chance to meet up. See where your friends are headed 
              and turn any trip into a reunion.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="text-base px-8 h-12 shadow-card">
                <Link to="/trips">Your Trips</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base px-8 h-12">
                <Link to="/friends">Add Friends</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-secondary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-muted/30 rounded-full blur-3xl" />
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              <span className="font-medium">Stay connected</span>{' '}
              <span className="font-extrabold">wherever you go</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto font-light">
              The best trips happen when friends come together.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="bg-card border-border/50 hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground mb-2 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed font-light">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-secondary/30">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto animate-fade-in">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              <span className="font-light">Where are your</span>{' '}
              <span className="font-extrabold">friends going?</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 font-light">
              Start sharing your travel plans and see who you could meet up with.
            </p>
            <Button asChild size="lg" className="text-base px-10 h-12 shadow-card">
              <Link to="/trips">Get Started</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Map className="w-5 h-5" />
              <span className="font-display font-bold tracking-tight">roamwyth</span>
            </div>
            <p className="text-sm text-muted-foreground font-light">
              Travel together, your way.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
