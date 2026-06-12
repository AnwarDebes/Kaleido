import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Kaleido",
  description: "Kaleido privacy policy. How we collect, use, and protect your data.",
};

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-sm text-muted mb-8">Last updated: April 6, 2026</p>

      <div className="space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">1. Information We Collect</h2>
          <p>We collect information you provide directly: name, email address, and social media account connections. When you use our AI features, we process the prompts and content you provide to generate results. We also collect usage data such as pages visited, features used, and interaction patterns to improve our service.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
          <p>We use your information to provide and improve Kaleido services, including AI content generation, social media scheduling, and analytics. We use your social media tokens solely to publish content and retrieve analytics on your behalf. We do not sell your personal data to third parties.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">3. Data Security</h2>
          <p>We employ industry-standard security measures including AES-256 encryption for sensitive data such as social media access tokens, secure password hashing with Argon2, and HTTPS for all communications. Access tokens are encrypted at rest and decrypted only when needed for authorized operations.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">4. Social Media Data</h2>
          <p>When you connect social media accounts, we store encrypted OAuth tokens to act on your behalf. We access only the permissions you explicitly grant. You can disconnect any account at any time, which immediately revokes our access and deletes stored tokens.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">5. AI Processing</h2>
          <p>Content you submit for AI generation is processed on our secure infrastructure using open-source AI models. We do not use your content to train AI models. Generated content is stored in your account and accessible only to you.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">6. Data Retention</h2>
          <p>We retain your data for as long as your account is active. Upon account deletion, we remove all personal data, generated content, and social media tokens within 30 days. Anonymized usage analytics may be retained for service improvement.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">7. Your Rights</h2>
          <p>You have the right to access, correct, export, or delete your personal data at any time through your account settings or by contacting us. For users in the EEA, you have additional rights under GDPR including the right to data portability and the right to object to processing.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">8. Cookies</h2>
          <p>We use essential cookies for authentication and session management. We use analytics cookies only with your consent to understand how you use our service and to improve the experience.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">9. Contact</h2>
          <p>For privacy-related inquiries, contact us at privacy@kaleido.social.</p>
        </section>
      </div>
    </div>
  );
}
