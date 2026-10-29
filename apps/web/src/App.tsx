import { useEffect, useRef, useState } from 'react';
import { Check, FileUp, LoaderCircle, ArrowDownToLine, Link2, Send, CheckCircle2 } from 'lucide-react';
import { Card } from './components/Card';
import { CodeInput } from './components/CodeInput';
import { DropZone } from './components/DropZone';
import { FileSummary } from './components/FileSummary';
import { formatSize, readableCode } from './components/format';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { Modal } from './components/Modal';
import { LegalPage } from './components/LegalPage';
import { getSpeedSetting } from './services/clientStorage';
import { connectTransfer, createTransfer, joinTransfer, registerClient, sendMetadata } from './services/transferService';
import { logger } from './services/logger';
import type { FileInfo, ModalType, PendingAction, SpeedUnit, Step, TransferMessage, TransferRole } from './types';

/**
 * Renders the main TransferMaster application.
 * @returns The application page.
 */
export function App() {
  const [step, setStep] = useState<Step>('home');
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [file, setFile] = useState<FileInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [senderWaiting, setSenderWaiting] = useState(false);
  const [role, setRole] = useState<TransferRole | null>(null);
  const [transferSpeed, setTransferSpeed] = useState('0 B/s');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [writingProgress, setWritingProgress] = useState(0);
  const [writingFile, setWritingFile] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [decisionPending, setDecisionPending] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalType | null>(null);
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | null>(() => getLegalPage());
  const [dark, setDark] = useState(localStorage.getItem('theme') !== 'light');
  const speedSetting = getSpeedSetting();
  const [maxSpeed, setMaxSpeed] = useState(speedSetting.value);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>(speedSetting.unit);
  const inputRef = useRef<HTMLInputElement>(null);
  const clientId = useRef(localStorage.getItem('client_id') ?? '');
  const [clientReady, setClientReady] = useState(false);
  const [clientLoading, setClientLoading] = useState(true);
  const socket = useRef<WebSocket | null>(null);
  const selectedFile = useRef<File | null>(null);
  const currentFile = useRef<FileInfo | null>(null);
  const receivedChunks = useRef<BlobPart[]>([]);
  const receivedBytes = useRef(0);
  const transferStartedAt = useRef<number | null>(null);
  const transferredBytes = useRef(0);
  const downloadWriter = useRef<FileSystemWritableFileStream | null>(null);
  const downloadWriteQueue = useRef(Promise.resolve());

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('theme', dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => {
    const handlePopState = () => setLegalPage(getLegalPage());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  useEffect(() => {
    let active = true;
    async function initializeClient(): Promise<void> {
      try {
        setClientLoading(true);
        const id = clientId.current || crypto.randomUUID();
        await registerClient(id);
        if (!active) return;
        clientId.current = id;
        localStorage.setItem('client_id', id);
        setClientReady(true);
      } catch (reason: unknown) {
        logger.error('Client registration failed', reason);
        if (active) setError('Unable to initialize this device. Please refresh the page and try again.');
      } finally {
        if (active) setClientLoading(false);
      }
    }
    void initializeClient();
    return () => { active = false; };
  }, []);
  useEffect(() => () => socket.current?.close(), []);
  useEffect(() => {
    if (step !== 'transfer') return;
    const timer = window.setInterval(() => {
      if (!transferStartedAt.current) return;
      const elapsedSeconds = Math.max((performance.now() - transferStartedAt.current) / 1000, 0.001);
      const bytesPerSecond = transferredBytes.current / elapsedSeconds;
      setTransferSpeed(formatTransferSpeed(bytesPerSecond));
      const remainingBytes = Math.max((currentFile.current?.size ?? 0) - transferredBytes.current, 0);
      setTimeRemaining(bytesPerSecond > 0 ? formatDuration(remainingBytes / bytesPerSecond) : '');
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step]);
  useEffect(() => {
    const shouldWarn = step === 'transfer';
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldWarn) return;
      event.preventDefault();
      event.returnValue = 'Your transfer is still in progress.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step]);

  /**
   * Returns to the home page without reloading the browser.
   * @returns Nothing.
   */
  function goHome(reason = ''): void {
    if (!reason && role === 'sender' && socket.current?.readyState === WebSocket.OPEN) {
      logger.warn('Sender left transfer; expiring code', { code });
      socket.current.send(JSON.stringify({ type: 'sender-disconnected' }));
    }

    socket.current?.close();
    socket.current = null;
    selectedFile.current = null;
    currentFile.current = null;
    receivedChunks.current = [];
    receivedBytes.current = 0;
    setCode('');
    setJoinCode('');
    setFile(null);
    setProgress(0);
    setSenderWaiting(false);
    setRole(null);
    setTransferSpeed('0 B/s');
    setTimeRemaining('');
    setWritingProgress(0);
    setWritingFile(false);
    transferStartedAt.current = null;
    transferredBytes.current = 0;
    setPendingAction(null);
    setDecisionPending(false);
    setError(reason);
    setStep('home');
  }

  /**
   * Navigates to a dedicated legal page without reloading the application.
   * @param page Legal page to open.
   * @returns Nothing.
   */
  function openLegalPage(page: 'privacy' | 'terms'): void {
    window.history.pushState({}, '', `/${page}`);
    setModal(null);
    setLegalPage(page);
  }

  /**
   * Returns from a legal page to the application home route.
   * @returns Nothing.
   */
  function closeLegalPage(): void {
    window.history.pushState({}, '', '/');
    setLegalPage(null);
  }

  /**
   * Formats an instantaneous transfer speed.
   * @param bytesPerSecond Current transfer rate.
   * @returns Formatted speed.
   */
  function formatTransferSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 ** 2) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    if (bytesPerSecond < 1024 ** 3) return `${(bytesPerSecond / 1024 ** 2).toFixed(1)} MB/s`;
    return `${(bytesPerSecond / 1024 ** 3).toFixed(1)} GB/s`;
  }

  /**
   * Formats an estimated transfer duration.
   * @param seconds Remaining transfer time in seconds.
   * @returns Human-readable duration.
   */
  function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '';
    const roundedSeconds = Math.ceil(seconds);
    const hours = Math.floor(roundedSeconds / 3600);
    const minutes = Math.floor((roundedSeconds % 3600) / 60);
    const remainingSeconds = roundedSeconds % 60;
    return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, '0')).join(':');
  }

  /**
   * Starts a sender room and opens its socket.
   * @returns A promise that resolves after room creation.
   */
  async function startSending(): Promise<void> {
    if (!clientReady) return;
    logger.info('Starting send flow');
    setPendingAction('send');
    await runRequest(async () => { const transferCode = await createTransfer(clientId.current); setCode(transferCode); setStep('send-code'); openSocket(transferCode, 'sender'); });
    setPendingAction(null);
  }

  /**
   * Joins a sender room using the entered code.
   * @returns A promise that resolves after joining.
   */
  async function startReceiving(): Promise<void> {
    if (!clientReady) return;
    logger.info('Starting receive flow');
    setPendingAction('receive');
    await runRequest(async () => { const transferCode = await joinTransfer(clientId.current, joinCode); setCode(transferCode); openSocket(transferCode, 'receiver'); });
    setPendingAction(null);
  }

  /**
   * Runs a request and exposes expected errors in the page.
   * @param request Async request.
   * @returns A promise for the request.
   */
  async function runRequest(request: () => Promise<void>): Promise<void> {
    setError('');
    try { await request(); } catch (reason) {
      logger.error('Transfer request failed', reason);
      setError(reason instanceof Error ? reason.message : 'The transfer request failed.');
    }
  }

  /**
   * Opens a transfer socket and routes text and binary messages.
   * @param transferCode Transfer code.
   * @param role Device role.
   * @returns Nothing.
   */
  function openSocket(transferCode: string, role: TransferRole): void {
    setRole(role);
    socket.current = connectTransfer(transferCode, clientId.current, role, (message, activeSocket) => handleMessage(message, activeSocket, role), handleChunk, () => {
      if (step !== 'home') goHome(`${role === 'sender' ? 'The receiver' : 'The sender'} has disconnected. The transfer session was canceled.`);
    });
  }

  /**
   * Handles protocol messages for the current device.
   * @param message Transfer message.
   * @param activeSocket Active socket.
   * @param role Device role.
   * @returns Nothing.
   */
  function handleMessage(message: TransferMessage, activeSocket: WebSocket, role: TransferRole): void {
    if (message.type === 'connected' && role === 'receiver') setStep('send-file');
    if (message.type === 'peer-connected' && role === 'sender') setStep('send-file');
    if (message.type === 'metadata' && role === 'receiver' && message.metadata) {
      setDecisionPending(false);
      currentFile.current = message.metadata;
      setFile(message.metadata);
      setStep('review');
    }
    if (message.type === 'accepted' && role === 'sender') {
      logger.success('Receiver confirmed file', { filename: file?.name });
      setDecisionPending(false);
      setSenderWaiting(false);
      void sendChunks(activeSocket);
    }
    if (message.type === 'denied') {
      logger.warn('Receiver refused file', { filename: file?.name });
      setDecisionPending(false);
      setFile(null);
      selectedFile.current = null;
      currentFile.current = null;
      setSenderWaiting(false);
      setError(role === 'sender' ? 'The receiver refused this file. Choose another file.' : '');
      setStep(role === 'sender' ? 'send-file' : 'send-code');
    }
    if (message.type === 'completed') { setProgress(100); setStep('done'); }
    if (message.type === 'expired') { goHome(message.message ?? `${role === 'sender' ? 'The receiver' : 'The sender'} has disconnected. The transfer session was canceled.`); }
    if (message.type === 'peer-disconnected' && role === 'sender') { goHome(); }
    if (message.type === 'error') { goHome(message.message ?? 'The transfer session was canceled.'); }
  }

  /**
   * Accumulates a receiver chunk and downloads the completed file.
   * @param chunk Binary file chunk.
   * @param activeSocket Active socket.
   * @returns Nothing.
   */
  async function handleChunk(chunk: ArrayBuffer, activeSocket: WebSocket): Promise<void> {
    const metadata = currentFile.current;
    if (!metadata) return;
    if (downloadWriter.current) {
      const writer = downloadWriter.current;
      setWritingFile(true);
      downloadWriteQueue.current = downloadWriteQueue.current.then(async () => {
        await writer.write(chunk);
        setWritingProgress((written) => Math.min(100, written + (chunk.byteLength / metadata.size) * 100));
      });
    } else {
      receivedChunks.current.push(chunk);
    }
    receivedBytes.current += chunk.byteLength;
    transferredBytes.current = receivedBytes.current;
    transferStartedAt.current ??= performance.now();
    setProgress(Math.min(99, Math.round((receivedBytes.current / metadata.size) * 100)));
    if (receivedBytes.current < metadata.size) return;
    try {
      if (downloadWriter.current) {
        await downloadWriteQueue.current;
        await downloadWriter.current.close();
        downloadWriter.current = null;
        setWritingProgress(100);
        setWritingFile(false);
      } else {
        const url = URL.createObjectURL(new Blob(receivedChunks.current, { type: metadata.type }));
        const anchor = document.createElement('a');
        anchor.href = url; anchor.download = metadata.name; anchor.click(); URL.revokeObjectURL(url);
        setWritingProgress(100);
      }
    } catch (reason: unknown) {
      logger.error('Unable to prepare received file download', reason);
      const message = 'Unable to download the received file in this browser.';
      activeSocket.send(JSON.stringify({ type: 'error', message }));
      goHome(message);
      return;
    }
    logger.success('File downloaded successfully', { filename: metadata.name, fileSize: metadata.size });
    activeSocket.send(JSON.stringify({ type: 'completed' }));
    setProgress(100); setStep('done');
  }

  /**
   * Stores the selected file metadata.
   * @param selected Browser-selected file.
   * @returns Nothing.
   */
  function selectFile(selected: File | undefined): void {
    if (!selected) return;
    setError('');
    selectedFile.current = selected;
    const metadata = { name: selected.name, size: selected.size, type: selected.type || 'application/octet-stream' };
    currentFile.current = metadata; setFile(metadata);
  }

  /**
   * Sends metadata and moves the sender to the transfer view.
   * @returns Nothing.
   */
  function upload(): void {
    if (!file || !socket.current) return;
    sendMetadata(socket.current, file);
    logger.info('Waiting for receiver confirmation', { filename: file.name, fileSize: file.size });
    transferStartedAt.current = null;
    transferredBytes.current = 0;
    setTransferSpeed('0 B/s');
    setTimeRemaining('');
    setSenderWaiting(true);
    setStep('transfer');
  }

  /**
   * Sends a selected file in bounded chunks.
   * @param activeSocket Connected transfer socket.
   * @returns A promise that resolves when all chunks are sent.
   */
  async function sendChunks(activeSocket: WebSocket): Promise<void> {
    const source = selectedFile.current;
    if (!source) return;
    transferStartedAt.current = performance.now();
    const chunkSize = 256 * 1024;
    for (let offset = 0; offset < source.size; offset += chunkSize) {
      while (activeSocket.bufferedAmount > chunkSize * 4) await new Promise((resolve) => setTimeout(resolve, 10));
      activeSocket.send(await source.slice(offset, offset + chunkSize).arrayBuffer());
      transferredBytes.current = Math.min(offset + chunkSize, source.size);
      const bytesPerSecond = maxSpeed * (speedUnit === 'GB/s' ? 1024 ** 3 : speedUnit === 'MB/s' ? 1024 ** 2 : 1024);
      if (maxSpeed > 0) await new Promise((resolve) => setTimeout(resolve, (chunkSize / bytesPerSecond) * 1000));
      setProgress(Math.min(99, Math.round(((offset + chunkSize) / source.size) * 100)));
    }
  }

  /**
   * Accepts or refuses the pending file.
   * @param accepted Whether the receiver accepted the file.
   * @returns Nothing.
   */
  async function decide(accepted: boolean): Promise<void> {
    if (!socket.current) return;
    if (decisionPending) return;
    setDecisionPending(true);
    const saveFilePicker = (window as Window & { showSaveFilePicker?: (options?: { suggestedName?: string }) => Promise<FileSystemFileHandle> }).showSaveFilePicker;
    if (accepted && role === 'receiver' && currentFile.current && saveFilePicker) {
      try {
        const handle = await saveFilePicker({ suggestedName: currentFile.current.name });
        downloadWriter.current = await handle.createWritable();
        downloadWriteQueue.current = Promise.resolve();
        setWritingProgress(0);
      } catch (reason: unknown) {
        logger.error('Unable to open file destination', reason);
        setDecisionPending(false);
        setError('The file destination could not be opened.');
        return;
      }
    }
    socket.current.send(JSON.stringify({ type: accepted ? 'accepted' : 'denied' }));
    logger.info(accepted ? 'File confirmed for download' : 'File denied', { filename: file?.name });
    if (accepted) setStep('transfer');
    else {
      setFile(null);
      currentFile.current = null;
      setDecisionPending(false);
      setError('');
      setStep('send-code');
    }
  }

  if (legalPage) return <div className="app"><Header onHelp={() => setModal('help')} onSettings={() => setModal('settings')} /><LegalPage type={legalPage} onBack={closeLegalPage} /><footer><span>© 2026 TransferMaster</span><div><button onClick={() => openLegalPage('privacy')}>Privacy</button><button onClick={() => openLegalPage('terms')}>Terms</button></div></footer>{modal && <Modal type={modal} dark={dark} setDark={setDark} maxSpeed={maxSpeed} setMaxSpeed={setMaxSpeed} speedUnit={speedUnit} setSpeedUnit={setSpeedUnit} onClose={() => setModal(null)} />}</div>;
  return <div className="app"><Header onHelp={() => setModal('help')} onSettings={() => setModal('settings')} /><main>
    {step === 'home' && <HomeView onSend={startSending} onReceive={() => { if (!clientReady) return; setError(''); setStep('send-code'); }} pendingAction={pendingAction} clientReady={clientReady} clientLoading={clientLoading} />}
    {step === 'send-code' && <Card onBack={() => goHome()} title="Connect a device" subtitle={code ? 'Waiting for another device to connect using the code' : 'Enter the sender’s code to connect.'}>{code && <div className="code">{readableCode(code)}</div>}{!code ? <><label>Transfer code</label><CodeInput value={joinCode} onChange={setJoinCode} /><button className="button pink-button" disabled={joinCode.length !== 10 || pendingAction !== null} onClick={startReceiving}>{pendingAction === 'receive' ? <LoaderCircle className="spin" size={17} /> : <Link2 size={17} />} Connect</button></> : <><div className="waiting"><span className="pulse" /> Waiting for the other device…</div><button className="text-button" onClick={() => goHome()}>Cancel</button></>}</Card>}
    {step === 'send-file' && role === 'receiver' && <Card onBack={() => goHome()} title="Waiting for the sender" subtitle="The sender can now select a file to send to this device."><div className="waiting"><span className="pulse" /> Waiting for the sender to choose a file…</div><button className="text-button" onClick={() => goHome()}>Cancel</button></Card>}
    {step === 'send-file' && role !== 'receiver' && <Card onBack={() => goHome()} title="Choose a file" subtitle="Your file stays on this device until you start the upload."><DropZone inputRef={inputRef} onSelect={selectFile} file={file} /><button className="button pink-button" disabled={!file} onClick={upload}><FileUp size={17} /> Start uploading</button></Card>}
    {step === 'review' && file && <Card onBack={() => goHome()} title="Ready to receive?" subtitle="Someone wants to send this file to your device."><FileSummary file={file} /><div className="button-row"><button className="button subtle" disabled={decisionPending} onClick={() => decide(false)}>{decisionPending ? <LoaderCircle className="spin" size={17} /> : null} Deny</button><button className="button pink-button" disabled={decisionPending} onClick={() => decide(true)}>{decisionPending ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Confirm</button></div></Card>}
    {step === 'transfer' && file && <Card onBack={() => goHome()} title="Transferring file" subtitle="Keep this tab open while the transfer is in progress."><FileSummary file={file} />{senderWaiting && <div className="waiting-confirmation"><LoaderCircle className="spin" size={18} /> Waiting for the receiver to confirm…</div>}{writingFile && role === 'receiver' && <div className="write-status"><div className="waiting-confirmation"><LoaderCircle className="spin" size={18} /> Writing file: {Math.round(writingProgress)}%</div><div className="write-progress"><div style={{ width: `${writingProgress}%` }} /></div></div>}<div className="progress-percentage">{timeRemaining === '00:00:00' ? (role === 'sender' ? 'Waiting for receiver' : 'Downloading...') : timeRemaining}</div><div className="progress"><div style={{ width: `${progress}%` }} /></div><div className="progress-meta"><span>{progress}% complete</span><span>{transferSpeed}</span></div></Card>}
    {step === 'done' && file && <Card onBack={() => goHome()} title="Transfer complete" subtitle=""><div className="success-panel"><div className="success"><div><Check size={28} /></div><strong>{file.name}</strong><span>{formatSize(file.size)} transferred securely</span></div><div className="done-actions">{role === 'sender' && <button className="button pink-button" onClick={() => { setFile(null); selectedFile.current = null; currentFile.current = null; setProgress(0); setTransferSpeed('0 B/s'); setTimeRemaining('Calculating…'); setError(''); transferStartedAt.current = null; transferredBytes.current = 0; setSenderWaiting(false); setStep('send-file'); }}><Send size={17} /> Send another file</button>}{role === 'receiver' ? <button className="button completion-button" onClick={() => { setFile(null); currentFile.current = null; receivedChunks.current = []; receivedBytes.current = 0; setProgress(0); setTransferSpeed('0 B/s'); setTimeRemaining('Calculating…'); setError(''); transferStartedAt.current = null; transferredBytes.current = 0; setStep('send-file'); }}><CheckCircle2 size={17} /> Done</button> : <button className="button completion-button" onClick={() => goHome()}><CheckCircle2 size={17} /> Done</button>}</div></div></Card>}
    {error && <div className="error">{error}</div>}</main><footer><span>© 2026 TransferMaster</span><div><button onClick={() => openLegalPage('privacy')}>Privacy</button><button onClick={() => openLegalPage('terms')}>Terms</button></div></footer>
    {modal && <Modal type={modal} dark={dark} setDark={setDark} maxSpeed={maxSpeed} setMaxSpeed={setMaxSpeed} speedUnit={speedUnit} setSpeedUnit={setSpeedUnit} onClose={() => setModal(null)} />}
  </div>;
}

/**
 * Resolves whether the browser is currently on a legal route.
 * @returns The legal route or null.
 */
function getLegalPage(): 'privacy' | 'terms' | null {
  if (window.location.pathname === '/privacy') return 'privacy';
  if (window.location.pathname === '/terms') return 'terms';
  return null;
}
