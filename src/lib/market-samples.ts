export type SampleAsset = {
  pair: string;
  symbol: string;
  quote: string;
  name: string;
  category: "Crypto" | "Forex";
  price: string;
  change: string;
  icon: string;
  color: string;
};

// Official coin logos are bundled locally in public/coins (sourced from CoinCap's free icon set).
const WEBP_LOGOS = new Set(["PEPE"]);
export function coinLogoUrl(symbol: string): string {
  return `/coins/${symbol.toLowerCase()}.${WEBP_LOGOS.has(symbol) ? "webp" : "png"}`;
}

// Country flags for forex base currencies, bundled locally in public/currencies.
export function currencyFlagUrl(currency: string): string {
  return `/currencies/${currency.toLowerCase()}.png`;
}

// Illustrative prices only. No market-data API is connected, so nothing here is live.
export const sampleAssets: SampleAsset[] = [
  { pair: "BTC/USDT", symbol: "BTC", quote: "USDT", name: "Bitcoin", category: "Crypto", price: "67,432.80", change: "+2.34%", icon: "₿", color: "bitcoin" },
  { pair: "ETH/USDT", symbol: "ETH", quote: "USDT", name: "Ethereum", category: "Crypto", price: "3,521.65", change: "+1.87%", icon: "Ξ", color: "ethereum" },
  { pair: "BNB/USDT", symbol: "BNB", quote: "USDT", name: "BNB", category: "Crypto", price: "604.28", change: "+0.96%", icon: "◆", color: "binance" },
  { pair: "SOL/USDT", symbol: "SOL", quote: "USDT", name: "Solana", category: "Crypto", price: "172.48", change: "−0.62%", icon: "≋", color: "solana" },
  { pair: "XRP/USDT", symbol: "XRP", quote: "USDT", name: "XRP", category: "Crypto", price: "0.5284", change: "+1.42%", icon: "✕", color: "ripple" },
  { pair: "ADA/USDT", symbol: "ADA", quote: "USDT", name: "Cardano", category: "Crypto", price: "0.4471", change: "−1.18%", icon: "₳", color: "cardano" },
  { pair: "DOGE/USDT", symbol: "DOGE", quote: "USDT", name: "Dogecoin", category: "Crypto", price: "0.1462", change: "+3.05%", icon: "Ð", color: "binance" },
  { pair: "TRX/USDT", symbol: "TRX", quote: "USDT", name: "TRON", category: "Crypto", price: "0.1248", change: "−0.34%", icon: "T", color: "tron" },
  { pair: "TON/USDT", symbol: "TON", quote: "USDT", name: "Toncoin", category: "Crypto", price: "5.8342", change: "+2.16%", icon: "◈", color: "ton" },
  { pair: "LINK/USDT", symbol: "LINK", quote: "USDT", name: "Chainlink", category: "Crypto", price: "16.4280", change: "+1.74%", icon: "⬡", color: "cardano" },
  { pair: "AVAX/USDT", symbol: "AVAX", quote: "USDT", name: "Avalanche", category: "Crypto", price: "36.1850", change: "−2.08%", icon: "▲", color: "tron" },
  { pair: "DOT/USDT", symbol: "DOT", quote: "USDT", name: "Polkadot", category: "Crypto", price: "6.8420", change: "+0.58%", icon: "●", color: "ethereum" },
  { pair: "LTC/USDT", symbol: "LTC", quote: "USDT", name: "Litecoin", category: "Crypto", price: "84.6200", change: "−0.86%", icon: "Ł", color: "ripple" },
  { pair: "BCH/USDT", symbol: "BCH", quote: "USDT", name: "Bitcoin Cash", category: "Crypto", price: "428.90", change: "+1.32%", icon: "Ƀ", color: "bitcoin" },
  { pair: "NEAR/USDT", symbol: "NEAR", quote: "USDT", name: "NEAR Protocol", category: "Crypto", price: "5.2140", change: "+4.12%", icon: "◐", color: "ripple" },
  { pair: "UNI/USDT", symbol: "UNI", quote: "USDT", name: "Uniswap", category: "Crypto", price: "9.8640", change: "−1.46%", icon: "U", color: "ethereum" },
  { pair: "APT/USDT", symbol: "APT", quote: "USDT", name: "Aptos", category: "Crypto", price: "8.4210", change: "+2.78%", icon: "◉", color: "solana" },
  { pair: "SUI/USDT", symbol: "SUI", quote: "USDT", name: "Sui", category: "Crypto", price: "1.4826", change: "+5.34%", icon: "◊", color: "ton" },
  { pair: "OP/USDT", symbol: "OP", quote: "USDT", name: "Optimism", category: "Crypto", price: "1.7342", change: "−3.22%", icon: "◗", color: "tron" },
  { pair: "ARB/USDT", symbol: "ARB", quote: "USDT", name: "Arbitrum", category: "Crypto", price: "0.8426", change: "+1.06%", icon: "◣", color: "cardano" },
  { pair: "ETC/USDT", symbol: "ETC", quote: "USDT", name: "Ethereum Classic", category: "Crypto", price: "26.8400", change: "−0.74%", icon: "✦", color: "verde" },
  { pair: "FIL/USDT", symbol: "FIL", quote: "USDT", name: "Filecoin", category: "Crypto", price: "4.6280", change: "+2.44%", icon: "⬢", color: "cardano" },
  { pair: "ATOM/USDT", symbol: "ATOM", quote: "USDT", name: "Cosmos Hub", category: "Crypto", price: "7.3160", change: "−1.92%", icon: "◍", color: "ripple" },
  { pair: "XLM/USDT", symbol: "XLM", quote: "USDT", name: "Stellar", category: "Crypto", price: "0.1048", change: "+0.88%", icon: "✶", color: "ripple" },
  { pair: "XMR/USDT", symbol: "XMR", quote: "USDT", name: "Monero", category: "Crypto", price: "158.4200", change: "+1.16%", icon: "M", color: "bitcoin" },
  { pair: "ICP/USDT", symbol: "ICP", quote: "USDT", name: "Internet Computer", category: "Crypto", price: "11.2460", change: "−2.66%", icon: "∞", color: "ton" },
  { pair: "AAVE/USDT", symbol: "AAVE", quote: "USDT", name: "Aave", category: "Crypto", price: "92.3800", change: "+3.86%", icon: "△", color: "ethereum" },
  { pair: "SHIB/USDT", symbol: "SHIB", quote: "USDT", name: "Shiba Inu", category: "Crypto", price: "0.00001842", change: "+6.24%", icon: "S", color: "bitcoin" },
  { pair: "PEPE/USDT", symbol: "PEPE", quote: "USDT", name: "Pepe", category: "Crypto", price: "0.00001126", change: "−4.18%", icon: "♣", color: "verde" },
  { pair: "USDC/USDT", symbol: "USDC", quote: "USDT", name: "USDC", category: "Crypto", price: "1.0001", change: "+0.01%", icon: "$", color: "ton" },
  { pair: "EUR/USD", symbol: "EUR", quote: "USD", name: "Euro / US Dollar", category: "Forex", price: "1.08425", change: "+0.24%", icon: "€", color: "forex" },
  { pair: "GBP/USD", symbol: "GBP", quote: "USD", name: "British Pound / US Dollar", category: "Forex", price: "1.27348", change: "+0.18%", icon: "£", color: "forex" },
  { pair: "USD/JPY", symbol: "USD", quote: "JPY", name: "US Dollar / Japanese Yen", category: "Forex", price: "151.624", change: "−0.32%", icon: "$", color: "forex" },
  { pair: "USD/CHF", symbol: "USD", quote: "CHF", name: "US Dollar / Swiss Franc", category: "Forex", price: "0.88462", change: "−0.14%", icon: "$", color: "forex" },
  { pair: "AUD/USD", symbol: "AUD", quote: "USD", name: "Australian Dollar / US Dollar", category: "Forex", price: "0.65842", change: "+0.42%", icon: "A", color: "forex" },
  { pair: "USD/CAD", symbol: "USD", quote: "CAD", name: "US Dollar / Canadian Dollar", category: "Forex", price: "1.37284", change: "−0.22%", icon: "$", color: "forex" },
  { pair: "NZD/USD", symbol: "NZD", quote: "USD", name: "New Zealand Dollar / US Dollar", category: "Forex", price: "0.59864", change: "+0.36%", icon: "N", color: "forex" },
  { pair: "EUR/GBP", symbol: "EUR", quote: "GBP", name: "Euro / British Pound", category: "Forex", price: "0.85142", change: "−0.08%", icon: "€", color: "forex" },
  { pair: "EUR/JPY", symbol: "EUR", quote: "JPY", name: "Euro / Japanese Yen", category: "Forex", price: "164.398", change: "+0.14%", icon: "€", color: "forex" },
  { pair: "GBP/JPY", symbol: "GBP", quote: "JPY", name: "British Pound / Japanese Yen", category: "Forex", price: "193.124", change: "+0.28%", icon: "£", color: "forex" },
  { pair: "EUR/CHF", symbol: "EUR", quote: "CHF", name: "Euro / Swiss Franc", category: "Forex", price: "0.95912", change: "+0.06%", icon: "€", color: "forex" },
  { pair: "AUD/JPY", symbol: "AUD", quote: "JPY", name: "Australian Dollar / Japanese Yen", category: "Forex", price: "99.712", change: "+0.52%", icon: "A", color: "forex" },
  { pair: "GBP/CHF", symbol: "GBP", quote: "CHF", name: "British Pound / Swiss Franc", category: "Forex", price: "1.12648", change: "+0.04%", icon: "£", color: "forex" },
  { pair: "EUR/AUD", symbol: "EUR", quote: "AUD", name: "Euro / Australian Dollar", category: "Forex", price: "1.64682", change: "−0.34%", icon: "€", color: "forex" },
  { pair: "USD/SGD", symbol: "USD", quote: "SGD", name: "US Dollar / Singapore Dollar", category: "Forex", price: "1.34826", change: "−0.12%", icon: "$", color: "forex" },
];

export function filterSampleAssets(category: string, query: string, watchlistOnly: boolean, watchlist: string[]) {
  const search = query.trim().toLowerCase().replace(/\s/g, "");
  return sampleAssets.filter(asset => asset.category === category &&
    (!watchlistOnly || watchlist.includes(asset.pair)) &&
    `${asset.pair} ${asset.name}`.toLowerCase().replace(/\s/g, "").includes(search));
}
