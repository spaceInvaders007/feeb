declare global {
  interface HTMLVideoElement {
    audioTracks?: AudioTrackList;
  }

  interface Navigator {
    bluetooth?: {
      getAvailabilityState?: () => Promise<any[]>;
      addEventListener?: (event: string, handler: (event: Event) => void) => void;
      removeEventListener?: (event: string, handler: (event: Event) => void) => void;
    };
  }

  interface BluetoothDevice {
    id: string;
    name?: string;
    gatt?: {
      connected: boolean;
    };
  }

  // Fix NodeJS timeout issues
  namespace NodeJS {
    interface Timeout {}
  }
}

export {};