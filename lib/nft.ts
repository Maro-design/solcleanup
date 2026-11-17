/**
 * Metaplex NFTs held in SPL token accounts.
 *
 * Burning an NFT with Token Metadata's BurnV1 closes the token account, the
 * metadata account and the edition account (plus the token record for
 * programmable NFTs), and their rent goes back to the owner. That is why an
 * NFT returns more SOL than a plain token account.
 *
 * Supported: NonFungible (incl. legacy NFTs with no token standard) and
 * ProgrammableNonFungible. Print editions fall back to a plain SPL burn.
 */
import {
  type Connection,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "./config";

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const PROGRAM = TOKEN_METADATA_PROGRAM_ID;
const enc = new TextEncoder();

/** Token standards from Token Metadata. */
export const TokenStandard = {
  NonFungible: 0,
  FungibleAsset: 1,
  Fungible: 2,
  NonFungibleEdition: 3,
  ProgrammableNonFungible: 4,
  ProgrammableNonFungibleEdition: 5,
} as const;

/** One account the burn closes, with the lamports it holds before the burn. */
export interface RentSource {
  address: string;
  lamports: number;
}

export interface NftInfo {
  name: string;
  metadata: string;
  edition: string;
  tokenStandard: number | null;
  /** Verified collection's metadata PDA, required by BurnV1 for verified items. */
  collectionMetadata: string | null;
  /** Programmable NFTs only. */
  tokenRecord: string | null;
  /** Metadata, edition and token record rent (the token account is counted separately). */
  sources: RentSource[];
}

export const metadataPda = (mint: PublicKey) =>
  PublicKey.findProgramAddressSync([enc.encode("metadata"), PROGRAM.toBytes(), mint.toBytes()], PROGRAM)[0];

export const editionPda = (mint: PublicKey) =>
  PublicKey.findProgramAddressSync([enc.encode("metadata"), PROGRAM.toBytes(), mint.toBytes(), enc.encode("edition")], PROGRAM)[0];

export const tokenRecordPda = (mint: PublicKey, token: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [enc.encode("metadata"), PROGRAM.toBytes(), mint.toBytes(), enc.encode("token_record"), token.toBytes()],
    PROGRAM,
  )[0];

/** The fields we need from a Metadata account (borsh, read sequentially and defensively). */
export function parseMetadata(data: Uint8Array): { name: string; tokenStandard: number | null; collection: { verified: boolean; key: string } | null } | null {
  try {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let o = 1 + 32 + 32; // key, update authority, mint
    const str = () => {
      const len = view.getUint32(o, true);
      o += 4;
      const s = new TextDecoder().decode(data.subarray(o, o + len)).replace(/\0/g, "").trim();
      o += len;
      return s;
    };
    const name = str();
    str(); // symbol
    str(); // uri
    o += 2; // seller fee bps
    if (data[o++] === 1) o += 4 + view.getUint32(o, true) * 34; // creators
    o += 2; // primary sale happened, is mutable
    if (data[o++] === 1) o += 1; // edition nonce
    let tokenStandard: number | null = null;
    if (data[o++] === 1) tokenStandard = data[o++] ?? null;
    let collection: { verified: boolean; key: string } | null = null;
    if (data[o++] === 1) {
      const verified = data[o] === 1;
      const key = new PublicKey(data.subarray(o + 1, o + 33)).toBase58();
      collection = { verified, key };
    }
    return { name, tokenStandard, collection };
  } catch {
    return null;
  }
}

/**
 * For each candidate (a legacy SPL account holding exactly 1 of a 0-decimal,
 * supply-1 mint), read its metadata and edition. Returns only NFTs BurnV1 can
 * burn whole; everything else stays a plain token account.
 */
export async function fetchNftInfo(
  connection: Connection,
  candidates: { mint: string; tokenAccount: string; programId: string }[],
): Promise<Map<string, NftInfo>> {
  const out = new Map<string, NftInfo>();
  const legacy = candidates.filter((c) => c.programId === TOKEN_PROGRAM_ID);
  for (let i = 0; i < legacy.length; i += 33) {
    const slice = legacy.slice(i, i + 33);
    const keys = slice.flatMap((c) => {
      const mint = new PublicKey(c.mint);
      return [metadataPda(mint), editionPda(mint), tokenRecordPda(mint, new PublicKey(c.tokenAccount))];
    });
    const infos = await connection.getMultipleAccountsInfo(keys, "confirmed");
    slice.forEach((c, j) => {
      const [meta, edition, record] = [infos[j * 3], infos[j * 3 + 1], infos[j * 3 + 2]];
      const [metaKey, editionKey, recordKey] = [keys[j * 3], keys[j * 3 + 1], keys[j * 3 + 2]];
      if (!meta || !edition || !metaKey || !editionKey || !recordKey) return;
      if (!meta.owner.equals(PROGRAM) || !edition.owner.equals(PROGRAM)) return;
      const parsed = parseMetadata(meta.data);
      if (!parsed) return;
      // Edition account key byte: 6 = MasterEditionV2, 2 = MasterEditionV1. Print editions (1) are not burned this way.
      const isMaster = edition.data[0] === 6 || edition.data[0] === 2;
      const std = parsed.tokenStandard;
      const pnft = std === TokenStandard.ProgrammableNonFungible;
      if (!isMaster || !(std === null || std === TokenStandard.NonFungible || pnft)) return;
      if (pnft && !record) return;
      const sources: RentSource[] = [
        { address: metaKey.toBase58(), lamports: meta.lamports },
        { address: editionKey.toBase58(), lamports: edition.lamports },
      ];
      if (pnft && record) sources.push({ address: recordKey.toBase58(), lamports: record.lamports });
      out.set(c.tokenAccount, {
        name: parsed.name,
        metadata: metaKey.toBase58(),
        edition: editionKey.toBase58(),
        tokenStandard: std,
        collectionMetadata: parsed.collection?.verified ? metadataPda(new PublicKey(parsed.collection.key)).toBase58() : null,
        tokenRecord: pnft ? recordKey.toBase58() : null,
        sources,
      });
    });
  }
  return out;
}

/** Token Metadata BurnV1 (instruction 41, BurnArgs::V1 { amount: 1 }). Optional accounts are the program id. */
export function createBurnNftInstruction(owner: PublicKey, mint: PublicKey, tokenAccount: PublicKey, nft: NftInfo): TransactionInstruction {
  const none = { pubkey: PROGRAM, isSigner: false, isWritable: false };
  const w = (k: string | PublicKey) => ({ pubkey: typeof k === "string" ? new PublicKey(k) : k, isSigner: false, isWritable: true });
  const data = new Uint8Array(10);
  data[0] = 41;
  data[1] = 0;
  new DataView(data.buffer).setBigUint64(2, 1n, true);
  return new TransactionInstruction({
    programId: PROGRAM,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true }, // authority
      nft.collectionMetadata ? w(nft.collectionMetadata) : none,
      w(nft.metadata),
      w(nft.edition),
      w(mint),
      w(tokenAccount),
      none, // master edition (print editions only)
      none, // master edition mint
      none, // master edition token
      none, // edition marker
      nft.tokenRecord ? w(nft.tokenRecord) : none,
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: new PublicKey(TOKEN_PROGRAM_ID), isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}
