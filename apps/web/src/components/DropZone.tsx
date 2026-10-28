import type { RefObject } from 'react';
import { File, Upload } from 'lucide-react';
import type { FileInfo } from '../types';
import { formatSize } from './format';

/**
 * Renders a file picker drop zone.
 * @param props Input and selected file state.
 * @returns Drop zone element.
 */
export function DropZone({ inputRef, onSelect, file }: { inputRef: RefObject<HTMLInputElement | null>; onSelect: (file?: File) => void; file: FileInfo | null }) { return <div className="drop-zone" onClick={() => inputRef.current?.click()}><input ref={inputRef} type="file" hidden onChange={(event) => onSelect(event.target.files?.[0])} />{file ? <><File size={34} /><strong>{file.name}</strong><span>{formatSize(file.size)}</span></> : <><Upload size={30} /><strong>Drop a file here</strong><span>or click to browse</span></>}</div>; }
