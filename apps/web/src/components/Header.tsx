import { CircleHelp, Heart, Settings } from 'lucide-react';

/**
 * Renders the application header.
 * @param props Header callbacks.
 * @returns Header element.
 */
export function Header({ onHelp, onSettings }: { onHelp: () => void; onSettings: () => void }) {
  return <header><div className="header-left"><button className="sponsor" onClick={() => window.open('https://github.com/sponsors/Ezzud', '_blank')}><Heart size={16} /> Sponsor</button></div><nav><button className="icon-btn" onClick={onHelp} aria-label="How it works"><CircleHelp size={19} /></button><button className="icon-btn" onClick={onSettings} aria-label="Settings"><Settings size={19} /></button></nav></header>;
}
