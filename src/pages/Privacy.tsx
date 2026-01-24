import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/auth">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Button>
        </Link>

        <h1 className="font-display text-4xl font-semibold text-foreground mb-4">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              1. Introduction
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to roamwyth ("we," "our," or "us"). We are committed to protecting your personal information 
              and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard 
              your information when you use our travel coordination platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              2. Information We Collect
            </h2>
            
            <h3 className="font-display text-xl font-medium text-foreground mb-3 mt-6">
              2.1 Information You Provide
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Account Information:</strong> Name, email address, username, password, and profile photo</li>
              <li><strong>Profile Information:</strong> Bio, display name, and other profile details you choose to share</li>
              <li><strong>Trip Information:</strong> Destinations, travel dates, trip names, and visibility preferences</li>
              <li><strong>Social Connections:</strong> Travel pal requests, connections, and calendar sharing preferences</li>
              <li><strong>Communications:</strong> Messages and interactions with other users</li>
            </ul>

            <h3 className="font-display text-xl font-medium text-foreground mb-3 mt-6">
              2.2 Information from Third-Party Services
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              If you sign in using Google or Facebook, we may receive your name, email address, and profile picture 
              from these services, in accordance with your privacy settings on those platforms.
            </p>

            <h3 className="font-display text-xl font-medium text-foreground mb-3 mt-6">
              2.3 Automatically Collected Information
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, and time spent on the Service</li>
              <li><strong>Log Data:</strong> IP address, access times, and referring URLs</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide, maintain, and improve the Service</li>
              <li>Create and manage your account</li>
              <li>Enable trip planning and sharing features</li>
              <li>Facilitate connections between travel pals</li>
              <li>Send you service-related notifications</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              4. Information Sharing and Disclosure
            </h2>
            
            <h3 className="font-display text-xl font-medium text-foreground mb-3 mt-6">
              4.1 With Other Users
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Based on your visibility settings, your trip information may be shared with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-2">
              <li><strong>Only Me:</strong> Visible only to you</li>
              <li><strong>Busy Only:</strong> Travel Pals see you're unavailable, no details</li>
              <li><strong>Dates Only:</strong> Travel Pals see when you're traveling, no destination</li>
              <li><strong>Location Only:</strong> Travel Pals see where you're going, no dates</li>
              <li><strong>Full Details:</strong> Accepted trip participants see all information</li>
            </ul>

            <h3 className="font-display text-xl font-medium text-foreground mb-3 mt-6">
              4.2 With Service Providers
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              We may share your information with third-party vendors who perform services on our behalf, such as 
              hosting, analytics, and customer support. These providers are contractually obligated to protect 
              your information.
            </p>

            <h3 className="font-display text-xl font-medium text-foreground mb-3 mt-6">
              4.3 For Legal Reasons
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              We may disclose your information if required by law, or if we believe such action is necessary to 
              comply with legal obligations, protect our rights, or ensure the safety of users.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              5. Data Security
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information 
              against unauthorized access, alteration, disclosure, or destruction. However, no method of 
              transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              6. Data Retention
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide 
              you services. We will retain and use your information as necessary to comply with legal obligations, 
              resolve disputes, and enforce our agreements. You may request deletion of your account at any time.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              7. Your Rights and Choices
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Portability:</strong> Request your data in a portable format</li>
              <li><strong>Objection:</strong> Object to certain processing of your information</li>
              <li><strong>Withdrawal:</strong> Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, please contact us using the information below.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              8. Cookies and Tracking
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience and analyze usage. 
              Essential cookies are necessary for the Service to function. You can control cookies through 
              your browser settings, but disabling them may affect functionality.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              9. Children's Privacy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not intended for children under 13 years of age. We do not knowingly collect 
              personal information from children under 13. If we become aware that we have collected such 
              information, we will take steps to delete it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              10. International Data Transfers
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. We take 
              appropriate measures to ensure that your information receives an adequate level of protection 
              in the jurisdictions in which we process it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              11. Changes to This Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes 
              by posting the new policy on this page and updating the "Last updated" date. Your continued use 
              of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              12. Contact Us
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: privacy@roamwyth.app<br />
              [Your Company Address]
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
