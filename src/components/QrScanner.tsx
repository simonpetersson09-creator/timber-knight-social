import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { useI18n } from "@/lib/i18n";

export function QrScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const { t } = useI18n();
  useEffect(() => {
    let alive = true;
    let controls: { stop: () => void } | undefined;
    void (async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (!alive || !video.current) return;
        controls = await new BrowserQRCodeReader().decodeFromVideoDevice(undefined, video.current, (result) => {
          if (!result || !alive) return;
          const text = result.getText();
          let code = text;
          try { const url = new URL(text); if (url.origin !== window.location.origin) return; code = url.searchParams.get("code") ?? ""; } catch { /* a plain code is also accepted */ }
          if (!/^[A-Z0-9]{6}$/i.test(code)) return;
          alive = false; controls?.stop(); onCode(code.toUpperCase());
        });
        if (!alive) controls.stop();
      } catch { if (alive) setFailed(true); }
    })();
    return () => { alive = false; controls?.stop(); };
  }, [onCode]);
  return <Modal open onClose={onClose}><h2 className="mb-4 text-center text-lg font-semibold">{t("scanQr")}</h2>{failed ? <p className="text-center text-destructive">{t("error")}</p> : <video ref={video} className="aspect-square w-full rounded-lg object-cover" playsInline muted />}</Modal>;
}