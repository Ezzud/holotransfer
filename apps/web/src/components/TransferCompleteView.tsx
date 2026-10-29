import { Check, Send } from "lucide-react";
import { Card } from "./Card";
import { formatSize } from "../utils/format";
import type { FileInfo, TransferRole } from "../types";

type TransferCompleteViewProps = {
  file: FileInfo;
  role: TransferRole;
  onBack: () => void;
  onSendAnother: () => void;
  onDone: () => void;
};

/**
 * Renders the completed transfer state.
 * @param props Completion state and callbacks.
 * @returns The completion view.
 */
export function TransferCompleteView({
  file,
  role,
  onBack,
  onSendAnother,
  onDone,
}: TransferCompleteViewProps) {
  return (
    <Card onBack={onBack} title="Transfer complete" subtitle="">
      <div className="success-panel">
        <div className="success">
          <div>
            <Check size={28} />
          </div>
          <strong>{file.name}</strong>
          <span>{formatSize(file.size)} transferred securely</span>
        </div>
        <div className="done-actions">
          {role === "sender" && (
            <button className="button purple-button" onClick={onSendAnother}>
              <Send size={17} /> Send another file
            </button>
          )}
          <button
            className="button completion-button"
            onClick={role === "receiver" ? onDone : onBack}
          >
            Done
          </button>
        </div>
      </div>
    </Card>
  );
}
