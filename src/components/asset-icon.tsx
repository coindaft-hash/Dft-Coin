import daftLogo from "@/assets/daftcoin.png";
import { useState } from "react";
import { coinLogoUrl, currencyFlagUrl } from "@/lib/market-samples";

type IconAsset = { symbol: string; category?: string; icon: string; color: string };

// Real coin logo for crypto, country flag for forex; falls back to the glyph if the image is missing.
export function AssetIcon({ asset }: { asset: IconAsset }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span aria-hidden="true" className={`coin-icon coin-${asset.color}`}>{asset.icon}</span>;
  }
  const src = asset.symbol === "DAFT" ? daftLogo : asset.category === "Forex" ? currencyFlagUrl(asset.symbol) : coinLogoUrl(asset.symbol);
  return (
    <img
      aria-hidden="true"
      className="coin-icon coin-logo"
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
