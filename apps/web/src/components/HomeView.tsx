import { ArrowDownToLine, ArrowUpFromLine, Check, ShieldCheck, X } from 'lucide-react';
import { ActionCard } from './ActionCard';
import type { PendingAction } from '../types';

/**
 * Renders the home transfer actions.
 * @param props Action callbacks.
 * @returns Home content.
 */
export function HomeView({ onSend, onReceive, pendingAction, clientReady, clientLoading }: { onSend: () => void; onReceive: () => void; pendingAction: PendingAction; clientReady: boolean; clientLoading: boolean }) {
  const disabled = !clientReady || clientLoading || pendingAction !== null;
  return <><section className="hero"><div className="hero-brand"><div className="brand-mark"><ShieldCheck size={22} /></div><strong>Transfer<span className="pink">Master</span></strong></div><p>Fast transfers between your devices. Nothing is stored on our servers.</p></section><section className="action-grid"><ActionCard icon={<ArrowUpFromLine />} title="Send a file" text="Share a file from this device" primary disabled={disabled} loading={clientLoading || pendingAction === 'send'} onClick={onSend} /><ActionCard icon={<ArrowDownToLine />} title="Receive a file" text="Connect with a sender" disabled={disabled} loading={clientLoading || pendingAction === 'receive'} onClick={onReceive} /></section><div className="trust"><span><ShieldCheck size={16} /> Securely relayed</span><span><X size={15} /> No file storage</span><span><Check size={16} /> One-time code</span></div></>;
}
