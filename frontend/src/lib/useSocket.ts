import { useEffect, useRef, useState } from "react";
import { getToken } from "./api";

export type SocketEvent = { t: string; [k: string]: any };

export function useSocket(onEvent?: (e: SocketEvent) => void) {
  const [online, setOnline] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    const tk = getToken();
    if (!tk) return;
    let ws: WebSocket | null = null;
    let dead = false;
    let retry = 0;
    let timer: any = null;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const schedule = () => {
      if (dead) return;
      retry = Math.min(retry + 1, 6);
      timer = setTimeout(connect, 1000 * retry);
    };
    const connect = () => {
      if (dead) return;
      try {
        ws = new WebSocket(`${proto}://${window.location.host}/api/ws?token=${encodeURIComponent(tk)}`);
      } catch {
        schedule();
        return;
      }
      wsRef.current = ws;
      ws.onopen = () => {
        setConnected(true);
        retry = 0;
        try {
          ws!.send(JSON.stringify({ t: "ping" }));
        } catch {}
      };
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (d.t === "presence") setOnline(d.online || []);
          cbRef.current?.(d);
        } catch {}
      };
      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        schedule();
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {}
      };
    };
    connect();
    const ping = setInterval(() => {
      try {
        wsRef.current?.send(JSON.stringify({ t: "ping" }));
      } catch {}
    }, 25000);
    return () => {
      dead = true;
      clearTimeout(timer);
      clearInterval(ping);
      try {
        ws?.close();
      } catch {}
    };
  }, []);

  const send = (obj: any) => {
    try {
      wsRef.current?.send(JSON.stringify(obj));
    } catch {}
  };
  return { online, connected, send };
}
