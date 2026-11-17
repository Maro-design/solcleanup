/**
 * Turn RPC, simulation and wallet errors into one plain sentence.
 * Raw error objects are never shown to users.
 */

/** spl-token / Token-2022 custom error codes we can explain. */
const TOKEN_ERRORS: Record<number, string> = {
  1: "Insufficient funds in a token account",
  4: "A token account isn't owned by this wallet",
  9: "A token account isn't initialised",
  11: "A token account still holds a balance, so it can't be closed",
  13: "A token account is in an invalid state",
  17: "A token account is frozen by its issuer",
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function isUserRejection(err: unknown): boolean {
  const msg = errorText(err).toLowerCase();
  const code = isRecord(err) ? (err.code ?? (isRecord(err.error) ? err.error.code : undefined)) : undefined;
  return (
    code === 4001 ||
    msg.includes("user rejected") ||
    msg.includes("rejected the request") ||
    msg.includes("user denied") ||
    msg.includes("declined") ||
    msg.includes("cancelled") ||
    msg.includes("canceled") ||
    (isRecord(err) && err.name === "WalletSignTransactionError" && msg.includes("reject"))
  );
}

function errorText(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (isRecord(err) && typeof err.message === "string") return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return "";
  }
}

/** Decode a TransactionError (from simulation/confirmation) or a thrown error. */
export function decodeError(err: unknown, logs?: string[]): string {
  if (isUserRejection(err)) return "You rejected the request in your wallet";

  // TransactionError string variants
  if (typeof err === "string") {
    switch (err) {
      case "InsufficientFundsForFee":
        return "Not enough SOL in this wallet to pay the network fee";
      case "AccountNotFound":
        return "This wallet has no SOL to pay the network fee";
      case "BlockhashNotFound":
        return "The network moved on before this was sent — please try again";
      case "InsufficientFundsForRent":
        return "This would leave an account below the rent-exempt minimum";
      default:
        return `The network rejected the transaction (${err})`;
    }
  }

  // { InstructionError: [index, detail] }
  if (isRecord(err) && Array.isArray(err.InstructionError)) {
    const [index, detail] = err.InstructionError as [number, unknown];
    if (isRecord(detail) && typeof detail.Custom === "number") {
      const known = TOKEN_ERRORS[detail.Custom];
      if (known) return `${known} (instruction ${index + 1})`;
      return `Instruction ${index + 1} failed with program error ${detail.Custom}`;
    }
    if (typeof detail === "string") {
      if (detail === "InsufficientFunds") return "Not enough SOL to cover the transfer";
      if (detail === "IncorrectProgramId") return `Instruction ${index + 1} used the wrong token program`;
      return `Instruction ${index + 1} failed: ${detail.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()}`;
    }
  }

  if (isRecord(err) && "InsufficientFundsForRent" in err) {
    return "A transfer would leave an account below the rent-exempt minimum";
  }

  const text = errorText(err);
  const lower = text.toLowerCase();
  if (lower.includes("block height exceeded") || lower.includes("blockhash not found") || lower.includes("expired")) {
    return "The transaction expired before it confirmed — nothing was charged. Try again";
  }
  if (lower.includes("403") || lower.includes("401") || lower.includes("forbidden") || lower.includes("unauthorized")) {
    return "The Solana RPC refused the request. If you run this site, check NEXT_PUBLIC_RPC_URL";
  }
  if (lower.includes("429") || lower.includes("too many requests")) {
    return "The RPC is rate-limiting requests. Wait a moment and try again";
  }
  if (lower.includes("failed to fetch") || lower.includes("network") || lower.includes("timeout")) {
    return "Couldn't reach the Solana RPC. Check your connection and try again";
  }
  if (lower.includes("insufficient")) return "Not enough SOL in this wallet to pay the network fee";

  const logLine = logs?.find((l) => /error|failed/i.test(l));
  if (logLine) return `Simulation failed: ${logLine.replace(/^Program log: /, "").slice(0, 160)}`;

  return "Something went wrong. Nothing was signed or sent";
}
