let paused = false;

export function setLiveRefreshPaused(value: boolean): void {
  paused = value;
}

export function isLiveRefreshPaused(): boolean {
  return paused;
}
