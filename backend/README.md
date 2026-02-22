# Backend

This folder is a standalone backend scaffold for swap charge tracking.

## Run

```powershell
deno run --allow-net --allow-read --allow-write backend/server.ts
```

Default server URL:

- `http://127.0.0.1:8001`

## Endpoints

- `GET /health`
- `GET /charges`
- `GET /charges/summary`
- `POST /charges`

## Charge payload example

```json
{
  "txHash": "0x123...abc",
  "chain": "bsc",
  "wallet": "0xYourWallet",
  "tokenFrom": "BNB",
  "tokenTo": "PEPE",
  "amountFrom": 1.25,
  "amountTo": 50234.11,
  "feePercent": 0.5,
  "feeAmount": 0.00625,
  "feeUsd": 3.12,
  "status": "completed"
}
```
