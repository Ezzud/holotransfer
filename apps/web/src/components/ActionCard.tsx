import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

/**
 * Renders one home action card.
 * @param props Card data and action.
 * @returns Action card.
 */
export function ActionCard({ icon, title, text, primary, loading, disabled, onClick }: { icon: ReactNode; title: string; text: string; primary?: boolean; loading?: boolean; disabled?: boolean; onClick: () => void }) {
  return <button className={`action-card${primary ? ' primary' : ''}${loading ? ' loading' : ''}`} disabled={disabled} onClick={onClick}>{loading ? <LoaderCircle className="action-loader spin" size={24} /> : <><div className="action-icon">{icon}</div><div><h2>{title}</h2><p>{text}</p></div><span className="arrow">→</span></>}</button>;
}
