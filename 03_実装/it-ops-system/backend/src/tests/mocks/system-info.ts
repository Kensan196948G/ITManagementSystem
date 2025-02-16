export const mockSystemInfo = {
  fsSize: jest.fn().mockResolvedValue([{
    fs: "C:",
    type: "NTFS",
    size: 250790436864,
    used: 86422740992,
    available: 164367695872,
    use: 34.5,
    mount: "/"
  }]),
  
  networkStats: jest.fn().mockResolvedValue([{
    iface: "eth0",
    rx_bytes: 1000000,
    tx_bytes: 500000,
    rx_sec: 1000,
    tx_sec: 500,
    rx_dropped: 0,
    tx_dropped: 0,
    ms: 0
  }])
};

jest.mock('systeminformation', () => ({
  fsSize: () => mockSystemInfo.fsSize(),
  networkStats: () => mockSystemInfo.networkStats()
}));