This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Copy the example env file first:

```bash
cp .env.example .env.local
```

The interface ships with the current Rootstock testnet factory baked in:

```bash
0xf3e5fe303E01546a6Cc04380e18288ce6D30E002
```

For network overrides:

```bash
NEXT_PUBLIC_FACTORY_ADDRESS_TESTNET=0x...
NEXT_PUBLIC_FACTORY_ADDRESS_MAINNET=0x...
NEXT_PUBLIC_ROOTSTOCK_LOGS_RPC_URL_TESTNET=https://your-testnet-logs-rpc
NEXT_PUBLIC_ROOTSTOCK_LOGS_RPC_URL_MAINNET=https://your-mainnet-logs-rpc
NEXT_PUBLIC_HEARTBEAT_SUBGRAPH_URL_TESTNET=https://your-testnet-subgraph
NEXT_PUBLIC_HEARTBEAT_SUBGRAPH_URL_MAINNET=https://your-mainnet-subgraph
```

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
