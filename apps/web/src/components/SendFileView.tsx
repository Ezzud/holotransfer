import { FileUp, LoaderCircle } from "lucide-react";
import type { RefObject } from "react";
import { Card } from "./Card";
import { DropZone } from "./DropZone";
import type { FileInfo } from "../types";

type SendFileViewProps = {
  role: "sender" | "receiver";
  file: FileInfo | null;
  inputRef: RefObject<HTMLInputElement | null>;
  encryptionReady: boolean;
  onBack: () => void;
  onSelect: (selectedFile?: File) => void;
  onUpload: () => void;
};

/**
 * Renders file selection for a sender or waiting status for a receiver.
 * @param props View state and callbacks.
 * @returns The file selection or waiting view.
 */
export function SendFileView({
  role,
  file,
  inputRef,
  encryptionReady,
  onBack,
  onSelect,
  onUpload,
}: SendFileViewProps) {
  if (role === "receiver") {
    return (
      <Card
        onBack={onBack}
        title="Waiting for the sender"
        subtitle="The sender can now select a file to send to this device."
      >
        <div className="waiting">
          <span className="pulse" /> Waiting for the sender to choose a file…
        </div>
        <button className="text-button" onClick={onBack}>
          Cancel
        </button>
      </Card>
    );
  }

  return (
    <Card
      onBack={onBack}
      title="Choose a file"
      subtitle="Your file stays on this device until you start the upload."
    >
      <DropZone inputRef={inputRef} onSelect={onSelect} file={file} />
      <button
        className="button purple-button"
        disabled={!file || !encryptionReady}
        onClick={onUpload}
      >
        {!encryptionReady ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <FileUp size={17} />
        )}{" "}
        Start uploading
      </button>
    </Card>
  );
}
