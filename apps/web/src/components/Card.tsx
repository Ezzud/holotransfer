import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Renders a standard content card.
 * @param props Card content.
 * @returns Card element.
 */
export function Card({ title, subtitle, onBack, children }: { title: string; subtitle: string; onBack: () => void; children: ReactNode }) { return <section className="card"><button className="back" onClick={onBack}><ChevronLeft /></button><h2>{title}</h2><p className="subtitle">{subtitle}</p>{children}</section>; }
