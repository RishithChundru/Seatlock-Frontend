"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** QR of the ticket code, scanned at the gate (Admin → Check-in). Rendered as a data-URL image, no raw HTML. */
export default function TicketQr({ code, size = 112 }: { code: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // Dark modules on white regardless of theme: scanners need the contrast.
    QRCode.toDataURL(code, { width: size * 2, margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1b18", light: "#ffffff" } })
      .then((url) => { if (alive) setSrc(url); })
      .catch(() => { if (alive) setSrc(null); });
    return () => { alive = false; };
  }, [code, size]);

  return (
    <div className="rounded-md bg-white p-1.5 ring-1 ring-line" style={{ width: size + 12, height: size + 12 }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- generated data URL, nothing for next/image to optimise
        <img src={src} width={size} height={size} alt={`QR code for ticket ${code}`} />
      )}
    </div>
  );
}
