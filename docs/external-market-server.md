# Local market server contract

The browser connects directly to `http://localhost:5000` by default. Override it with the public, non-secret build setting `VITE_MARKET_SERVER_URL`. The Lovable preview cannot reach a server on another computer; a public HTTPS endpoint is required for reliable hosted access. Local browser access also depends on CORS, mixed-content and local-network browser restrictions.

## Public reads

`GET /api/coins` returns an array (or `{ "coins": [...] }`):

```json
[{ "symbol": "DAFT", "name": "DaftCoin", "price": 1.25, "change24h": 2.4, "trend": "up", "updatedAt": "2026-10-11T17:37:00Z" }]
```

Socket.io on the same origin emits `marketUpdate` with one coin or an array of coins, using the same shape. Symbols may be `BTC`, `BTCUSDT` or `BTC/USDT`. Optional `bid` and `ask` must be positive. `change24h` (or `change`) is a percentage, not a fraction. Missing change and bid/ask stay unavailable. Omitted timestamp means receipt time. Send a timestamped marketUpdate at least every 45 seconds per coin to keep it fresh. DAFT is always a simulated asset, not an exchange listing.

## Admin writes

`POST /api/admin/control-coin`

```json
{ "symbol": "DAFT", "price": 1.25, "trend": "up" }
```

The browser sends the signed-in Lovable Cloud user access token in `Authorization: Bearer …`. **The Node server must independently validate it with the project's Auth service and check the protected user_roles table for admin membership.** Never trust UI gating, a supplied owner ID, client metadata or a role flag. Reject missing/invalid/non-admin tokens with 401/403; restrict this action to DAFT and a finite positive price <= 1,000,000. Audit the validated user subject on the server. CORS must explicitly allow the frontend origin, Content-Type and Authorization, including OPTIONS; Socket.io also needs that allowed origin. No credentials or private keys belong in the frontend.

Return 2xx only after the update is persisted and broadcast the authoritative `marketUpdate`. The frontend does not optimistically fabricate prices. Existing Cloud price-write functions are not used by this external action.

Trades still use the existing local test account. No real trading, balance transfer, external order endpoint, or DAFT candle endpoint has been added. Standard crypto candles remain Binance; forex remains Twelve Data. External authenticated end-to-end authorization is unverified until the user's server implements this contract and is reachable.
