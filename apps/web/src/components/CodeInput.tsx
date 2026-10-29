import { Fragment, useRef, type ClipboardEvent, type KeyboardEvent } from "react";

/**
 * Renders a grouped two-factor-style transfer code input.
 * @param props Current code and change callback.
 * @returns Code input element.
 */
export function CodeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const characters = Array.from(
    { length: 10 },
    (_, index) => value[index] ?? "",
  );

  /**
   * Updates one code slot and focuses the next slot.
   * @param index Slot index.
   * @param character Entered character.
   * @returns Nothing.
   */
  function updateSlot(index: number, character: string): void {
    const normalized = character
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(-1);
    const next = characters
      .map((item, slot) => (slot === index ? normalized : item))
      .join("");
    onChange(next);
    if (normalized && index < 9) inputRefs.current[index + 1]?.focus();
  }

  /**
   * Fills all slots from a pasted code with optional separators.
   * @param event Clipboard paste event.
   * @returns Nothing.
   */
  function handlePaste(event: ClipboardEvent<HTMLInputElement>): void {
    const pasted = event.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10);
    if (pasted.length === 0) return;
    event.preventDefault();
    onChange(pasted);
    inputRefs.current[Math.min(pasted.length, 10) - 1]?.focus();
  }

  /**
   * Moves focus backward when backspace is pressed on an empty slot.
   * @param index Slot index.
   * @param event Keyboard event.
   * @returns Nothing.
   */
  function handleKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ): void {
    if (event.key === "Backspace" && !characters[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  }

  return (
    <div className="code-input" aria-label="Transfer code">
      {Array.from({ length: 5 }, (_, groupIndex) => (
        <Fragment key={groupIndex}>
          <span className="code-slot-wrap">
            {[0, 1].map((offset) => {
              const index = groupIndex * 2 + offset;
              return (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  type="text"
                  value={characters[index]}
                  maxLength={1}
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(event) => updateSlot(index, event.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  aria-label={`Code character ${index + 1}`}
                />
              );
            })}
          </span>
          {groupIndex < 4 ? <b>-</b> : null}
        </Fragment>
      ))}
    </div>
  );
}
