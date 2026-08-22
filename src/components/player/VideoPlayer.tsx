"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  materialId: string;
  retomadaSegundos: number;
}

const INTERVALO_POSICAO_MS = 5_000;

interface PlayerInstance {
  on(event: string, callback: (data?: unknown) => void): void;
  off(event: string, callback: (data?: unknown) => void): void;
  getCurrentTime(callback: (value: number) => void): void;
  getDuration(callback: (value: number) => void): void;
  setCurrentTime(seconds: number): void;
}

interface PlayerModule {
  Player: new (iframe: HTMLIFrameElement) => PlayerInstance;
}

interface SnapshotPosicao {
  posicaoSegundos: number;
  duracaoSegundos: number;
}

// The legacy UMD package reads window during evaluation. Starting its local
// import only in the browser keeps the server render free of browser globals.
const playerJsPromise: Promise<PlayerModule> | null = typeof window === "undefined"
  ? null
  : import("player.js").then((module) => ("default" in module ? module.default : module) as PlayerModule);

export function VideoPlayer({ src, materialId, retomadaSegundos }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ultimaGravacaoRef = useRef(0);
  const salvandoRef = useRef(false);
  const [falha, setFalha] = useState(false);
  const [playerCarregado, setPlayerCarregado] = useState(false);

  useEffect(() => {
    if (!playerJsPromise) return;
    void playerJsPromise.then(() => setPlayerCarregado(true)).catch(() => setFalha(true));
  }, []);

  useEffect(() => {
    if (!playerCarregado) return;
    let ativo = true;
    let player: PlayerInstance | null = null;
    let pendente: SnapshotPosicao | null = null;

    const avisarFalha = () => {
      if (ativo) setFalha(true);
    };
    const enviar = (snapshot: SnapshotPosicao) => {
      if (!player) return;
      if (salvandoRef.current) {
        // Mantém somente o snapshot mais recente. Pause/pagehide nunca perde
        // posição por causa de uma gravação anterior em andamento.
        pendente = snapshot;
        return;
      }
      salvandoRef.current = true;
      ultimaGravacaoRef.current = Date.now();
      void fetch(`/api/materiais/${materialId}/video/progresso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
        keepalive: true,
      }).then((response) => {
        if (!response.ok) avisarFalha();
      }).catch(avisarFalha).finally(() => {
        salvandoRef.current = false;
        const proximo = pendente;
        pendente = null;
        if (proximo) enviar(proximo);
      });
    };
    const salvar = (forcar = false) => {
      if (!player) return;
      const playerAtual = player;
      if (!forcar && Date.now() - ultimaGravacaoRef.current < INTERVALO_POSICAO_MS) return;
      playerAtual.getCurrentTime((posicaoSegundos) => {
        playerAtual.getDuration((duracaoSegundos) => {
          if (!Number.isFinite(posicaoSegundos) || posicaoSegundos < 0 || !Number.isFinite(duracaoSegundos) || duracaoSegundos <= 0) {
            return;
          }
          enviar({ posicaoSegundos, duracaoSegundos });
        });
      });
    };
    const aoTimeupdate = () => salvar();
    const aoPause = () => salvar(true);
    const aoEnded = () => salvar(true);
    const aoPagehide = () => salvar(true);
    const aoVisibility = () => {
      if (document.visibilityState === "hidden") salvar(true);
    };
    const aoReady = () => {
      if (player && retomadaSegundos >= 5 && Number.isFinite(retomadaSegundos)) player.setCurrentTime(retomadaSegundos);
    };

    if (!playerJsPromise) return;
    void playerJsPromise.then((PlayerJs) => {
      if (!ativo || !iframeRef.current) return;
      player = new PlayerJs.Player(iframeRef.current);
      player.on("ready", aoReady);
      player.on("timeupdate", aoTimeupdate);
      player.on("pause", aoPause);
      player.on("ended", aoEnded);
    }).catch(avisarFalha);
    window.addEventListener("pagehide", aoPagehide);
    document.addEventListener("visibilitychange", aoVisibility);
    return () => {
      ativo = false;
      salvar(true);
      player?.off("ready", aoReady);
      player?.off("timeupdate", aoTimeupdate);
      player?.off("pause", aoPause);
      player?.off("ended", aoEnded);
      window.removeEventListener("pagehide", aoPagehide);
      document.removeEventListener("visibilitychange", aoVisibility);
    };
  }, [materialId, playerCarregado, retomadaSegundos]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-950 shadow-lg ring-1 ring-slate-900/10">
        {playerCarregado && <iframe ref={iframeRef} src={src} title="Player da videoaula" className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />}
      </div>
      {falha && <p role="status" className="text-sm text-slate-500">Não foi possível salvar a posição agora. A aula continua disponível.</p>}
    </div>
  );
}
