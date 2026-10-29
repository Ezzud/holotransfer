import { CircleHelp, Heart, Settings } from "lucide-react";
import { siGithub } from "simple-icons";

/**
 * Renders the GitHub brand mark.
 * @returns GitHub icon.
 */
function GithubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="currentColor"
    >
      <path d={siGithub.path} />
    </svg>
  );
}

/**
 * Renders the application header.
 * @param props Header callbacks.
 * @returns Header element.
 */
export function Header({
  onHelp,
  onSettings,
}: {
  onHelp: () => void;
  onSettings: () => void;
}) {
  return (
    <header>
      <div className="header-left">
        <button
          className="sponsor"
          onClick={() =>
            window.open("https://github.com/sponsors/Ezzud", "_blank")
          }
        >
          <Heart size={16} /> Support my Work
        </button>
      </div>
      <nav>
        <a
          className="icon-btn"
          href="https://github.com/Ezzud/holotransfer"
          target="_blank"
          rel="noreferrer"
          aria-label="HoloTransfer GitHub repository"
        >
          <GithubIcon />
        </a>
        <button className="icon-btn" onClick={onHelp} aria-label="How it works">
          <CircleHelp size={19} />
        </button>
        <button className="icon-btn" onClick={onSettings} aria-label="Settings">
          <Settings size={19} />
        </button>
      </nav>
    </header>
  );
}
