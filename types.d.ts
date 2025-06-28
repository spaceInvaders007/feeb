declare global {
  interface HTMLVideoElement {
    audioTracks?: AudioTrackList;
  }
}

export {};