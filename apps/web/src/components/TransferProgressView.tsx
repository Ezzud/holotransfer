import { LoaderCircle } from "lucide-react";
import { Card } from "./Card";
import { FileSummary } from "./FileSummary";
import type { FileInfo, TransferRole } from "../types";

type TransferProgressViewProps = {
  file: FileInfo;
  role: TransferRole;
  progress: number;
  timeRemaining: string;
  transferSpeed: string;
  senderWaiting: boolean;
  writingFile: boolean;
  writeProgress: number;
  encryptionEnabled: boolean;
  onBack: () => void;
};

/**
 * Renders transfer progress and current transfer status.
 * @param props Transfer progress state.
 * @returns The transfer progress view.
 */
export function TransferProgressView({
  file,
  role,
  progress,
  timeRemaining,
  transferSpeed,
  senderWaiting,
  writingFile,
  writeProgress,
  encryptionEnabled,
  onBack,
}: TransferProgressViewProps) {
  return (
    <Card
      onBack={onBack}
      title="Transferring file"
      subtitle="Keep this tab open while the transfer is in progress."
    >
      <FileSummary file={file} />
      {!encryptionEnabled && (
        <div className="transfer-warning">
          This transfer is not protected by end-to-end encryption, the host of
          this website may be able to see this data. HoloTransfer is made so its
          not directly stored on the server but still be careful.
        </div>
      )}
      {senderWaiting && (
        <div className="waiting-confirmation">
          <LoaderCircle className="spin" size={18} /> Waiting for the receiver
          to confirm…
        </div>
      )}
      <div className="progress-percentage">
        {writingFile && role === "receiver"
          ? `Writing file...`
          : timeRemaining === "00:00:00"
          ? role === "sender"
            ? "Waiting for receiver"
            : "Writing file..."
          : timeRemaining}
      </div>
      <div className="progress">
        <div style={{ width: `${progress}%` }} />
      </div>
      {writingFile && role === "receiver" && (
        <div className="write-progress">
          <div style={{ width: `${writeProgress}%` }} />
        </div>
      )}
      <div className="progress-meta">
        <span>
          {timeRemaining === "00:00:00"
            ? role === "receiver" && writingFile
              ? `Writing file on your device (${writeProgress}%)`
              : role === "sender"
                ? "Receiver is writing file..."
                : "Downloading..."
            : `${progress}% complete`}
        </span>
        <span>{transferSpeed}</span>
      </div>
    </Card>
  );
}
