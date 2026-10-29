import { ArrowLeft, ShieldCheck, Scale } from "lucide-react";

/**
 * Renders a dedicated legal information page.
 * @param props Legal page type and navigation callback.
 * @returns Legal page element.
 */
export function LegalPage({
  type,
  onBack,
}: {
  type: "privacy" | "terms";
  onBack: () => void;
}) {
  const isPrivacy = type === "privacy";
  return (
    <main className="legal-page">
      <article className="legal-content">
        <button className="back legal-back" onClick={onBack}>
          <ArrowLeft size={17} /> Back to TransferMaster
        </button>
        <div className="legal-heading">
          <div className="brand-mark">
            {isPrivacy ? <ShieldCheck size={24} /> : <Scale size={24} />}
          </div>
          <div>
            <h1>{isPrivacy ? "Privacy policy" : "Terms of service"}</h1>
          </div>
        </div>
        <p className="legal-updated">Last updated: 29 October 2026</p>
        {isPrivacy ? <PrivacyContent /> : <TermsContent />}
      </article>
    </main>
  );
}

/**
 * Renders the privacy policy sections.
 * @returns Privacy policy content.
 */
function PrivacyContent() {
  return (
    <div className="legal-sections">
      <section>
        <h2>1. Scope</h2>
        <p>
          This Privacy Policy explains what TransferMaster processes when you
          visit the website or use a file transfer. TransferMaster is designed
          to relay a file between two connected devices without saving the file
          on the server.
        </p>
      </section>
      <section>
        <h2>2. Information we process</h2>
        <p>
          To create and validate a transfer, the service processes an
          automatically generated client identifier, a temporary transfer code,
          connection role, connection timestamps, and transfer status. The
          sender-provided filename, file size, and MIME type are used to show
          transfer details and record operational events.
        </p>
        <p>
          The client identifier is a random pseudonymous value. We do not use it
          to identify you personally, and we do not request your name, email
          address, address book, account, or contact list.
        </p>
      </section>
      <section>
        <h2>3. File contents</h2>
        <p>
          File bytes are relayed through the WebSocket server in memory.
          TransferMaster does not write file contents to disk at any point, does
          not store them in a database, and does not inspect, index, or use them
          for profiling. The server holds chunks only in process memory while
          they are being forwarded; that memory is released when the transfer
          ends or the connection closes.
        </p>
      </section>
      <section>
        <h2>4. Transfer logs and retention</h2>
        <p>
          Operational logs contain the sender and receiver pseudonymous client
          identifiers, sanitized filename, file size, transfer code, status, and
          creation and update timestamps. These records are used to troubleshoot
          the service, enforce transfer lifecycle rules, and identify stuck or
          expired transfers.
        </p>
        <p>
          Transfer codes expire after the configured inactivity period and
          unfinished transfer records are marked expired when the API starts.
          Logs are not intended to be a permanent file history. Server operators
          may retain ordinary application logs for a limited operational period
          according to the deployment configuration.
        </p>
      </section>
      <section>
        <h2>5. Browser storage</h2>
        <p>
          Your browser stores the pseudonymous client identifier, theme
          preference, and maximum-speed preference in local storage. These
          values remain on your device until you remove them or clear site data.
          The client identifier is sent to the API so the service can validate
          requests and enforce one active transfer per client.
        </p>
      </section>
      <section>
        <h2>6. Network and security</h2>
        <p>
          Connections use the configured website API and WebSocket endpoints.
          The server relays traffic so the other participant does not receive
          your IP address directly from a peer-to-peer connection. You should
          still use a trusted network and keep your browser updated. No internet
          service can guarantee absolute security, and you are responsible for
          choosing files that are appropriate to transfer.
        </p>
      </section>
      <section>
        <h2>7. Service providers and disclosure</h2>
        <p>
          TransferMaster does not sell personal information. Data may be
          accessible to the infrastructure provider operating the deployment, or
          disclosed when required by law, to protect the service, or to
          investigate abuse. File contents are not intentionally retained as
          part of these operations.
        </p>
      </section>
      <section>
        <h2>8. Your choices</h2>
        <p>
          You can stop a transfer, clear local storage, and avoid using the
          service. Clearing local storage creates a new client identifier the
          next time the site needs one. To request clarification about a
          deployment’s data handling, contact its operator through the channel
          published with that deployment.
        </p>
      </section>
      <section>
        <h2>9. Changes</h2>
        <p>
          This policy may be updated when the service or its data handling
          changes. The date at the top of this page identifies the current
          version.
        </p>
      </section>
    </div>
  );
}

/**
 * Renders the terms of service sections.
 * @returns Terms of service content.
 */
function TermsContent() {
  return (
    <div className="legal-sections">
      <section>
        <h2>1. Acceptance</h2>
        <p>
          By accessing or using TransferMaster, you agree to these Terms of
          Service. If you do not agree, do not use the service. “TransferMaster”
          means the website, API, relay, and related software made available by
          the operator.
        </p>
      </section>
      <section>
        <h2>2. Eligibility and authority</h2>
        <p>
          You may use the service only if you can legally agree to these terms
          and are permitted to share every file you submit. If you use
          TransferMaster for an organization, you confirm that you have
          authority to bind that organization.
        </p>
      </section>
      <section>
        <h2>3. Acceptable use</h2>
        <p>
          You must not use TransferMaster to transfer unlawful, fraudulent,
          infringing, abusive, malicious, or harmful material; violate another
          person’s privacy; distribute malware; probe or attack the service;
          bypass rate limits or access controls; interfere with another
          transfer; or attempt to identify or track another participant.
        </p>
      </section>
      <section>
        <h2>4. Your files and responsibility</h2>
        <p>
          You retain responsibility for your files, their legality, their
          security, and the recipient you choose. TransferMaster does not
          endorse, inspect, verify, or guarantee the accuracy, safety,
          availability, or ownership of transferred content. Do not send
          sensitive material unless you have assessed the risks and the
          recipient is trusted.
        </p>
      </section>
      <section>
        <h2>5. Transfer behavior</h2>
        <p>
          Transfers use temporary ten-character codes and are limited to one
          sender and one receiver. Codes may expire, connections may be refused,
          and transfers may fail because of network conditions, browser limits,
          service maintenance, inactivity, or abuse prevention. A transfer code
          should be treated as a secret: anyone who obtains it may attempt to
          join before the second device connects.
        </p>
      </section>
      <section>
        <h2>6. File handling and no storage</h2>
        <p>
          TransferMaster does not write file contents to server disk, database
          storage, or any other persistent server storage. File data exists
          temporarily in the sender’s browser, the receiver’s browser, network
          buffers, and server process memory while the transfer is active.
          TransferMaster does not provide backup, archival storage,
          synchronization, or recovery. Keep your own copy until the recipient
          confirms successful receipt.
        </p>
      </section>
      <section>
        <h2>7. Availability and changes</h2>
        <p>
          The service is provided on an “as available” basis. The operator may
          modify, suspend, limit, or discontinue the service, including
          individual transfers, without guaranteeing advance notice. The
          operator may also block activity that appears to violate these terms
          or threaten the service.
        </p>
      </section>
      <section>
        <h2>8. Disclaimer and limitation</h2>
        <p>
          To the maximum extent permitted by law, TransferMaster is provided
          without warranties of uninterrupted availability, fitness for a
          particular purpose, non-infringement, or complete security. The
          operator is not responsible for lost files, failed transfers,
          unauthorized access caused by a disclosed code, network interruptions,
          or indirect losses. Nothing in these terms limits liability where
          applicable law does not allow that limitation.
        </p>
      </section>
      <section>
        <h2>9. Indemnity</h2>
        <p>
          To the extent permitted by law, you agree to defend and hold the
          operator harmless from claims, damages, and costs arising from your
          misuse of the service, your files, your violation of these terms, or
          your violation of another person’s rights.
        </p>
      </section>
      <section>
        <h2>10. Changes and contact</h2>
        <p>
          These terms may change as the service evolves. Continued use after an
          update means you accept the revised terms. For questions or abuse
          reports, contact the operator through the contact channel published
          with the deployment.
        </p>
      </section>
    </div>
  );
}
