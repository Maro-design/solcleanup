/**
 * /learn articles. Server-rendered, no client JS. Fee and limits come from
 * lib/config, rent figures from lib/content/rent (read from mainnet), so the
 * copy follows the product if either changes.
 */
import type { ReactNode } from "react";
import { FEE_BPS, FEE_PERCENT_LABEL, FEE_WALLET, MAX_CLOSES_PER_TX, TOKEN_2022_PROGRAM_ID, VALUE_THRESHOLD_USD, solscanAccount } from "@/lib/config";
import { H2, H3, L, Note, Pre, Prose, Table, X } from "@/components/learn/Prose";
import {
  ACCOUNT_OVERHEAD_BYTES,
  EXEMPTION_YEARS,
  LAMPORTS_PER_BYTE_YEAR,
  LEGACY_TOKEN_ACCOUNT_RENT,
  MINT_RENT,
  RENT_CHECKED,
  TOKEN_2022_ACCOUNT_RENT,
  TOKEN_ACCOUNT_RENT,
  lamportsLabel,
  sol,
} from "./rent";

export interface LearnArticle {
  slug: string;
  /** The page's H1. */
  title: string;
  /** <title>, before the " · SolCleanup" suffix. */
  metaTitle: string;
  description: string;
  /** One line for the /learn index. */
  summary: string;
  published: string;
  updated: string;
  body: () => ReactNode;
}

const BASE_FEE_LAMPORTS = 5_000;
const feeOn = (lamports: number, bps = FEE_BPS) => Math.floor((lamports * bps) / 10_000);
const pct = (bps: number) => `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
/** "higher than", "lower than" or "the same as", comparing our fee to another rate. */
const vs = (otherBps: number) => (FEE_BPS > otherBps ? "higher than" : FEE_BPS < otherBps ? "lower than" : "the same as");

const SOURCES = {
  rentDocs: "https://solana.com/docs/core/accounts",
  closeDocs: "https://solana.com/docs/tokens/basics/close-account",
  tokenDocs: "https://www.solana-program.com/docs/token",
  cliInstall: "https://docs.anza.xyz/cli/install",
  fees: "https://solana.com/docs/core/fees",
  incinerator: "https://sol-incinerator.com/",
  incineratorBlog: "https://sol-incinerator.com/blog/sol-incinerator-vs-refundyoursol",
  refund: "https://refundyoursol.com/",
  cysReview: "https://solanacompass.com/projects/claim-your-sol",
};

function Sources({ items }: { items: [string, string][] }) {
  return (
    <>
      <H2 id="sources">Sources</H2>
      <ul>
        {items.map(([label, href]) => (
          <li key={href}>
            <X href={href}>{label}</X>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ------------------------------------------------------------------------ */

function WhatIsRent() {
  return (
    <Prose>
      <p>
        Every account on Solana takes up space on every validator, so the network asks each account to hold a minimum balance of
        SOL for as long as it exists. That balance is called <strong>rent</strong>. A token account, the small account your wallet
        opens for each token you hold, is no exception: it keeps between about {sol(TOKEN_ACCOUNT_RENT, 4)} and{" "}
        {sol(LEGACY_TOKEN_ACCOUNT_RENT, 5)} SOL locked inside it, depending on when it was opened.
      </p>
      <p>The good news is that rent is a deposit, not a charge. Close the account and the whole balance comes back.</p>

      <H2 id="deposit">Rent is a deposit, not a fee</H2>
      <p>
        Solana once deducted rent from accounts that held less than the minimum. Today every new account has to be funded to the
        &quot;rent-exempt&quot; minimum when it is created, so nothing is ever taken from it. The SOL simply sits in the account. When
        the account is closed, its full balance is sent to an address its owner chooses, normally their own wallet.
      </p>
      <p>
        That&apos;s why the SOL is described as &quot;locked&quot; rather than spent. It is still yours; it&apos;s just parked in an
        account you may no longer need.
      </p>

      <H2 id="calculation">How the minimum is calculated</H2>
      <p>
        The minimum depends only on how many bytes the account stores. The network adds a fixed {ACCOUNT_OVERHEAD_BYTES} bytes of
        overhead, multiplies by a price per byte per year, and requires enough to cover a set number of years:
      </p>
      <Pre label="Rent-exempt minimum">{`minimum = (data bytes + ${ACCOUNT_OVERHEAD_BYTES}) × ${lamportsLabel(LAMPORTS_PER_BYTE_YEAR)} lamports × ${EXEMPTION_YEARS} year${EXEMPTION_YEARS === 1 ? "" : "s"}`}</Pre>
      <p>
        Those are mainnet&apos;s current parameters, read from the chain&apos;s Rent sysvar on {RENT_CHECKED}. One SOL is
        1,000,000,000 lamports. Applied to the accounts a wallet usually has:
      </p>
      <Table
        caption={`Rent-exempt minimums on mainnet, ${RENT_CHECKED}`}
        head={["Account", "Size", "Minimum"]}
        rows={[
          ["SPL token account", "165 bytes", `${lamportsLabel(TOKEN_ACCOUNT_RENT)} lamports (${sol(TOKEN_ACCOUNT_RENT)} SOL)`],
          ["Token-2022 associated account", "170 bytes", `${lamportsLabel(TOKEN_2022_ACCOUNT_RENT)} lamports (${sol(TOKEN_2022_ACCOUNT_RENT)} SOL)`],
          ["Token mint", "82 bytes", `${lamportsLabel(MINT_RENT)} lamports (${sol(MINT_RENT)} SOL)`],
        ]}
      />
      <p>
        Token-2022 accounts are slightly larger because they carry extensions; an associated Token-2022 account always includes
        one that stops its owner from being changed. Accounts with more extensions, such as transfer fees, are larger again.
      </p>
      <H3 id="older-accounts">Older accounts hold more</H3>
      <p>
        The rate has been lowered before. Token accounts opened under the earlier parameters were funded with{" "}
        {lamportsLabel(LEGACY_TOKEN_ACCOUNT_RENT)} lamports ({sol(LEGACY_TOKEN_ACCOUNT_RENT)} SOL), and they still hold exactly that:
        a lower rate applies to new accounts and never touches an existing balance. When an account closes, you get back what it
        actually holds, so a wallet that has been around for a while often returns more per account than a new one.
      </p>
      <Note>
        To see the live figure for any size, run <code>solana rent 165</code> with the Solana CLI, or call{" "}
        <code>getMinimumBalanceForRentExemption</code> on any RPC.
      </Note>

      <H2 id="why-so-many">Why a wallet ends up with so many token accounts</H2>
      <p>
        Your wallet can&apos;t hold tokens directly. For each token it holds, there is a separate token account, usually an{" "}
        <strong>associated token account</strong> whose address is derived from your wallet and the token&apos;s mint. It&apos;s opened
        the first time you receive or buy that token, and whoever opens it pays the rent. When you swap, that&apos;s normally you.
      </p>
      <p>Three things then leave accounts behind:</p>
      <ul>
        <li>
          <strong>Selling everything.</strong> A balance of zero doesn&apos;t close the account. It stays open, rent and all.
        </li>
        <li>
          <strong>Airdrops and spam.</strong> Anyone can send you a token, which opens an account in your name. The sender paid the
          rent, but the account is yours, so the rent goes to you when you close it.
        </li>
        <li>
          <strong>Leftover dust.</strong> Tiny balances worth less than a cent keep an account open even though nobody would miss
          them.
        </li>
      </ul>
      <p>
        Active traders easily collect hundreds of these. At {sol(TOKEN_ACCOUNT_RENT, 4)} to {sol(LEGACY_TOKEN_ACCOUNT_RENT, 5)} SOL
        each, that adds up.
      </p>

      <H2 id="closing">What closing an account does</H2>
      <p>
        Closing is a single instruction to the token program. The account&apos;s owner, or a separate close authority if one was set,
        signs it and names where the lamports go. The token balance must be exactly zero first; a leftover balance has to be burned
        or sent away. A few accounts can&apos;t be closed at all: frozen ones, and Token-2022 accounts still holding withheld transfer
        fees or a confidential balance.
      </p>
      <p>
        Closing an empty account doesn&apos;t touch the token itself or anyone else&apos;s balance. If you receive that token again later,
        a new account is simply opened, with new rent.
      </p>

      <H2 id="get-it-back">Getting your rent back</H2>
      <p>
        You can close accounts yourself from the command line, or use a tool that finds and batches them for you. The{" "}
        <L href="/learn/close-empty-token-accounts">step-by-step guide</L> compares both honestly. To see how much is waiting in a
        wallet before deciding, <L href="/check">check any address</L>: it&apos;s read-only and takes seconds.
      </p>

      <Sources
        items={[
          ["Solana docs: Accounts and rent", SOURCES.rentDocs],
          ["Solana docs: Close a token account", SOURCES.closeDocs],
          ["Solana Program Library: Token program", SOURCES.tokenDocs],
        ]}
      />
    </Prose>
  );
}

/* ------------------------------------------------------------------------ */

function CloseAccounts() {
  const viaCli = MAX_CLOSES_PER_TX * BASE_FEE_LAMPORTS;
  return (
    <Prose>
      <p>
        Every empty token account in your wallet holds a few thousandths of a SOL that you can get back by closing it. There are
        two ways to do that: run the commands yourself with Solana&apos;s command-line tools, or use a cleanup tool like SolCleanup.
        Both end with the same instruction on-chain. They differ in cost, speed and how much you have to know.
      </p>

      <H2 id="before">Before you start</H2>
      <p>An account can be closed when all of this is true:</p>
      <ul>
        <li>Its token balance is exactly zero. Anything left has to be burned or sent away first.</li>
        <li>You are its owner, or its close authority. Accounts where someone else holds that authority can&apos;t be closed by you.</li>
        <li>It isn&apos;t frozen, and for Token-2022, it holds no withheld transfer fees or confidential balance.</li>
      </ul>
      <p>
        Closing is permanent, but it only removes the empty container. The token, and your ability to receive it again, are
        unaffected.
      </p>

      <H2 id="cli">Method 1: the Solana command line</H2>
      <p>
        Solana&apos;s own tools can do all of this for free, apart from network fees. You need the{" "}
        <X href={SOURCES.cliInstall}>Solana CLI</X> and the <code>spl-token</code> CLI installed, and your wallet available as a
        keypair file or a hardware wallet.
      </p>
      <H3 id="cli-setup">1. Point the CLI at mainnet and your wallet</H3>
      <Pre label="Terminal">{`solana config set --url https://api.mainnet-beta.solana.com
solana config set --keypair ~/my-wallet.json   # or usb://ledger for a Ledger`}</Pre>
      <H3 id="cli-list">2. List your token accounts</H3>
      <Pre label="Terminal">{`spl-token accounts
spl-token accounts --program-id ${TOKEN_2022_PROGRAM_ID}`}</Pre>
      <p>
        The first command lists accounts under the original token program, the second under Token-2022. Accounts showing a
        balance of 0 are the ones you can close straight away.
      </p>
      <H3 id="cli-close">3. Close them, one at a time</H3>
      <Pre label="Terminal">{`spl-token close <TOKEN_MINT_ADDRESS>
spl-token close --address <TOKEN_ACCOUNT_ADDRESS>`}</Pre>
      <p>
        The first form closes your associated account for that token; the second closes a specific account by its address. The
        rent goes back to your wallet. For a small leftover balance, burn it first with{" "}
        <code>spl-token burn &lt;TOKEN_ACCOUNT_ADDRESS&gt; &lt;AMOUNT&gt;</code>, then close.
      </p>
      <p>
        The Token program docs also mention a <code>spl-token gc</code> command as an example of cleaning up unneeded accounts.
        Flags change between versions, so check <code>spl-token close --help</code> and <code>spl-token gc --help</code> on your
        install before relying on either.
      </p>
      <H3 id="cli-cost">What the CLI costs</H3>
      <p>
        No service fee at all. Each transaction pays Solana&apos;s base fee of {lamportsLabel(BASE_FEE_LAMPORTS)} lamports per
        signature, plus any priority fee you add. Closing one account per command means {MAX_CLOSES_PER_TX} accounts cost{" "}
        {lamportsLabel(viaCli)} lamports in base fees, against an average of about {sol(TOKEN_ACCOUNT_RENT, 4)} SOL returned per
        account.
      </p>
      <p>
        The real costs are time and care. You have to decide for yourself which accounts are safe to close, recognise LP and
        staking tokens, and keep a keypair on a machine with a terminal. For a handful of accounts that&apos;s fine. For hundreds,
        it&apos;s an afternoon.
      </p>

      <H2 id="tool">Method 2: a cleanup tool</H2>
      <p>
        A tool does the same thing from the browser, with your normal wallet. Here is what SolCleanup does, so you can compare:
      </p>
      <ul>
        <li>
          <strong>Finds everything.</strong> It reads every account you own under both token programs and marks which are empty.
        </li>
        <li>
          <strong>Protects by default.</strong> Only empty accounts are selected. NFTs, LP and staking tokens, anything worth $
          {VALUE_THRESHOLD_USD} or more, and unusual accounts are never picked for you.
        </li>
        <li>
          <strong>Batches.</strong> Up to {MAX_CLOSES_PER_TX} accounts close in one transaction, and one approval covers them all.
        </li>
        <li>
          <strong>Checks first.</strong> Selected accounts are read again just before signing, and every transaction is simulated
          on the live chain before your wallet sees it.
        </li>
        <li>
          <strong>Charges {FEE_PERCENT_LABEL}.</strong> A fee of {FEE_PERCENT_LABEL} of the rent each transaction returns is paid
          inside that same transaction, so it&apos;s only paid if the closes succeed.
        </li>
      </ul>
      <p>
        It never sees your keys: transactions are built in your browser and signed by your wallet. The details are in the{" "}
        <L href="/docs">docs</L> and the <L href="/safety">safety rules</L>.
      </p>

      <H2 id="compare">Side by side</H2>
      <Table
        head={["", "Command line", "SolCleanup"]}
        rows={[
          ["Service fee", "None", `${FEE_PERCENT_LABEL} of rent returned`],
          ["Network fee", `${lamportsLabel(BASE_FEE_LAMPORTS)} lamports per account`, `${lamportsLabel(BASE_FEE_LAMPORTS)} lamports per ${MAX_CLOSES_PER_TX} accounts, plus a priority fee`],
          ["Where your key is", "Keypair file or hardware wallet", "Your browser wallet"],
          ["Choosing what's safe", "You", "Rules in code, then you review"],
          ["Dust and NFTs", "Burn by hand", "Optional, confirmed by name"],
        ]}
      />

      <H2 id="which">Which should you use?</H2>
      <p>
        If you&apos;re comfortable in a terminal and have a few accounts, the command line is the cheapest way, and there&apos;s no reason
        to pay anyone. If you have dozens or hundreds, use a phone or browser wallet, or want the safety checks done for you, a tool
        saves real time. Tools also don&apos;t all charge the same; the <L href="/learn/solana-wallet-cleanup-fees">fee comparison</L>{" "}
        shows where SolCleanup sits, including where others are cheaper.
      </p>
      <p>
        Either way, start by seeing what&apos;s there. <L href="/check">Check your wallet</L> without connecting anything, then{" "}
        <L href="/app">open the app</L> if you want to close them.
      </p>

      <Sources
        items={[
          ["Solana docs: Close a token account", SOURCES.closeDocs],
          ["Solana Program Library: Token program and CLI", SOURCES.tokenDocs],
          ["Anza docs: Install the Solana CLI", SOURCES.cliInstall],
          ["Solana docs: Fees", SOURCES.fees],
        ]}
      />
    </Prose>
  );
}

/* ------------------------------------------------------------------------ */

function HowMuchLocked() {
  const counts = [10, 50, 100, 500];
  const net = TOKEN_ACCOUNT_RENT - feeOn(TOKEN_ACCOUNT_RENT);
  const netLegacy = LEGACY_TOKEN_ACCOUNT_RENT - feeOn(LEGACY_TOKEN_ACCOUNT_RENT);
  return (
    <Prose>
      <p>
        The short answer: count the empty token accounts in your wallet and multiply. Each one opened today holds{" "}
        {sol(TOKEN_ACCOUNT_RENT)} SOL; older ones hold {sol(LEGACY_TOKEN_ACCOUNT_RENT)} SOL. That SOL is yours, it just isn&apos;t
        in your balance until the accounts are closed.
      </p>

      <H2 id="estimate">A quick estimate</H2>
      <Table
        caption="SOL held by empty SPL token accounts"
        head={["Empty accounts", "Opened today", "Opened under the earlier rate"]}
        rows={counts.map((n) => [n.toLocaleString("en-US"), `${sol(n * TOKEN_ACCOUNT_RENT, 4)} SOL`, `${sol(n * LEGACY_TOKEN_ACCOUNT_RENT, 4)} SOL`])}
      />
      <p>
        Most wallets hold a mix of the two. Token-2022 accounts hold slightly more ({sol(TOKEN_2022_ACCOUNT_RENT)} SOL for a
        standard associated account). Why the amounts differ is covered in <L href="/learn/what-is-solana-rent">what Solana rent
        is</L>.
      </p>

      <H2 id="where">Where the SOL actually sits</H2>
      <H3 id="empty">Empty token accounts</H3>
      <p>
        Accounts with a zero balance, usually left behind after selling everything. These are reclaimable right away and are
        almost always most of the total.
      </p>
      <H3 id="dust">Accounts with dust</H3>
      <p>
        Accounts with a tiny balance hold the same rent, but the balance has to be burned before the account can close. Whether
        that&apos;s worth it is your call: you give up the dust to get the rent.
      </p>
      <H3 id="nfts">NFTs</H3>
      <p>
        A regular NFT also has a metadata account and an edition account, each holding its own rent. Burning the NFT closes all of
        them, so it returns noticeably more than a token account, often around 0.01 SOL depending on the metadata size. Only burn
        NFTs you are sure you don&apos;t want.
      </p>
      <H3 id="cnfts">Compressed NFTs</H3>
      <p>
        Compressed NFTs don&apos;t have their own accounts, so they hold no rent. Burning one tidies the wallet but returns no SOL.
      </p>
      <H3 id="other">Other programs&apos; accounts</H3>
      <p>
        Stake accounts and accounts opened by other apps, such as old exchange order accounts, hold rent too. Closing them depends
        on each program, and SolCleanup doesn&apos;t touch them.
      </p>

      <H2 id="check">Check any wallet in seconds</H2>
      <p>
        The fastest way to get an exact number is to <L href="/check">paste an address into the wallet check</L>. It reads the
        wallet&apos;s token accounts and shows how much SOL is in empty ones, how many hold dust and how many are protected. It&apos;s
        read-only: nothing to connect and nothing to sign, and you can check any public address, not just your own. Each result
        has its own link you can share.
      </p>
      <p>
        If you prefer the command line, <code>spl-token accounts</code> lists every account and its balance; add{" "}
        <code>--program-id {TOKEN_2022_PROGRAM_ID}</code> for Token-2022. Count the zeros and multiply.
      </p>

      <H2 id="receive">What you&apos;d actually receive</H2>
      <p>
        Closing returns each account&apos;s full balance to you. What you keep depends on how you close them. Doing it yourself costs
        only network fees. Through SolCleanup, a {FEE_PERCENT_LABEL} fee is taken from the rent inside the same transaction, so a
        standard account opened today returns {sol(net)} SOL and an older one {sol(netLegacy)} SOL, before network fees. The exact
        amount is always shown before you sign. The <L href="/learn/solana-wallet-cleanup-fees">fee comparison</L> covers the
        alternatives.
      </p>

      <H2 id="differs">Why a scan can differ from your estimate</H2>
      <p>
        Counting zeros gets you close, but a real scan usually lands on a slightly different number, for a few honest reasons:
      </p>
      <ul>
        <li>
          <strong>Mixed account ages.</strong> Accounts opened under the earlier rate hold about a third more than new ones, so
          two wallets with the same count can hold different amounts.
        </li>
        <li>
          <strong>Accounts that look empty but can&apos;t be closed.</strong> A frozen account, or one where another wallet holds the
          close authority, may show a zero balance and still be impossible for you to close.
        </li>
        <li>
          <strong>Accounts that are better left alone.</strong> An empty account for an LP or liquid staking token is usually
          harmless to close, but SolCleanup keeps those out of the default selection so nothing unusual is closed without you
          looking at it first.
        </li>
        <li>
          <strong>Token-2022 extras.</strong> Accounts holding withheld transfer fees have to be cleared by the token&apos;s own
          authority before they can close.
        </li>
      </ul>
      <p>
        The wallet check shows those separately, so the headline number is only what can actually be reclaimed today.
      </p>

      <H2 id="worth-it">Is it worth cleaning up?</H2>
      <p>
        For a handful of accounts, the amount is small, and doing nothing costs you nothing. The calculation changes with volume:
        once a wallet has dozens or hundreds of empty accounts, the rent is a real amount of SOL that isn&apos;t earning or doing
        anything. Closing accounts also makes a wallet easier to read, since the token list stops filling up with things you sold
        long ago. Accounts can always be opened again if you buy the token later.
      </p>

      <H2 id="adds-up">Why it adds up</H2>
      <p>
        Every new token you buy or receive opens another account, and selling never closes it. A wallet that has traded actively
        for a year can hold hundreds, which is a noticeable amount of SOL doing nothing. Cleaning up once in a while is the
        simplest way to keep it.
      </p>
      <p>
        <L href="/check">Check a wallet now</L>, or <L href="/app">connect yours</L> to close what&apos;s there.
      </p>
    </Prose>
  );
}

/* ------------------------------------------------------------------------ */

function Fees() {
  const r100 = 100 * TOKEN_ACCOUNT_RENT;
  const ours = feeOn(TOKEN_ACCOUNT_RENT);
  // Reference rates plus ours, sorted; a reference rate equal to ours is folded into our row.
  const reference: [string, number][] = [200, 500, 1500].filter((bps) => bps !== FEE_BPS).map((bps) => [pct(bps), bps]);
  const rates: [string, number][] = [...reference, [`${FEE_PERCENT_LABEL} (SolCleanup)`, FEE_BPS]];
  rates.sort((a, b) => a[1] - b[1]);
  return (
    <Prose>
      <p>
        Closing empty token accounts gives you back the SOL rent they hold. What it costs depends on how you do it. There are two
        parts: Solana&apos;s network fee, which everyone pays, and a service fee, which only tools charge. This page lays out both,
        with SolCleanup&apos;s fee next to others&apos;, including the ones that are cheaper.
      </p>

      <H2 id="network">The network fee</H2>
      <p>
        Every Solana transaction pays a base fee of {lamportsLabel(BASE_FEE_LAMPORTS)} lamports per signature, plus an optional
        priority fee that helps it land when the network is busy. Closing accounts one per transaction, as the command line does,
        pays that base fee once per account. Batching many closes into one transaction pays it once per batch. SolCleanup closes
        up to {MAX_CLOSES_PER_TX} accounts per transaction and shows the estimated network fee before you sign.
      </p>

      <H2 id="ours">SolCleanup&apos;s fee</H2>
      <p>
        SolCleanup charges <strong>{FEE_PERCENT_LABEL} of the rent each transaction returns</strong>, rounded down to the lamport.
        It&apos;s a SOL transfer inside the same transaction as the closes, so it can only be paid if they succeed; a failed
        transaction costs no service fee. For a standard account opened today that&apos;s {lamportsLabel(ours)} lamports of the{" "}
        {lamportsLabel(TOKEN_ACCOUNT_RENT)} it returns. Burning compressed NFTs returns no rent, so it carries no service fee.
      </p>
      <p>
        If you arrived through someone&apos;s referral link, part of that same fee goes to them. You pay exactly the same amount
        either way. The fee wallet is public: <X href={solscanAccount(FEE_WALLET)}>view it on Solscan</X>.
      </p>

      <H2 id="others">How other options charge</H2>
      <p>
        These figures were checked on {RENT_CHECKED} from each service&apos;s own site where possible. Fees change, so confirm in
        the tool before you sign.
      </p>
      <Table
        head={["Option", "Service fee", "Source"]}
        rows={[
          ["Command line (spl-token)", "None; network fees only", <X key="t" href={SOURCES.tokenDocs}>Token program docs</X>],
          ["Sol Incinerator", "About 0.00004 SOL per standard account; its blog states a 2% base recovery fee", <X key="i" href={SOURCES.incinerator}>sol-incinerator.com</X>],
          ["ClaimYourSol", "5%, falling to 1% on the first day of each month (20% until May 2026)", <X key="c" href={SOURCES.cysReview}>Solana Compass review</X>],
          ["RefundYourSOL", "Starting at 15%, matchable down to 2%", <X key="r" href={SOURCES.refund}>refundyoursol.com</X>],
          ["SolCleanup", `${FEE_PERCENT_LABEL} of rent returned`, <L key="s" href="/docs">SolCleanup docs</L>],
        ]}
      />
      <p>
        Put plainly: SolCleanup&apos;s {FEE_PERCENT_LABEL} is {vs(200)} Sol Incinerator&apos;s roughly 2%, {vs(500)} ClaimYourSol&apos;s
        standard 5%, and {vs(1500)} RefundYourSOL&apos;s 15% starting rate. The command line is free apart from network fees. The
        ClaimYourSol figure comes from a third-party review, not the service&apos;s own page.
      </p>

      <H2 id="in-sol">What a percentage means in SOL</H2>
      <p>
        Percentages of a small number are small numbers. For 100 empty accounts opened today, holding{" "}
        {sol(r100, 4)} SOL in rent:
      </p>
      <Table
        caption="Service fee on 100 standard accounts"
        head={["Fee rate", "Fee", "You keep, before network fees"]}
        rows={rates.map(([label, bps]) => [label, `${sol(feeOn(r100, bps), 5)} SOL`, `${sol(r100 - feeOn(r100, bps), 5)} SOL`])}
      />

      <H2 id="burns">Fees on dust and NFT burns</H2>
      <p>
        Some tools price burning differently from closing. SolCleanup doesn&apos;t: the {FEE_PERCENT_LABEL} applies to the rent a
        transaction returns, whatever the account held. Burning dust before closing adds no extra charge beyond the rent fee on
        that account. Burning an NFT returns the rent of its token, metadata and edition accounts, and the same percentage
        applies to that total. Burning a compressed NFT returns nothing and costs nothing. Whatever you choose, every burn is
        named and confirmed by you before your wallet opens.
      </p>

      <H2 id="verify">How to verify any tool&apos;s fee</H2>
      <p>
        You don&apos;t have to take anyone&apos;s word for it, ours included. After a claim, open the transaction on a block explorer
        such as Solscan and look at its SOL transfers. Rent arrives in your wallet from each closed account; the service fee is a
        transfer from your wallet to someone else&apos;s. Before signing, your wallet&apos;s simulation should show the same thing.
      </p>

      <H2 id="beyond-price">Beyond the price</H2>
      <p>
        Price isn&apos;t the only difference. Before choosing, it&apos;s worth asking of any tool:
      </p>
      <ul>
        <li>Is it non-custodial: do you sign in your own wallet, and does it never ask for a seed phrase?</li>
        <li>What does it select by default, and does it protect NFTs, LP tokens and anything with value?</li>
        <li>Does it simulate transactions before you sign, and show the fee up front?</li>
        <li>Is the fee taken in the same transaction, so a failed close costs you nothing?</li>
      </ul>
      <p>
        SolCleanup&apos;s answers are in its <L href="/safety">safety rules</L>. If the lowest fee is all that matters to you, another
        tool or the command line may suit you better, and that&apos;s fine. If you want to see the numbers first,{" "}
        <L href="/check">check any wallet</L> for free.
      </p>

      <Sources
        items={[
          ["Solana docs: Fees", SOURCES.fees],
          ["Solana Program Library: Token program", SOURCES.tokenDocs],
          ["Sol Incinerator: site FAQ", SOURCES.incinerator],
          ["Sol Incinerator: vs RefundYourSOL (fee statement)", SOURCES.incineratorBlog],
          ["RefundYourSOL: site", SOURCES.refund],
          ["Solana Compass: Claim Your Sol review", SOURCES.cysReview],
        ]}
      />
    </Prose>
  );
}

/* ------------------------------------------------------------------------ */

export const LEARN_ARTICLES: LearnArticle[] = [
  {
    slug: "what-is-solana-rent",
    title: "What is Solana rent, and why does every token account lock SOL?",
    metaTitle: "What is Solana rent? Why token accounts lock SOL",
    description:
      "Why every Solana token account holds a SOL deposit, how the rent-exempt minimum is calculated, why older accounts hold more, and how to get the SOL back.",
    summary: "Why every token account holds a SOL deposit, how the minimum is calculated, and why older accounts hold more.",
    published: "2026-11-18",
    updated: "2026-11-18",
    body: WhatIsRent,
  },
  {
    slug: "close-empty-token-accounts",
    title: "How to close empty Solana token accounts: the command line vs a tool",
    metaTitle: "How to close empty Solana token accounts",
    description:
      "Close empty Solana token accounts and get the rent back: the free spl-token command-line method step by step, a cleanup tool, and an honest comparison.",
    summary: "The free spl-token method step by step, what a cleanup tool adds, and an honest side-by-side.",
    published: "2026-11-18",
    updated: "2026-11-18",
    body: CloseAccounts,
  },
  {
    slug: "how-much-sol-is-locked-in-my-wallet",
    title: "How much SOL is locked in my wallet?",
    metaTitle: "How much SOL is locked in my wallet?",
    description:
      "Estimate the SOL locked in your wallet's empty token accounts, see where else rent sits (dust, NFTs, cNFTs), and check any address for free in seconds.",
    summary: "A quick estimate, where the SOL actually sits, and how to check any wallet in seconds.",
    published: "2026-11-18",
    updated: "2026-11-18",
    body: HowMuchLocked,
  },
  {
    slug: "solana-wallet-cleanup-fees",
    title: "Solana wallet cleanup fees, compared honestly",
    metaTitle: "Solana wallet cleanup fees compared",
    description: `What it costs to reclaim SOL rent: network fees, SolCleanup's ${FEE_PERCENT_LABEL} fee and other tools' published rates, including the cheaper ones, with sources.`,
    summary: "Network fees, SolCleanup's fee and other tools' published rates, including the cheaper ones.",
    published: "2026-11-18",
    updated: "2026-11-18",
    body: Fees,
  },
];

export const learnArticle = (slug: string) => LEARN_ARTICLES.find((a) => a.slug === slug);
