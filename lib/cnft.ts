/**
 * Compressed NFTs (Bubblegum v1). They live as leaves in a Merkle tree, not in
 * token accounts, so they hold no rent: burning one returns no SOL and costs
 * no service fee. It only removes the asset from the wallet.
 *
 * Finding and proving them needs an RPC with the DAS API (e.g. Helius). On an
 * RPC without it, cNFTs are simply not listed.
 */
import { type Connection, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";

export const BUBBLEGUM_PROGRAM_ID = new PublicKey("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");
export const SPL_COMPRESSION_PROGRAM_ID = new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK");
export const SPL_NOOP_PROGRAM_ID = new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");
/** sha256("global:burn")[0..8] */
const BURN_DISCRIMINATOR = [116, 110, 29, 56, 107, 219, 42, 93];

export interface CnftInfo {
  tree: string;
  leafId: number;
  dataHash: string;
  creatorHash: string;
  delegate: string | null;
  canopyDepth: number;
  /** Filled in at planning time from getAssetProof. */
  proof?: { root: string; nodes: string[] };
}

export interface CnftAsset {
  id: string;
  name: string;
  image: string | null;
  info: CnftInfo;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

async function das<T>(endpoint: string, method: string, params: unknown): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "solcleanup", method, params }),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!isRecord(json) || "error" in json || !("result" in json)) throw new Error(`${method} is not available on this RPC`);
  return json.result as T;
}

/**
 * Canopy depth from the tree account size (same formula as
 * spl-account-compression's getCanopyDepth). Proof nodes covered by the
 * canopy are stored on-chain and must not be sent.
 */
function canopyDepth(dataLength: number, data: Uint8Array): number | null {
  if (data[0] !== 1) return null; // not a ConcurrentMerkleTree account
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const maxBuffer = view.getUint32(2, true);
  const maxDepth = view.getUint32(6, true);
  const HEADER = 56;
  const changeLog = 40 + 32 * maxDepth;
  const path = 40 + 32 * maxDepth;
  const tree = 24 + maxBuffer * changeLog + path;
  const canopyBytes = dataLength - HEADER - tree;
  if (canopyBytes < 0) return null;
  const nodes = canopyBytes / 32;
  return nodes <= 0 ? 0 : Math.max(0, Math.log2(nodes + 2) - 1);
}

/**
 * Every burnable v1 cNFT the owner holds. Returns [] when the RPC has no DAS.
 * `preloaded` reuses compressed items from the scan's asset sweep.
 */
export async function fetchCnfts(connection: Connection, owner: string, preloaded?: unknown[]): Promise<CnftAsset[]> {
  const endpoint = connection.rpcEndpoint;
  const items: unknown[] = preloaded ? [...preloaded] : [];
  if (!preloaded) try {
    for (let page = 1; page <= 10; page++) {
      const r = await das<{ items?: unknown[] }>(endpoint, "getAssetsByOwner", { ownerAddress: owner, page, limit: 1000 });
      const batch = r.items ?? [];
      items.push(...batch);
      if (batch.length < 1000) break;
    }
  } catch {
    return [];
  }

  const raw = items.flatMap((it) => {
    if (!isRecord(it) || !isRecord(it.compression) || !isRecord(it.ownership)) return [];
    const c = it.compression;
    const own = it.ownership;
    if (c.compressed !== true || it.burnt === true || own.owner !== owner || own.frozen === true) return [];
    const content = isRecord(it.content) ? it.content : {};
    const meta = isRecord(content.metadata) ? content.metadata : {};
    const links = isRecord(content.links) ? content.links : {};
    return [
      {
        id: String(it.id),
        name: typeof meta.name === "string" ? meta.name : "",
        image: typeof links.image === "string" ? links.image : null,
        tree: String(c.tree),
        leafId: Number(c.leaf_id),
        dataHash: String(c.data_hash),
        creatorHash: String(c.creator_hash),
        delegate: typeof own.delegate === "string" ? own.delegate : null,
      },
    ];
  });
  if (raw.length === 0) return [];

  // Only trees owned by the v1 compression program, with a readable canopy.
  const trees = [...new Set(raw.map((r) => r.tree))];
  const canopy = new Map<string, number>();
  for (let i = 0; i < trees.length; i += 100) {
    const slice = trees.slice(i, i + 100);
    const infos = await connection.getMultipleAccountsInfo(slice.map((t) => new PublicKey(t)), "confirmed");
    infos.forEach((info, j) => {
      const t = slice[j];
      if (!info || !t || !info.owner.equals(SPL_COMPRESSION_PROGRAM_ID)) return;
      const d = canopyDepth(info.data.length, info.data);
      if (d !== null && Number.isInteger(d)) canopy.set(t, d);
    });
  }

  return raw.flatMap((r) => {
    const depth = canopy.get(r.tree);
    if (depth === undefined) return [];
    return [{ id: r.id, name: r.name, image: r.image, info: { tree: r.tree, leafId: r.leafId, dataHash: r.dataHash, creatorHash: r.creatorHash, delegate: r.delegate, canopyDepth: depth } }];
  });
}

/** Fresh proof for one asset, trimmed by the tree's canopy. */
export async function fetchCnftProof(connection: Connection, assetId: string, canopy: number): Promise<{ root: string; nodes: string[] }> {
  const r = await das<{ root: string; proof: string[] }>(connection.rpcEndpoint, "getAssetProof", { id: assetId });
  return { root: r.root, nodes: r.proof.slice(0, Math.max(0, r.proof.length - canopy)) };
}

/** Bubblegum v1 `burn`, signed by the leaf owner. */
export function createBurnCnftInstruction(owner: PublicKey, info: CnftInfo): TransactionInstruction {
  if (!info.proof) throw new Error("cNFT proof missing");
  const tree = new PublicKey(info.tree);
  const [treeAuthority] = PublicKey.findProgramAddressSync([tree.toBytes()], BUBBLEGUM_PROGRAM_ID);
  const data = new Uint8Array(8 + 32 * 3 + 8 + 4);
  data.set(BURN_DISCRIMINATOR, 0);
  data.set(new PublicKey(info.proof.root).toBytes(), 8);
  data.set(new PublicKey(info.dataHash).toBytes(), 40);
  data.set(new PublicKey(info.creatorHash).toBytes(), 72);
  const view = new DataView(data.buffer);
  view.setBigUint64(104, BigInt(info.leafId), true); // nonce
  view.setUint32(112, info.leafId, true); // index
  return new TransactionInstruction({
    programId: BUBBLEGUM_PROGRAM_ID,
    keys: [
      { pubkey: treeAuthority, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: info.delegate ? new PublicKey(info.delegate) : owner, isSigner: false, isWritable: false },
      { pubkey: tree, isSigner: false, isWritable: true },
      { pubkey: SPL_NOOP_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SPL_COMPRESSION_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ...info.proof.nodes.map((n) => ({ pubkey: new PublicKey(n), isSigner: false, isWritable: false })),
    ],
    data: Buffer.from(data),
  });
}
