import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Kaleido",
  description: "Kaleido terms of service. Rules and guidelines for using our platform.",
};

export default function TermsOfService() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-sm text-muted mb-8">Last updated: April 6, 2026</p>

      <div className="space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
          <p>By accessing or using Kaleido, you agree to be bound by these Terms of Service. If you do not agree, you may not use the service. These terms apply to all users.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">2. Service Description</h2>
          <p>Kaleido is an AI social media platform that provides content generation, image and video creation, scheduling, analytics, and tools to share your content on social platforms. Every feature is available to every user.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">3. Account Responsibilities</h2>
          <p>You are responsible for maintaining the security of your account credentials. You must not share your account with others or use the service for unauthorized purposes. You are responsible for all activity that occurs under your account.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">4. Content Ownership</h2>
          <p>You retain ownership of all content you create using Kaleido, including AI-generated content. By using our service, you grant us a limited license to process and store your content solely for the purpose of providing our services. We do not claim ownership of your content.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">5. Acceptable Use</h2>
          <p>You may not use Kaleido to generate or distribute content that is illegal, harmful, harassing, defamatory, or that violates the terms of connected social media platforms. You must comply with all applicable laws and platform-specific policies when publishing content.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">6. AI-Generated Content</h2>
          <p>AI-generated content is provided as-is and may require review before publishing. You are solely responsible for reviewing and approving all content before it is published to your social media accounts. Kaleido is not liable for the accuracy or appropriateness of AI-generated content.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">7. Free Service</h2>
          <p>Kaleido is provided free of charge. There are no subscriptions, no billing, and no paid plans. We will never ask you for payment details to use the service.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">8. Service Availability</h2>
          <p>We strive to maintain high availability but do not guarantee uninterrupted service. We may perform maintenance with reasonable notice. Third-party platform outages or API changes may temporarily affect certain features.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
          <p>Kaleido is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service, including but not limited to loss of data, lost profits, or damage to social media accounts.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">10. Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms. Upon termination, your data will be retained for 30 days to allow export, after which it will be permanently deleted.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">11. Changes to Terms</h2>
          <p>We may update these terms from time to time. Material changes will be communicated via email or in-app notification at least 30 days before taking effect. Continued use after changes constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">12. Contact</h2>
          <p>For questions about these terms, contact us at legal@kaleido.social.</p>
        </section>
      </div>
    </div>
  );
}
