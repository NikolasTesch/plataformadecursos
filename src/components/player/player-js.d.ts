declare module "player.js" {
  interface Player {
    on(event: string, callback: (data?: unknown) => void): void;
    off(event: string, callback: (data?: unknown) => void): void;
    getCurrentTime(callback: (value: number) => void): void;
    getDuration(callback: (value: number) => void): void;
    setCurrentTime(seconds: number): void;
  }

  interface PlayerConstructor {
    new (iframe: HTMLIFrameElement): Player;
  }

  const playerjs: { Player: PlayerConstructor };
  export = playerjs;
}
