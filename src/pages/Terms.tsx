import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
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
          Terms of Service
        </h1>
        <p className="text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using roamwyth ("the Service"), you agree to be bound by these Terms of Service ("Terms"). 
              If you do not agree to these Terms, please do not use the Service. We reserve the right to modify these 
              Terms at any time, and such modifications will be effective immediately upon posting.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              2. Description of Service
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              roamwyth is a private travel coordination platform that allows users to share their travel plans with 
              friends and coordinate trips together. The Service includes features for creating trips, managing 
              friendships, sharing calendars, and communicating with other users.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              3. User Accounts
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To use certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your password secure and confidential</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              4. User Conduct
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the rights of others</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Upload or transmit viruses or malicious code</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Use the Service for any commercial purpose without our consent</li>
              <li>Create fake accounts or impersonate others</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              5. Privacy and Data Protection
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Your privacy is important to us. Our collection and use of personal information is governed by our{' '}
              <Link to="/privacy" className="text-foreground underline hover:text-foreground/70">Privacy Policy</Link>, 
              which is incorporated into these Terms by reference. By using the Service, you consent to the 
              collection and use of your information as described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              6. Intellectual Property
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are owned by roamwyth and are 
              protected by international copyright, trademark, patent, trade secret, and other intellectual 
              property laws. You retain ownership of any content you submit to the Service, but grant us a 
              license to use, display, and distribute such content as necessary to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              7. Third-Party Services
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service may contain links to or integrations with third-party websites or services, including 
              authentication providers like Google and Facebook. We are not responsible for the content, privacy 
              policies, or practices of any third-party services. Your use of such services is at your own risk.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              8. Termination
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without prior notice 
              or liability, for any reason, including breach of these Terms. Upon termination, your right to use 
              the Service will immediately cease. You may also delete your account at any time through your 
              account settings.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              9. Disclaimer of Warranties
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
              OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
              PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, 
              SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              10. Limitation of Liability
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              IN NO EVENT SHALL ROAMWYTH, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES 
              BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING 
              LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO 
              OR USE OF (OR INABILITY TO ACCESS OR USE) THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              11. Governing Law
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], 
              without regard to its conflict of law provisions. Any disputes arising from these Terms or the 
              Service shall be resolved in the courts of [Your Jurisdiction].
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              12. Contact Us
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: legal@roamwyth.app<br />
              [Your Company Address]
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
