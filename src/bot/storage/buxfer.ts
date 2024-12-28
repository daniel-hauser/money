import { TransactionRow, TransactionStorage } from "../../types.js";
import { createLogger } from "../../utils/logger.js";
import { format, parseISO } from "date-fns";
import { TransactionStatuses } from "israeli-bank-scrapers/lib/transactions.js";
import { BuxferApiClient, BuxferTransaction } from "buxfer-ts-client";
import { createSaveStats } from "../saveStats.js";

const BUXFER_DATE_FORMAT = "yyyy-MM-dd";
const logger = createLogger("BuxferStorage");

const {
  BUXFER_USER_NAME = "",
  BUXFER_PASSWORD = "",
  BUXFER_ACCOUNTS = "",
} = process.env;

export class BuxferStorage implements TransactionStorage {
  private buxferClient: BuxferApiClient;
  private accountToBuxferAccount: Map<string, string>;

  async init() {
    logger("init");
    this.buxferClient = new BuxferApiClient(BUXFER_USER_NAME, BUXFER_PASSWORD);
    this.accountToBuxferAccount = this.parseBuxferAccounts(BUXFER_ACCOUNTS);
  }

  canSave() {
    return Boolean(BUXFER_USER_NAME && BUXFER_PASSWORD && BUXFER_ACCOUNTS);
  }

  async saveTransactions(
    txns: Array<TransactionRow>,
    onProgress: (status: string) => Promise<void>,
  ) {
    await this.init();

    const stats = createSaveStats(
      "BuxferStorage",
      `Accounts: "${Array.from(this.accountToBuxferAccount.keys())}"`,
      txns,
    );

    // Initialize an array to store non-pending and non-empty account ID transactions on Buxfer format.
    const txToSend: BuxferTransaction[] = [];
    const missingAccounts = new Set<string>();

    for (const tx of txns) {
      const isPending = tx.status === TransactionStatuses.Pending;
      // Ignore pending and only upload completed transactions
      if (isPending) {
        stats.skipped++;
        continue;
      }

      const accountId = this.accountToBuxferAccount.get(tx.account);
      if (!accountId) {
        missingAccounts.add(tx.account);
        stats.skipped++;
        continue;
      }

      // Converting to Buxfer format.
      const buxferTx = this.convertTransactionToBuxferFormat(tx, accountId);

      // Add non-pending and non-empty account ID transactions to the array.
      txToSend.push(buxferTx);
    }

    if (txToSend.length > 0) {
      // Send transactions to Buxfer
      logger(
        `sending to Buxfer accounts: "${this.accountToBuxferAccount.keys()}"`,
      );
      const [resp] = await Promise.all([
        this.buxferClient.addTransactions(txToSend, false),
        onProgress("Sending"),
      ]);
      logger("transactions sent to Buxfer successfully!");
      stats.added = resp.addedTransactionIds.length;
      stats.existing = resp.existingTransactionIds.length;
      stats.skipped += stats.existing;
    }

    if (missingAccounts.size > 0) {
      logger(`Accounts missing in Buxfer_ACCOUNTS:`, missingAccounts);
    }

    return stats;
  }

  private parseBuxferAccounts(accountsJSON: string): Map<string, string> {
    try {
      const accounts = JSON.parse(accountsJSON);
      return new Map(Object.entries(accounts));
    } catch (parseError) {
      throw new Error(
        `Error parsing JSON in BUXFER_ACCOUNTS: ${parseError.message}`,
      );
    }
  }

  private convertTransactionToBuxferFormat(
    tx: TransactionRow,
    accountId: string,
  ): BuxferTransaction {
    return {
      accountId: Number(accountId),
      date: format(parseISO(tx.date), BUXFER_DATE_FORMAT, {}),
      amount: tx.chargedAmount,
      description: [tx.description, tx.memo].filter(Boolean).join(" | "), // Buxfer does not allow updating all trx fields via REST API so this will add additional fields to the description with '|' separators
      status:
        tx.status === TransactionStatuses.Completed ? "cleared" : "pending",
      type: tx.chargedAmount > 0 ? "income" : "expense",
      tags: [...(tx.tags || []), "added-by-moneyman-etl"]
        .filter(Boolean)
        .join(", "),
    };
  }
}
