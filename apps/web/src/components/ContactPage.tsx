import { ArrowLeft, AtSign, MessageCircle, Twitter } from "lucide-react";

/**
 * Renders the contact page with the available support channels.
 * @param onBack Callback that returns to the home page.
 * @returns Contact page element.
 */
export function ContactPage({ onBack }: { onBack: () => void }) {
  return (
    <main className="legal-page">
      <article className="legal-content">
        <button className="back legal-back" onClick={onBack}>
          <ArrowLeft size={17} /> Back to HoloTransfer
        </button>
        <div className="legal-heading">
          <div className="brand-mark">
            <AtSign size={24} />
          </div>
          <div>
            <h1>Contact</h1>
          </div>
        </div>
        <p className="legal-updated">Get in touch with the HoloTransfer team.</p>
        <div className="contact-options">
          <a href="https://ezzud.fr/discord" target="_blank" rel="noreferrer">
            <MessageCircle size={21} />
            <span>Discord server</span>
          </a>
          <a href="mailto:contact@ezzud.fr">
            <AtSign size={21} />
            <span>contact@ezzud.fr</span>
          </a>
          <a href="https://x.com/ezzud_" target="_blank" rel="noreferrer">
            <Twitter size={21} />
            <span>X (Twitter)</span>
          </a>
        </div>
      </article>
    </main>
  );
}
