import { useRef, type KeyboardEvent } from 'react';

/**
 * Renders a grouped two-factor-style transfer code input.
 * @param props Current code and change callback.
 * @returns Code input element.
 */
export function CodeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const characters = Array.from({ length: 10 }, (_, index) => value[index] ?? '');

  /**
   * Updates one code slot and focuses the next slot.
   * @param index Slot index.
   * @param character Entered character.
   * @returns Nothing.
   */
  function updateSlot(index: number, character: string): void {
    const normalized = character.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const next = characters.map((item, slot) => slot === index ? normalized : item).join('');
    onChange(next);
    if (normalized && index < 9) inputRefs.current[index + 1]?.focus();
  }

  /**
   * Moves focus backward when backspace is pressed on an empty slot.
   * @param index Slot index.
   * @param event Keyboard event.
   * @returns Nothing.
   */
  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Backspace' && !characters[index] && index > 0) inputRefs.current[index - 1]?.focus();
  }

  return <div className="code-input" aria-label="Transfer code">{characters.map((character, index) => <span className="code-slot-wrap" key={index}><input ref={(element) => { inputRefs.current[index] = element; }} value={character} maxLength={1} inputMode="text" onChange={(event) => updateSlot(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)} aria-label={`Code character ${index + 1}`} />{index === 1 || index === 3 || index === 5 || index === 7 ? <b>-</b> : null}</span>)}</div>;
}
