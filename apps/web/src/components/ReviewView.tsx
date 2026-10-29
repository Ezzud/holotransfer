import { Check, LoaderCircle } from "lucide-react";
import { Card } from "./Card";
import { FileSummary } from "./FileSummary";
import type { FileInfo } from "../types";

type ReviewViewProps = {
  file: FileInfo;
  decisionPending: boolean;
  onBack: () => void;
  onDecision: (accepted: boolean) => void;
};

/**
 * Renders the receiver confirmation view.
 * @param props File and decision callbacks.
 * @returns The review view.
 */
export function ReviewView({
  file,
  decisionPending,
  onBack,
  onDecision,
}: ReviewViewProps) {
  return (
    <Card
      onBack={onBack}
      title="Ready to receive?"
      subtitle="Someone wants to send this file to your device."
    >
      <FileSummary file={file} />
      <div className="button-row">
        <button
          className="button subtle"
          disabled={decisionPending}
          onClick={() => onDecision(false)}
        >
          {decisionPending ? <LoaderCircle className="spin" size={17} /> : null}{" "}
          Deny
        </button>
        <button
          className="button purple-button"
          disabled={decisionPending}
          onClick={() => onDecision(true)}
        >
          {decisionPending ? (
            <LoaderCircle className="spin" size={17} />
          ) : (
            <Check size={17} />
          )}{" "}
          Confirm
        </button>
      </div>
    </Card>
  );
}
