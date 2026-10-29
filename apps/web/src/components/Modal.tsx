import { useEffect } from "react";
import {
  CircleCheck,
  FileKey,
  Link,
  Moon,
  ShieldCheck,
  Sun,
  Upload,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ModalType, SpeedUnit } from "../types";
import { getPlatformLabel } from "../services/platformService";
import { openExternalLink } from "../services/externalLinkService";
import type { AvailableRelease } from "../services/releaseService";

/**
 * Renders an informational or settings overlay.
 * @param props Overlay state and callbacks.
 * @returns Overlay element.
 */
export function Modal({
  type,
  dark,
  setDark,
  maxSpeed,
  setMaxSpeed,
  e2eEnabled,
  setE2eEnabled,
  speedUnit,
  setSpeedUnit,
  availableRelease,
  onClose,
}: {
  type: ModalType;
  dark: boolean;
  setDark: (value: boolean) => void;
  maxSpeed: number;
  setMaxSpeed: (value: number) => void;
  e2eEnabled: boolean;
  setE2eEnabled: (value: boolean) => void;
  speedUnit: SpeedUnit;
  setSpeedUnit: (value: SpeedUnit) => void;
  availableRelease: AvailableRelease | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <button className="close" onClick={onClose}>
          <X />
        </button>
        {type === "help" ? (
          <>
            <h2>How it works</h2>
            <div className="help-steps">
              <HelpStep
                icon={<FileKey />}
                title="Create a code"
                text="The sender creates a temporary six-pair code."
              />
              <HelpStep
                icon={<Link />}
                title="Connect devices"
                text="The receiver enters the code to join the same relay."
              />
              <HelpStep
                icon={<Upload />}
                title="Confirm the file"
                text="The receiver reviews the file name and size before accepting."
              />
              <HelpStep
                icon={<ShieldCheck />}
                title="Transfer securely"
                text="The file is relayed in encrypted WebSocket chunks and is never stored on the server."
              />
              <HelpStep
                icon={<CircleCheck />}
                title="Download complete"
                text="The receiver downloads the file automatically when every chunk arrives."
              />
            </div>
          </>
        ) : (
          <>
            <h2>Settings</h2>
            <div className="setting-group">
              <label className="setting-row">
                <span className="setting-label">
                  {dark ? <Moon size={18} /> : <Sun size={18} />} Theme mode
                </span>
                <button
                  className={`switch ${dark ? "active" : ""}`}
                  onClick={() => setDark(!dark)}
                  aria-label="Toggle theme"
                >
                  <span />
                </button>
              </label>
              <div className="setting-row speed-row">
                <label htmlFor="max-speed">Max speed</label>
                <div className="speed-controls">
                  <input
                    id="max-speed"
                    type="number"
                    min="0"
                    value={maxSpeed}
                    onChange={(event) => {
                      const value = Math.max(0, Number(event.target.value));
                      setMaxSpeed(value);
                      localStorage.setItem(
                        "max_speed",
                        JSON.stringify({ value, unit: speedUnit }),
                      );
                    }}
                  />
                  <select
                    value={speedUnit}
                    onChange={(event) => {
                      const value = event.target.value as SpeedUnit;
                      setSpeedUnit(value);
                      localStorage.setItem(
                        "max_speed",
                        JSON.stringify({ value: maxSpeed, unit: value }),
                      );
                    }}
                  >
                    <option>KB/s</option>
                    <option>MB/s</option>
                    <option>GB/s</option>
                  </select>
                </div>
                <label className="setting-row">
                  <span className="setting-label">
                    <ShieldCheck size={18} /> End-to-end encryption
                  </span>
                  <button
                    className={`switch ${e2eEnabled ? "active" : ""}`}
                    onClick={() => {
                      const value = !e2eEnabled;
                      setE2eEnabled(value);
                      localStorage.setItem("e2e_enabled", JSON.stringify(value));
                    }}
                    aria-label="Toggle end-to-end encryption"
                  >
                    <span />
                  </button>
                </label>
              </div>
              <div className="release-info">
                {availableRelease && (
                  <div className="release-warning" role="status">
                    <strong>
                      New version available: v{availableRelease.version}
                    </strong>
                    <button
                      type="button"
                      onClick={() =>
                        void openExternalLink(availableRelease.downloadUrl)
                      }
                    >
                      Download latest version
                    </button>
                  </div>
                )}
                <div className="app-version">
                  <p>
                    HoloTransfer v{import.meta.env.VITE_APP_VERSION ?? "unknown"} for{" "}
                    {getPlatformLabel()}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Renders one illustrated help step.
 * @param props Step icon and copy.
 * @returns Help step element.
 */
function HelpStep({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="help-step">
      <div className="help-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}
