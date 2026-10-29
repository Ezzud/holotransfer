import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  CircleHelp,
  ShieldCheck,
  X,
} from "lucide-react";
import { ActionCard } from "./ActionCard";
import type { PendingAction } from "../types";

/**
 * Renders the home transfer actions.
 * @param props Action callbacks.
 * @returns Home content.
 */
export function HomeView({
  onSend,
  onReceive,
  pendingAction,
  clientReady,
  clientLoading,
  onHelp,
}: {
  onSend: () => void;
  onReceive: () => void;
  onHelp: () => void;
  pendingAction: PendingAction;
  clientReady: boolean;
  clientLoading: boolean;
}) {
  const disabled = !clientReady || clientLoading || pendingAction !== null;
  return (
    <>
      <section className="hero">
        <div className="hero-brand">
          <div className="brand-mark">
            <ShieldCheck size={22} />
          </div>
          <strong>
            Holo<span className="purple">Transfer</span>
          </strong>
        </div>
        <p>
          Fast transfers between your devices. Nothing is stored on our servers.
        </p>
      </section>
      <section className="action-grid">
        <ActionCard
          icon={<ArrowUpFromLine />}
          title="Send a file"
          text="Share a file from this device"
          primary
          disabled={disabled}
          loading={clientLoading || pendingAction === "send"}
          onClick={onSend}
        />
        <ActionCard
          icon={<ArrowDownToLine />}
          title="Receive a file"
          text="Connect with a sender"
          disabled={disabled}
          loading={clientLoading || pendingAction === "receive"}
          onClick={onReceive}
        />
      </section>
      <button className="home-help-button" onClick={onHelp}>
        <CircleHelp size={17} /> How does it work?
      </button>
      <div className="trust">
        <span>
          <ShieldCheck size={16} /> End-to-end encryption
        </span>
        <span>
          <X size={15} /> No file storage
        </span>
        <span>
          <Check size={16} /> One-time code
        </span>
      </div>
    </>
  );
}
