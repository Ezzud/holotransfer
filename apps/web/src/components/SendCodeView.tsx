import { Link2, LoaderCircle } from "lucide-react";
import { Card } from "./Card";
import { CodeInput } from "./CodeInput";
import { readableCode } from "../utils/format";
import type { PendingAction } from "../types";

type SendCodeViewProps = {
  code: string;
  joinCode: string;
  pendingAction: PendingAction;
  onBack: () => void;
  onJoinCodeChange: (value: string) => void;
  onConnect: () => void;
};

/**
 * Renders the sender code display or receiver code entry state.
 * @param props View state and callbacks.
 * @returns The transfer code view.
 */
export function SendCodeView({
  code,
  joinCode,
  pendingAction,
  onBack,
  onJoinCodeChange,
  onConnect,
}: SendCodeViewProps) {
  return (
    <Card
      onBack={onBack}
      title="Connect a device"
      subtitle={
        code
          ? "Waiting for another device to connect using the code"
          : "Enter the sender’s code to connect."
      }
    >
      {code && <div className="code">{readableCode(code)}</div>}
      {!code ? (
        <>
          <label>Transfer code</label>
          <CodeInput value={joinCode} onChange={onJoinCodeChange} />
          <button
            className="button purple-button"
            disabled={joinCode.length !== 10 || pendingAction !== null}
            onClick={onConnect}
          >
            {pendingAction === "receive" ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Link2 size={17} />
            )}{" "}
            Connect
          </button>
        </>
      ) : (
        <>
          <div className="waiting">
            <span className="pulse" /> Waiting for the other device…
          </div>
          <button className="text-button" onClick={onBack}>
            Cancel
          </button>
        </>
      )}
    </Card>
  );
}
