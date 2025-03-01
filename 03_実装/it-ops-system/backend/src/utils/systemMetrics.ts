import os from 'os';

interface CpuInfo {
  usage: number;
  temperature: number;
}

interface MemoryInfo {
  total: number;
  used: number;
  free: number;
}

interface NetworkInfo {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
}

let lastCpuUsage = 0;
let lastCpuTotal = 0;

export async function cpuUsage(): Promise<CpuInfo> {
  const cpus = os.cpus();
  const cpu = cpus[0];
  
  let total = 0;
  for (const type in cpu.times) {
    total += cpu.times[type as keyof typeof cpu.times];
  }

  const usage = cpu.times.user + cpu.times.sys;
  const diff = total - lastCpuTotal;
  const usageDiff = usage - lastCpuUsage;
  
  lastCpuTotal = total;
  lastCpuUsage = usage;

  return {
    usage: diff > 0 ? (usageDiff / diff) * 100 : 0,
    temperature: 0 // 温度センサーAPIが利用可能な場合は実装
  };
}

export async function memoryUsage(): Promise<MemoryInfo> {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;

  return {
    total,
    used,
    free
  };
}

let lastBytesIn = 0;
let lastBytesOut = 0;
let lastPacketsIn = 0;
let lastPacketsOut = 0;

export async function networkStats(): Promise<NetworkInfo> {
  const networkInterfaces = os.networkInterfaces();
  let bytesIn = 0;
  let bytesOut = 0;
  let packetsIn = 0;
  let packetsOut = 0;

  // この部分は実際のネットワークトラフィックを計測するライブラリに置き換えることを推奨
  // 現在はダミーデータを返しています
  bytesIn = Math.random() * 1000000;
  bytesOut = Math.random() * 1000000;
  packetsIn = Math.random() * 1000;
  packetsOut = Math.random() * 1000;

  const result = {
    bytesIn: bytesIn - lastBytesIn,
    bytesOut: bytesOut - lastBytesOut,
    packetsIn: packetsIn - lastPacketsIn,
    packetsOut: packetsOut - lastPacketsOut
  };

  lastBytesIn = bytesIn;
  lastBytesOut = bytesOut;
  lastPacketsIn = packetsIn;
  lastPacketsOut = packetsOut;

  return result;
}