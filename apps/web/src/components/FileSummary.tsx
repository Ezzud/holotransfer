import { File } from "lucide-react";
import type { FileInfo } from "../types";
import { formatSize } from "./format";

/**
 * Renders file metadata.
 * @param props File metadata.
 * @returns File summary.
 */
export function FileSummary({ file }: { file: FileInfo }) {
  return (
    <div className="file-summary">
      <div className="file-icon">
        <File />
      </div>
      <div>
        <strong title={file.name}>{file.name}</strong>
        <span>
          {formatSize(file.size)} ·{" "}
          {file.type.split("/")[1]?.toUpperCase() ?? "FILE"}
        </span>
      </div>
    </div>
  );
}
