/**
 * Thermal printer integration via @capacitor-community/bluetooth-le.
 * Web-safe: all calls are dynamic-imported and gated behind isNative().
 *
 * Typical thermal printer (ESC/POS) service UUID — many cheap 58mm/80mm
 * printers expose a Serial Port-like write characteristic. We expose a
 * generic API: scan → connect → writeBytes. Caller composes ESC/POS bytes.
 */
import { isNative } from "./platform";

export type PrinterDevice = {
  deviceId: string;
  name?: string;
  rssi?: number;
};

let connectedId: string | null = null;
let writeService: string | null = null;
let writeChar: string | null = null;

/** Common ESC/POS write service UUIDs. Try in order. */
const KNOWN_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb", // Most BT thermal printers
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // Microchip BM77/HM-10 variants
];

export async function initPrinter(): Promise<void> {
  if (!isNative()) return;
  const { BleClient } = await import(/* @vite-ignore */ ("@capacitor-community/bluetooth-le" as string));
  await BleClient.initialize({ androidNeverForLocation: true });
}

export async function scanPrinters(
  onDevice: (d: PrinterDevice) => void,
  durationMs = 8000,
): Promise<void> {
  if (!isNative()) throw new Error("Bluetooth is only available in the native app");
  const { BleClient } = await import(/* @vite-ignore */ ("@capacitor-community/bluetooth-le" as string));
  await BleClient.initialize({ androidNeverForLocation: true });
  await BleClient.requestLEScan({ allowDuplicates: false }, (result) => {
    onDevice({
      deviceId: result.device.deviceId,
      name: result.device.name ?? result.localName,
      rssi: result.rssi,
    });
  });
  setTimeout(async () => {
    try { await BleClient.stopLEScan(); } catch {}
  }, durationMs);
}

export async function connectPrinter(deviceId: string): Promise<void> {
  if (!isNative()) throw new Error("Bluetooth is only available in the native app");
  const { BleClient } = await import(/* @vite-ignore */ ("@capacitor-community/bluetooth-le" as string));
  await BleClient.connect(deviceId, () => {
    connectedId = null;
    writeService = null;
    writeChar = null;
  });
  const services = await BleClient.getServices(deviceId);
  for (const svc of services) {
    if (!KNOWN_SERVICES.includes(svc.uuid)) continue;
    for (const ch of svc.characteristics) {
      const props = ch.properties as any;
      if (props?.write || props?.writeWithoutResponse) {
        writeService = svc.uuid;
        writeChar = ch.uuid;
        break;
      }
    }
    if (writeChar) break;
  }
  if (!writeChar) {
    // Fallback: first writable characteristic on any service
    for (const svc of services) {
      for (const ch of svc.characteristics) {
        const props = ch.properties as any;
        if (props?.write || props?.writeWithoutResponse) {
          writeService = svc.uuid;
          writeChar = ch.uuid;
          break;
        }
      }
      if (writeChar) break;
    }
  }
  if (!writeChar || !writeService) {
    await BleClient.disconnect(deviceId);
    throw new Error("No writable characteristic found on this device");
  }
  connectedId = deviceId;
}

export async function writeBytes(bytes: Uint8Array): Promise<void> {
  if (!isNative()) throw new Error("Bluetooth is only available in the native app");
  if (!connectedId || !writeService || !writeChar) throw new Error("Printer not connected");
  const { BleClient, numbersToDataView } = await import(/* @vite-ignore */ ("@capacitor-community/bluetooth-le" as string));
  const chunkSize = 180;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.slice(i, i + chunkSize);
    const dv = numbersToDataView(Array.from(slice));
    await BleClient.writeWithoutResponse(connectedId, writeService, writeChar, dv);
  }
}

export async function disconnectPrinter(): Promise<void> {
  if (!isNative() || !connectedId) return;
  const { BleClient } = await import(/* @vite-ignore */ ("@capacitor-community/bluetooth-le" as string));
  try { await BleClient.disconnect(connectedId); } catch {}
  connectedId = null;
  writeService = null;
  writeChar = null;
}

/** Compose ESC/POS bytes for a simple receipt. */
export function escposReceipt(opts: {
  title: string;
  lines: string[];
  footer?: string;
}): Uint8Array {
  const enc = new TextEncoder();
  const out: number[] = [];
  // Init
  out.push(0x1b, 0x40);
  // Center + double size title
  out.push(0x1b, 0x61, 0x01);
  out.push(0x1d, 0x21, 0x11);
  for (const b of enc.encode(opts.title + "\n")) out.push(b);
  out.push(0x1d, 0x21, 0x00);
  out.push(0x1b, 0x61, 0x00);
  for (const b of enc.encode("--------------------------------\n")) out.push(b);
  for (const line of opts.lines) {
    for (const b of enc.encode(line + "\n")) out.push(b);
  }
  for (const b of enc.encode("--------------------------------\n")) out.push(b);
  if (opts.footer) {
    out.push(0x1b, 0x61, 0x01);
    for (const b of enc.encode(opts.footer + "\n")) out.push(b);
    out.push(0x1b, 0x61, 0x00);
  }
  // Feed + cut
  out.push(0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x00);
  return new Uint8Array(out);
}

export function isPrinterConnected(): boolean {
  return !!connectedId;
}
