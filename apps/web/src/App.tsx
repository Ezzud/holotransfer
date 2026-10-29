import { useEffect, useRef, useState } from "react";
import type { FileHandle } from "@tauri-apps/plugin-fs";
import {
  LoaderCircle,
  Heart,
} from "lucide-react";
import { Header } from "./components/Header";
import { HomeView } from "./components/HomeView";
import { Modal } from "./components/Modal";
import { LegalPage } from "./components/LegalPage";
import { ContactPage } from "./components/ContactPage";
import { ReviewView } from "./components/ReviewView";
import { SendCodeView } from "./components/SendCodeView";
import { SendFileView } from "./components/SendFileView";
import { TransferCompleteView } from "./components/TransferCompleteView";
import { TransferProgressView } from "./components/TransferProgressView";
import { getSpeedSetting } from "./services/clientStorage";
import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
} from "./services/screenWakeLock";
import {
  connectTransfer,
  createTransfer,
  joinTransfer,
  registerClient,
  sendMetadata,
} from "./services/transferService";
import { logger } from "./services/logger";
import { openExternalLink } from "./services/externalLinkService";
import { isTauriRuntime } from "./services/tauriService";
import { checkForLatestRelease } from "./services/releaseService";
import type { AvailableRelease } from "./services/releaseService";
import { checkForAppUpdate } from "./services/updaterService";
import {
  decryptChunk,
  deriveTransferKey,
  encryptChunk,
  exportPublicKey,
  generateTransferKeyPair,
  importPublicKey,
} from "./services/encryptionService";
import type {
  FileInfo,
  ModalType,
  PendingAction,
  SpeedUnit,
  Step,
  TransferMessage,
  TransferRole,
} from "./types";

const transferChunkSize = 2 * 1024 * 1024;
const transferWindowSize = 32 * 1024 * 1024;
const nativeWriteBatchSize = 8 * 1024 * 1024;

/**
 * Keeps the selected output filename's extension aligned with the source file.
 * @param path User-selected output path.
 * @param sourceName Original filename.
 * @returns Output path with the original extension.
 */
function restoreFileExtension(path: string, sourceName: string): string {
  const sourceBaseName = sourceName.split(/[\\/]/).pop() ?? sourceName;
  const sourceExtensionIndex = sourceBaseName.lastIndexOf(".");
  if (sourceExtensionIndex <= 0) return path;
  const sourceExtension = sourceBaseName.slice(sourceExtensionIndex);
  const separatorIndex = Math.max(
    path.lastIndexOf("/"),
    path.lastIndexOf("\\"),
  );
  const directory = path.slice(0, separatorIndex + 1);
  const selectedName = path.slice(separatorIndex + 1);
  const selectedExtensionIndex = selectedName.lastIndexOf(".");
  const selectedStem =
    selectedExtensionIndex > 0
      ? selectedName.slice(0, selectedExtensionIndex)
      : selectedName;
  const selectedExtension =
    selectedExtensionIndex > 0
      ? selectedName.slice(selectedExtensionIndex)
      : "";
  if (selectedExtension.toLowerCase() === sourceExtension.toLowerCase())
    return path;
  return `${directory}${selectedStem}${sourceExtension}`;
}

/**
 * Renders the main HoloTransfer application.
 * @returns The application page.
 */
export function App() {
  const [step, setStep] = useState<Step>("home");
  const [navigationDirection, setNavigationDirection] = useState<
    "send" | "receive" | "none"
  >("none");
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [file, setFile] = useState<FileInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [senderWaiting, setSenderWaiting] = useState(false);
  const [role, setRole] = useState<TransferRole | null>(null);
  const [transferSpeed, setTransferSpeed] = useState("0 B/s");
  const [timeRemaining, setTimeRemaining] = useState("");
  const [writingFile, setWritingFile] = useState(false);
  const [writeProgress, setWriteProgress] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [decisionPending, setDecisionPending] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalType | null>(null);
  const [availableRelease, setAvailableRelease] =
    useState<AvailableRelease | null>(null);
  const [legalPage, setLegalPage] = useState<"privacy" | "terms" | "contact" | null>(() =>
    getLegalPage(),
  );
  const [dark, setDark] = useState(localStorage.getItem("theme") !== "light");
  const speedSetting = getSpeedSetting();
  const [maxSpeed, setMaxSpeed] = useState(speedSetting.value);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>(speedSetting.unit);
  const [e2eEnabled, setE2eEnabled] = useState(
    localStorage.getItem("e2e_enabled") !== "false",
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const clientId = useRef(localStorage.getItem("client_id") ?? "");
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
  const nativeFileHandle = useRef<FileHandle | null>(null);
  const nativeSavePath = useRef<string | null>(null);
  const pendingWriteChunks = useRef<ArrayBuffer[]>([]);
  const pendingWriteBytes = useRef(0);
  const writtenFileBytes = useRef(0);
  const downloadWriteQueue = useRef(Promise.resolve());
  const chunkAckResolver = useRef<((bytes: number) => void) | null>(null);
  const chunkAckTarget = useRef<number | null>(null);
  const receivedChunkCount = useRef(0);
  const receivedDecryptSequence = useRef(0);
  const decryptQueues = useRef<Promise<void>[]>(
    Array.from({ length: 2 }, () => Promise.resolve()),
  );
  const receiveChunkQueue = useRef(Promise.resolve());
  const encryptionKeyPair = useRef<CryptoKeyPair | null>(null);
  const encryptionPublicKey = useRef<string | null>(null);
  const encryptionKey = useRef<CryptoKey | null>(null);
  const peerRejectedForEncryption = useRef(false);
  const [encryptionReady, setEncryptionReady] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    void checkForAppUpdate();
    void checkForLatestRelease().then(setAvailableRelease);
  }, []);
  useEffect(() => {
    if (!isTauriRuntime()) return;
    const handleExternalLink = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const href = link.href;
      if (!href || href.startsWith(window.location.origin)) return;
      event.preventDefault();
      event.stopPropagation();
      void openExternalLink(href).catch((reason: unknown) =>
        logger.warn("External link opening failed", reason),
      );
    };
    document.addEventListener("click", handleExternalLink, true);
    return () => document.removeEventListener("click", handleExternalLink, true);
  }, []);
  useEffect(() => {
    if (!isTauriRuntime() || !/android/i.test(navigator.userAgent)) return;
    if (localStorage.getItem("background_permission_prompt_declined") === "true")
      return;
    void (async () => {
      try {
        const { ask } = await import("@tauri-apps/plugin-dialog");
        const allowSettings = await ask(
          "Allow HoloTransfer to keep transfers active while this app is in the background? Android may otherwise pause or stop transfers.",
          { title: "Background transfers", kind: "info", okLabel: "Open settings", cancelLabel: "Not now" },
        );
        if (!allowSettings) {
          localStorage.setItem("background_permission_prompt_declined", "true");
          return;
        }
        await openExternalLink("package:app.holotransfer.desktop");
      } catch (reason: unknown) {
        logger.warn("Unable to open Android background settings", reason);
      }
    })();
  }, []);
  useEffect(() => {
    const handlePopState = () => setLegalPage(getLegalPage());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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
        localStorage.setItem("client_id", id);
        setClientReady(true);
      } catch (reason: unknown) {
        logger.error("Client registration failed", reason);
        if (active)
          setError(
            "Unable to initialize this device. Please refresh the page and try again.",
          );
      } finally {
        if (active) setClientLoading(false);
      }
    }
    void initializeClient();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => () => socket.current?.close(), []);
  useEffect(() => {
    if (step !== "transfer") return;
    const timer = window.setInterval(() => {
      if (!transferStartedAt.current) return;
      const elapsedSeconds = Math.max(
        (performance.now() - transferStartedAt.current) / 1000,
        0.001,
      );
      const bytesPerSecond = transferredBytes.current / elapsedSeconds;
      setTransferSpeed(formatTransferSpeed(bytesPerSecond));
      const remainingBytes = Math.max(
        (currentFile.current?.size ?? 0) - transferredBytes.current,
        0,
      );
      setTimeRemaining(
        bytesPerSecond > 0
          ? formatDuration(remainingBytes / bytesPerSecond)
          : "",
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step]);
  useEffect(() => {
    if (step === "send-file" && role === "sender" && file && !encryptionReady) {
      logger.info("Start uploading is waiting for E2EE handshake", {
        hasSocket: Boolean(socket.current),
        socketState: socket.current?.readyState,
      });
    }
  }, [step, role, file, encryptionReady]);
  useEffect(() => {
    if (step !== "transfer") return;
    const keepalive = window.setInterval(() => {
      if (socket.current?.readyState === WebSocket.OPEN)
        socket.current.send(JSON.stringify({ type: "keepalive" }));
    }, 15_000);
    return () => window.clearInterval(keepalive);
  }, [step]);
  useEffect(() => {
    if (step !== "transfer") {
      releaseScreenWakeLock();
      return;
    }
    const keepScreenAwake = () => {
      if (document.visibilityState === "visible") void requestScreenWakeLock();
    };
    void requestScreenWakeLock();
    document.addEventListener("visibilitychange", keepScreenAwake);
    return () => {
      document.removeEventListener("visibilitychange", keepScreenAwake);
      releaseScreenWakeLock();
    };
  }, [step]);
  useEffect(() => {
    const shouldWarn = step === "transfer";
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldWarn) return;
      event.preventDefault();
      event.returnValue = "Your transfer is still in progress.";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [step]);

  /**
   * Returns to the home page without reloading the browser.
   * @returns Nothing.
   */
  function goHome(
    reason = "",
    direction: "send" | "receive" | "none" = "none",
  ): void {
    if (
      !reason &&
      role === "sender" &&
      socket.current?.readyState === WebSocket.OPEN
    ) {
      logger.warn("Sender left transfer; expiring code", { code });
      socket.current.send(JSON.stringify({ type: "sender-disconnected" }));
    }

    socket.current?.close();
    socket.current = null;
    if (nativeFileHandle.current) void nativeFileHandle.current.close();
    nativeFileHandle.current = null;
    pendingWriteChunks.current = [];
    pendingWriteBytes.current = 0;
    writtenFileBytes.current = 0;
    selectedFile.current = null;
    currentFile.current = null;
    receivedChunks.current = [];
    nativeFileHandle.current = null;
    nativeSavePath.current = null;
    receivedBytes.current = 0;
    setCode("");
    setJoinCode("");
    setFile(null);
    setProgress(0);
    setSenderWaiting(false);
    setRole(null);
    setTransferSpeed("0 B/s");
    setTimeRemaining("");
    setWritingFile(false);
    setWriteProgress(0);
    setEncryptionReady(false);
    setNavigationDirection(direction);
    encryptionKeyPair.current = null;
    encryptionPublicKey.current = null;
    encryptionKey.current = null;
    receiveChunkQueue.current = Promise.resolve();
    transferStartedAt.current = null;
    transferredBytes.current = 0;
    chunkAckResolver.current = null;
    chunkAckTarget.current = null;
    receivedChunkCount.current = 0;
    receivedDecryptSequence.current = 0;
    pendingWriteChunks.current = [];
    pendingWriteBytes.current = 0;
    writtenFileBytes.current = 0;
    decryptQueues.current = Array.from({ length: 2 }, () =>
      Promise.resolve(),
    );
    setPendingAction(null);
    setDecisionPending(false);
    setError(reason);
    setStep("home");
  }

  /**
   * Navigates to a dedicated legal page without reloading the application.
   * @param page Legal page to open.
   * @returns Nothing.
   */
  function openLegalPage(page: "privacy" | "terms"): void {
    window.history.pushState({}, "", `/${page}`);
    setModal(null);
    setLegalPage(page);
  }

  /**
   * Returns from a legal page to the application home route.
   * @returns Nothing.
   */
  function closeLegalPage(): void {
    window.history.pushState({}, "", "/");
    setLegalPage(null);
  }

  /**
   * Opens the contact page without reloading the application.
   * @returns Nothing.
   */
  function openContactPage(): void {
    window.history.pushState({}, "", "/contact");
    setModal(null);
    setLegalPage("contact");
  }

  /**
   * Formats an instantaneous transfer speed.
   * @param bytesPerSecond Current transfer rate.
   * @returns Formatted speed.
   */
  function formatTransferSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 ** 2)
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    if (bytesPerSecond < 1024 ** 3)
      return `${(bytesPerSecond / 1024 ** 2).toFixed(1)} MB/s`;
    return `${(bytesPerSecond / 1024 ** 3).toFixed(1)} GB/s`;
  }

  /**
   * Formats an estimated transfer duration.
   * @param seconds Remaining transfer time in seconds.
   * @returns Human-readable duration.
   */
  function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "";
    const roundedSeconds = Math.ceil(seconds);
    const hours = Math.floor(roundedSeconds / 3600);
    const minutes = Math.floor((roundedSeconds % 3600) / 60);
    const remainingSeconds = roundedSeconds % 60;
    return [hours, minutes, remainingSeconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  /**
   * Starts a sender room and opens its socket.
   * @returns A promise that resolves after room creation.
   */
  async function startSending(): Promise<void> {
    if (!clientReady) return;
    logger.info("Starting send flow");
    setNavigationDirection("send");
    setPendingAction("send");
    await runRequest(async () => {
      const transferCode = await createTransfer(clientId.current);
      setCode(transferCode);
      setStep("send-code");
      openSocket(transferCode, "sender");
    });
    setPendingAction(null);
  }

  /**
   * Joins a sender room using the entered code.
   * @returns A promise that resolves after joining.
   */
  async function startReceiving(): Promise<void> {
    if (!clientReady) return;
    logger.info("Starting receive flow");
    setNavigationDirection("receive");
    setPendingAction("receive");
    await runRequest(async () => {
      const transferCode = await joinTransfer(clientId.current, joinCode);
      setCode(transferCode);
      openSocket(transferCode, "receiver");
    });
    setPendingAction(null);
  }

  /**
   * Runs a request and exposes expected errors in the page.
   * @param request Async request.
   * @returns A promise for the request.
   */
  async function runRequest(request: () => Promise<void>): Promise<void> {
    setError("");
    try {
      await request();
    } catch (reason) {
      logger.error("Transfer request failed", reason);
      setError(
        reason instanceof Error
          ? reason.message
          : "The transfer request failed.",
      );
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
    peerRejectedForEncryption.current = false;
    socket.current = connectTransfer(
      transferCode,
      clientId.current,
      role,
      (message, activeSocket) => handleMessage(message, activeSocket, role),
      handleChunk,
      () => {
        if (peerRejectedForEncryption.current) return;
        if (step !== "home")
          goHome(
            `${role === "sender" ? "The receiver" : "The sender"} has disconnected. The transfer session was terminated.`,
          );
      },
      (activeSocket) => {
        sendEncryptionConfig(activeSocket);
        if (e2eEnabled) void initializeEncryption(activeSocket);
        else setEncryptionReady(true);
      },
    );
  }

  /**
   * Generates local transfer keys and sends the public key through the relay.
   * @param activeSocket Connected transfer socket.
   * @returns Promise resolving after the public key is sent.
   */
  async function initializeEncryption(activeSocket: WebSocket): Promise<void> {
    try {
      const keyPair = await generateTransferKeyPair();
      encryptionKeyPair.current = keyPair;
      encryptionPublicKey.current = await exportPublicKey(keyPair.publicKey);
      sendEncryptionPublicKey(activeSocket, "socket-open");
    } catch (reason: unknown) {
      logger.error("Unable to initialize end-to-end encryption", reason);
      goHome("Unable to initialize secure file transfer.");
    }

  }

  function sendEncryptionConfig(activeSocket: WebSocket): void {
    if (activeSocket.readyState === WebSocket.OPEN)
      activeSocket.send(
        JSON.stringify({ type: "e2ee-config", enabled: e2eEnabled }),
      );
  }

  /**
   * Sends the local public key after the peer is available.
   * @param activeSocket Connected transfer socket.
   * @param reason Handshake event that triggered the retry.
   * @returns Nothing.
   */
  function sendEncryptionPublicKey(activeSocket: WebSocket, reason: string): void {
    if (!e2eEnabled) return;
    const key = encryptionPublicKey.current;
    if (!key || activeSocket.readyState !== WebSocket.OPEN) {
      logger.warn("Unable to send E2EE public key", {
        reason,
        hasPublicKey: Boolean(key),
        socketState: activeSocket.readyState,
      });
      return;
    }
    logger.info("Sending E2EE public key", { reason });
    activeSocket.send(JSON.stringify({ type: "e2ee-key", key }));
  }

  /**
   * Handles protocol messages for the current device.
   * @param message Transfer message.
   * @param activeSocket Active socket.
   * @param role Device role.
   * @returns Nothing.
   */
  function handleMessage(
    message: TransferMessage,
    activeSocket: WebSocket,
    role: TransferRole,
  ): void {
    if (message.type === "e2ee-config" && typeof message.enabled === "boolean") {
      if (message.enabled !== e2eEnabled) {
        const reason =
          !message.enabled
            ? "Sender have end-to-end encryption disabled, either disable it too or make the sender device enable it in the settings"
            : "Sender have end-to-end encryption enabled, either enable it too or make the sender device disable it in the settings";
        if (role === "receiver") {
          activeSocket.send(
            JSON.stringify({ type: "e2ee-rejected", message: reason }),
          );
          goHome(reason);
        }
        return;
      }
      if (!e2eEnabled) setEncryptionReady(true);
      return;
    }
    if (message.type === "e2ee-rejected" && role === "sender") {
      peerRejectedForEncryption.current = true;
      setSenderWaiting(false);
      setError(message.message ?? "The receiver rejected the encryption settings.");
      setStep("send-file");
      return;
    }
    if (message.type === "e2ee-key" && message.key) {
      logger.info("Received E2EE public key");
      void establishEncryption(message.key);
      return;
    }
    if (message.type === "connected" && role === "receiver") {
      sendEncryptionPublicKey(activeSocket, "receiver-connected");
      setStep("send-file");
    }
    if (message.type === "peer-connected") {
      sendEncryptionPublicKey(activeSocket, "peer-connected");
      if (role === "sender") setStep("send-file");
    }
    if (
      message.type === "metadata" &&
      role === "receiver" &&
      message.metadata
    ) {
      setDecisionPending(false);
      currentFile.current = message.metadata;
      setFile(message.metadata);
      receivedChunks.current = [];
      receivedBytes.current = 0;
      receivedChunkCount.current = 0;
      receivedDecryptSequence.current = 0;
      decryptQueues.current = Array.from({ length: 2 }, () =>
        Promise.resolve(),
      );
      downloadWriteQueue.current = Promise.resolve();
      setWriteProgress(0);
      setStep("review");
    }

    /**
     * Derives the shared encryption key from the remote public key.
     * @param encodedKey Base64 encoded remote public key.
     * @returns Promise resolving after key derivation.
     */
    async function establishEncryption(encodedKey: string): Promise<void> {
      const keyPair = encryptionKeyPair.current;
      if (!keyPair) return;
      try {
        encryptionKey.current = await deriveTransferKey(
          keyPair,
          await importPublicKey(encodedKey),
        );
        setEncryptionReady(true);
        logger.success("End-to-end encryption established");
      } catch (reason: unknown) {
        logger.error("Unable to establish end-to-end encryption", reason);
        goHome("Unable to establish secure file transfer.");
      }
    }
    if (message.type === "accepted" && role === "sender") {
      if (e2eEnabled && !encryptionKey.current) {
        goHome("Unable to establish secure file transfer.");
        return;
      }
      logger.success("Receiver confirmed file", { filename: file?.name });
      setDecisionPending(false);
      setSenderWaiting(false);
      void sendChunks(activeSocket);
    }
    if (message.type === "chunk-ack" && role === "sender") {
      if (typeof message.bytes === "number") {
        const acknowledgedBytes = Math.min(
          message.bytes,
          currentFile.current?.size ?? message.bytes,
        );
        transferredBytes.current = acknowledgedBytes;
        const fileSize = currentFile.current?.size ?? 0;
        if (fileSize > 0) {
          setProgress(
            Math.min(99, Math.round((acknowledgedBytes / fileSize) * 100)),
          );
        }
        if (
          chunkAckTarget.current !== null &&
          acknowledgedBytes >= chunkAckTarget.current
        ) {
          chunkAckResolver.current?.(acknowledgedBytes);
          chunkAckResolver.current = null;
          chunkAckTarget.current = null;
        }
      }
      return;
    }
    if (message.type === "denied") {
      logger.warn("Receiver refused file", { filename: file?.name });
      setDecisionPending(false);
      setFile(null);
      selectedFile.current = null;
      currentFile.current = null;
      setSenderWaiting(false);
      setError(
        role === "sender"
          ? "The receiver refused this file. Choose another file."
          : "",
      );
      setStep(role === "sender" ? "send-file" : "send-code");
    }
    if (message.type === "completed") {
      setProgress(100);
      setStep("done");
    }
    if (message.type === "metadata-error") {
      logger.warn("File metadata rejected; keeping transfer connection open", {
        message: message.message,
      });
      setFile(null);
      selectedFile.current = null;
      currentFile.current = null;
      setSenderWaiting(false);
      setProgress(0);
      setTimeRemaining("");
      setError(`${message.message ?? "This file cannot be sent."} Please choose another file.`);
      setStep(role === "sender" ? "send-file" : "send-file");
      return;
    }
    if (message.type === "expired") {
      goHome(
        message.message ??
          `${role === "sender" ? "The receiver" : "The sender"} has disconnected. The transfer session was terminated.`,
      );
    }
    if (
      message.type === "peer-disconnected" &&
      role === "sender" &&
      !peerRejectedForEncryption.current
    ) {
      goHome();
    }
    if (message.type === "error") {
      goHome(message.message ?? "The transfer session was terminated.");
    }
  }

  /**
   * Accumulates a receiver chunk and downloads the completed file.
   * @param chunk Binary file chunk.
   * @param activeSocket Active socket.
   * @returns Nothing.
   */
  async function handleChunk(
    chunk: ArrayBuffer,
    activeSocket: WebSocket,
  ): Promise<void> {
    const sequence = receivedDecryptSequence.current++;
    const slot = sequence % decryptQueues.current.length;
    const key = encryptionKey.current;
    const decryptPromise = decryptQueues.current[slot].then(() => {
      if (!e2eEnabled) return chunk;
      if (!key) throw new Error("The secure transfer channel is not ready.");
      return decryptChunk(key, chunk);
    });
    decryptQueues.current[slot] = decryptPromise.then(
      () => undefined,
      () => undefined,
    );
    receiveChunkQueue.current = receiveChunkQueue.current.then(async () => {
      await processEncryptedChunk(chunk, activeSocket, decryptPromise);
    });
    await receiveChunkQueue.current;
  }

  /**
   * Decrypts and processes one received file chunk in order.
   * @param encryptedChunk Encrypted file chunk.
   * @param activeSocket Connected transfer socket.
   * @returns Promise resolving after the chunk is processed.
   */
  async function processEncryptedChunk(
    encryptedChunk: ArrayBuffer,
    activeSocket: WebSocket,
    decryptedChunkPromise?: Promise<ArrayBuffer>,
  ): Promise<void> {
    const metadata = currentFile.current;
    const key = encryptionKey.current;
    if (!metadata || (e2eEnabled && !key)) {
      const message = "The secure transfer channel is not ready.";
      activeSocket.send(JSON.stringify({ type: "error", message }));
      goHome(message);
      return;
    }
    let chunk: ArrayBuffer;
    try {
      if (decryptedChunkPromise) {
        chunk = await decryptedChunkPromise;
      } else {
        chunk = e2eEnabled
          ? await decryptChunk(key!, encryptedChunk)
          : encryptedChunk;
      }
    } catch (reason: unknown) {
      logger.error("Unable to decrypt received file chunk", reason);
      const message = "The received file failed security verification.";
      activeSocket.send(JSON.stringify({ type: "error", message }));
      goHome(message);
      return;
    }
    if (downloadWriter.current || nativeFileHandle.current) {
      pendingWriteChunks.current.push(chunk);
      pendingWriteBytes.current += chunk.byteLength;
      if (
        pendingWriteBytes.current >= nativeWriteBatchSize ||
        receivedBytes.current + chunk.byteLength >= metadata.size
      ) {
        const batch = pendingWriteChunks.current;
        pendingWriteChunks.current = [];
        pendingWriteBytes.current = 0;
        const browserWriter = downloadWriter.current;
        const nativeWriter = nativeFileHandle.current;
        downloadWriteQueue.current = downloadWriteQueue.current.then(async () => {
          if (browserWriter) {
            await browserWriter.write(new Blob(batch));
          } else if (nativeWriter) {
            const data = await new Blob(batch).arrayBuffer();
            await nativeWriter.write(new Uint8Array(data));
          }
          writtenFileBytes.current += batch.reduce(
            (total, item) => total + item.byteLength,
            0,
          );
          setWriteProgress(
            Math.min(
              100,
              Math.round(
                (writtenFileBytes.current / metadata.size) * 100,
              ),
            ),
          );
        });
      }
    } else {
      receivedChunks.current.push(chunk);
    }
    receivedBytes.current += chunk.byteLength;
    transferStartedAt.current ??= performance.now();
    transferredBytes.current = receivedBytes.current;
    setProgress(
      Math.min(99, Math.round((receivedBytes.current / metadata.size) * 100)),
    );
    receivedChunkCount.current += 1;
    if (
      receivedChunkCount.current % 2 === 0 ||
      receivedBytes.current >= metadata.size
    ) {
      activeSocket.send(
        JSON.stringify({ type: "chunk-ack", bytes: receivedBytes.current }),
      );
    }
    if (receivedBytes.current < metadata.size) return;
    try {
      if (downloadWriter.current) {
        setProgress(100);
        setTimeRemaining("00:00:00");
        setWriteProgress(0);
        setWritingFile(true);
        await downloadWriteQueue.current;
        await downloadWriter.current.close();
        downloadWriter.current = null;
        setWriteProgress(100);
        setWritingFile(false);
      } else if (nativeFileHandle.current) {
        setProgress(100);
        setTimeRemaining("00:00:00");
        setWriteProgress(0);
        setWritingFile(true);
        await downloadWriteQueue.current;
        await nativeFileHandle.current.close();
        nativeFileHandle.current = null;
        nativeSavePath.current = null;
        setWriteProgress(100);
        setWritingFile(false);
      } else {
        const url = URL.createObjectURL(
          new Blob(receivedChunks.current, { type: metadata.type }),
        );
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = metadata.name;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch (reason: unknown) {
      logger.error("Unable to prepare received file download", reason);
      const message = "Unable to save the received file.";
      activeSocket.send(JSON.stringify({ type: "error", message }));
      goHome(message);
      return;
    }
    logger.success("File downloaded successfully", {
      filename: metadata.name,
      fileSize: metadata.size,
    });
    activeSocket.send(JSON.stringify({ type: "completed" }));
    setProgress(100);
    setStep("done");
  }

  /**
   * Stores the selected file metadata.
   * @param selected Browser-selected file.
   * @returns Nothing.
   */
  function selectFile(selected: File | undefined): void {
    if (!selected) return;
    setError("");
    selectedFile.current = selected;
    const metadata = {
      name: selected.name,
      size: selected.size,
      type: selected.type || "application/octet-stream",
    };
    currentFile.current = metadata;
    setFile(metadata);
  }

  /**
   * Sends metadata and moves the sender to the transfer view.
   * @returns Nothing.
   */
  function upload(): void {
    if (
      !file ||
      !socket.current ||
      (e2eEnabled && (!encryptionKey.current || !encryptionReady))
    ) {
      logger.warn("Start uploading blocked: E2EE is not ready", {
        hasFile: Boolean(file),
        hasSocket: Boolean(socket.current),
        socketState: socket.current?.readyState,
        hasEncryptionKey: Boolean(encryptionKey.current),
        encryptionReady,
      });
      setError("Secure transfer is still initializing. Please try again.");
      return;
    }
    sendMetadata(socket.current, file);
    logger.info("Waiting for receiver confirmation", {
      filename: file.name,
      fileSize: file.size,
    });
    transferStartedAt.current = null;
    transferredBytes.current = 0;
    setTransferSpeed("0 B/s");
    setTimeRemaining("");
    setSenderWaiting(true);
    setStep("transfer");
  }

  /**
   * Sends a selected file in bounded chunks.
   * @param activeSocket Connected transfer socket.
   * @returns A promise that resolves when all chunks are sent.
   */
  async function sendChunks(activeSocket: WebSocket): Promise<void> {
    const source = selectedFile.current;
    const key = encryptionKey.current;
    if (!source || (e2eEnabled && !key)) return;
    transferStartedAt.current = performance.now();
    const chunkSize = transferChunkSize;
    const windowSize = transferWindowSize;
    const bytesPerSecond =
      maxSpeed *
      (speedUnit === "GB/s"
        ? 1024 ** 3
        : speedUnit === "MB/s"
          ? 1024 ** 2
          : 1024);
    for (let offset = 0; offset < source.size; ) {
      const windowEnd = Math.min(offset + windowSize, source.size);
      const acknowledgedWindow = new Promise<number>((resolve) => {
        chunkAckTarget.current = windowEnd;
        chunkAckResolver.current = resolve;
      });
      while (offset < windowEnd) {
        while (activeSocket.bufferedAmount > windowSize)
          await new Promise((resolve) => setTimeout(resolve, 10));
        const nextOffset = Math.min(offset + chunkSize, source.size);
        const data = await source.slice(offset, nextOffset).arrayBuffer();
        activeSocket.send(
          e2eEnabled ? await encryptChunk(key!, data) : data,
        );
        if (maxSpeed > 0)
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              ((nextOffset - offset) / bytesPerSecond) * 1000,
            ),
          );
        offset = nextOffset;
      }
      const completedBytes = Math.min(await acknowledgedWindow, source.size);
      transferredBytes.current = completedBytes;
      setProgress(
        Math.min(99, Math.round((completedBytes / source.size) * 100)),
      );
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
    if (accepted && role === "receiver" && !encryptionReady) {
      setError("Secure transfer is still initializing. Please try again.");
      return;
    }
    setDecisionPending(true);
    if (
      accepted &&
      role === "receiver" &&
      currentFile.current &&
      isTauriRuntime()
    ) {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { open } = await import("@tauri-apps/plugin-fs");
        const path = await save({
          defaultPath: currentFile.current.name,
        });
        if (!path) {
          setDecisionPending(false);
          return;
        }
        const outputPath = restoreFileExtension(
          path,
          currentFile.current.name,
        );
        nativeSavePath.current = outputPath;
        nativeFileHandle.current = await open(outputPath, {
          write: true,
          create: true,
          truncate: true,
        });
      } catch (reason: unknown) {
        logger.error("Unable to open native file destination", reason);
        setDecisionPending(false);
        setError("The file destination could not be opened.");
        return;
      }
    }
    const saveFilePicker = (
      window as Window & {
        showSaveFilePicker?: (options?: {
          suggestedName?: string;
        }) => Promise<FileSystemFileHandle>;
      }
    ).showSaveFilePicker;
    if (
      accepted &&
      role === "receiver" &&
      currentFile.current &&
      saveFilePicker &&
      !isTauriRuntime()
    ) {
      try {
        const handle = await saveFilePicker({
          suggestedName: currentFile.current.name,
        });
        downloadWriter.current = await handle.createWritable();
        downloadWriteQueue.current = Promise.resolve();
      } catch (reason: unknown) {
        logger.error("Unable to open file destination", reason);
        setDecisionPending(false);
        setError("The file destination could not be opened.");
        return;
      }
    }
    socket.current.send(
      JSON.stringify({ type: accepted ? "accepted" : "denied" }),
    );
    logger.info(accepted ? "File confirmed for download" : "File denied", {
      filename: file?.name,
    });
    if (accepted) setStep("transfer");
    else {
      setFile(null);
      currentFile.current = null;
      setDecisionPending(false);
      setError("");
      setStep("send-file");
    }
  }

  if (legalPage === "contact")
    return <div className="app"><Header onHelp={() => setModal("help")} onSettings={() => setModal("settings")} /><ContactPage onBack={closeLegalPage} /><footer><span className="footer-credit">© 2026 HoloTransfer · Made with{" "}<Heart className="footer-heart" size={13} fill="currentColor" aria-label="love" /> by{" "}<a href="https://github.com/Ezzud" target="_blank" rel="noreferrer">Ezzud</a></span><div><button onClick={() => openLegalPage("privacy")}>Privacy</button><button onClick={() => openLegalPage("terms")}>Terms</button><button onClick={openContactPage}>Contact</button></div></footer>{modal &&     <Modal type={modal} dark={dark} setDark={setDark} maxSpeed={maxSpeed} setMaxSpeed={setMaxSpeed} e2eEnabled={e2eEnabled} setE2eEnabled={setE2eEnabled} speedUnit={speedUnit} setSpeedUnit={setSpeedUnit} availableRelease={availableRelease} onClose={() => setModal(null)} />}</div>;
  if (legalPage === "privacy" || legalPage === "terms")
    return (
      <div className="app">
        <Header
          onHelp={() => setModal("help")}
          onSettings={() => setModal("settings")}
        />
        <LegalPage type={legalPage} onBack={closeLegalPage} />
        <footer>
          <span className="footer-credit">
            © 2026 HoloTransfer · Made with{" "}
            <Heart
              className="footer-heart"
              size={13}
              fill="currentColor"
              aria-label="love"
            />{" "}
            by{" "}
            <a href="https://github.com/Ezzud" target="_blank" rel="noreferrer">
              Ezzud
            </a>
          </span>
          <div>
            <button onClick={() => openLegalPage("privacy")}>Privacy</button>
            <button onClick={() => openLegalPage("terms")}>Terms</button>
            <button onClick={openContactPage}>Contact</button>
          </div>
        </footer>
        {modal && (
          <Modal
            type={modal}
            dark={dark}
            setDark={setDark}
            maxSpeed={maxSpeed}
            setMaxSpeed={setMaxSpeed}
            e2eEnabled={e2eEnabled}
            setE2eEnabled={setE2eEnabled}
            speedUnit={speedUnit}
            setSpeedUnit={setSpeedUnit}
            availableRelease={availableRelease}
            onClose={() => setModal(null)}
          />
        )}
      </div>
    );
  return (
    <div className="app">
      <Header
        onHelp={() => setModal("help")}
        onSettings={() => setModal("settings")}
      />
      <main>
        <div
          key={`${step}-${navigationDirection}`}
          className={
            navigationDirection === "none"
              ? "page-transition"
              : `page-transition slide-${navigationDirection}`
          }
        >
          {step === "home" && (
            <HomeView
              onSend={startSending}
              onHelp={() => setModal("help")}
              onReceive={() => {
                if (!clientReady) return;
                setError("");
                setNavigationDirection("receive");
                setStep("send-code");
              }}
              pendingAction={pendingAction}
              clientReady={clientReady}
              clientLoading={clientLoading}
            />
          )}
          {step === "send-code" && (
            <SendCodeView
              code={code}
              joinCode={joinCode}
              pendingAction={pendingAction}
              onBack={() =>
                goHome("", navigationDirection === "receive" ? "send" : "receive")
              }
              onJoinCodeChange={setJoinCode}
              onConnect={startReceiving}
            />
          )}
          {step === "send-file" && role && (
            <SendFileView
              role={role}
              file={file}
              inputRef={inputRef}
              encryptionReady={encryptionReady}
              encryptionEnabled={e2eEnabled}
              onBack={() =>
                goHome("", role === "receiver" ? "send" : "receive")
              }
              onSelect={selectFile}
              onUpload={upload}
            />
          )}
          {step === "review" && file && (
            <ReviewView
              file={file}
              decisionPending={decisionPending}
              onBack={() => goHome("", "send")}
              onDecision={decide}
            />
          )}
          {step === "transfer" && file && role && (
            <TransferProgressView
              file={file}
              role={role}
              progress={progress}
              timeRemaining={timeRemaining}
              transferSpeed={transferSpeed}
              senderWaiting={senderWaiting}
              writingFile={writingFile}
              writeProgress={writeProgress}
              encryptionEnabled={e2eEnabled}
              onBack={() =>
                goHome("", role === "receiver" ? "send" : "receive")
              }
            />
          )}
          {step === "done" && file && role && (
            <TransferCompleteView
              file={file}
              role={role}
              onBack={() => goHome("", "none")}
              onSendAnother={() => {
                setFile(null);
                selectedFile.current = null;
                currentFile.current = null;
                setProgress(0);
                setTransferSpeed("0 B/s");
                setTimeRemaining("Calculating…");
                setError("");
                transferStartedAt.current = null;
                transferredBytes.current = 0;
                setSenderWaiting(false);
                setStep("send-file");
              }}
              onDone={() => {
                setFile(null);
                currentFile.current = null;
                receivedChunks.current = [];
                receivedBytes.current = 0;
                setProgress(0);
                setTransferSpeed("0 B/s");
                setTimeRemaining("Calculating…");
                setError("");
                transferStartedAt.current = null;
                transferredBytes.current = 0;
                setStep("send-file");
              }}
            />
          )}
        </div>
        {error && <div className="error">{error}</div>}
      </main>
      <footer>
        <span className="footer-credit">
          © 2026 HoloTransfer · Made with{" "}
          <Heart
            className="footer-heart"
            size={13}
            fill="currentColor"
            aria-label="love"
          />{" "}
          by{" "}
          <a href="https://github.com/Ezzud" target="_blank" rel="noreferrer">
            Ezzud
          </a>
        </span>
        <div>
          <button onClick={() => openLegalPage("privacy")}>Privacy</button>
          <button onClick={() => openLegalPage("terms")}>Terms</button>
          <button onClick={openContactPage}>Contact</button>
        </div>
      </footer>
      {modal && (
        <Modal
          type={modal}
          dark={dark}
          setDark={setDark}
          maxSpeed={maxSpeed}
          setMaxSpeed={setMaxSpeed}
          e2eEnabled={e2eEnabled}
          setE2eEnabled={setE2eEnabled}
          speedUnit={speedUnit}
          setSpeedUnit={setSpeedUnit}
          availableRelease={availableRelease}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/**
 * Resolves whether the browser is currently on a legal route.
 * @returns The legal route or null.
 */
function getLegalPage(): "privacy" | "terms" | "contact" | null {
  if (window.location.pathname === "/privacy") return "privacy";
  if (window.location.pathname === "/terms") return "terms";
  if (window.location.pathname === "/contact") return "contact";
  return null;
}
