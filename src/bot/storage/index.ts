import { editMessage, send, sendError } from "../notifier.js";
import {
  AccountScrapeResult,
  TransactionRow,
  TransactionStorage,
} from "../../types.js";
import { LocalJsonStorage } from "./json.js";
import { GoogleSheetsStorage } from "./sheets.js";
import { AzureDataExplorerStorage } from "./azure-data-explorer.js";
import { transactionHash, transactionUniqueId } from "./utils.js";
import { YNABStorage } from "./ynab.js";
import { BuxferStorage } from "./buxfer.js";
import { WebPostStorage } from "./web-post.js";
import { TransactionRuleEngine } from "../rule-engine/transactionRuleEngine.js";
import { saving } from "../messages.js";
import { createLogger } from "../../utils/logger.js";
import { statsString } from "../saveStats.js";
import { parallel } from "async";
import { Timer } from "../../utils/Timer.js";

const baseLogger = createLogger("storage");

export const storages = [
  new LocalJsonStorage(),
  new GoogleSheetsStorage(),
  new AzureDataExplorerStorage(),
  new YNABStorage(),
  new BuxferStorage(),
  new WebPostStorage(),
].filter((s) => s.canSave());

const storageRuleEngine = new TransactionRuleEngine();

export async function saveResults(results: Array<AccountScrapeResult>) {
  if (storages.length === 0) {
    await send("No storages found, skipping save");
    return;
  }

  let txns = resultsToTransactions(results);
  if (txns.length === 0) {
    await send("No transactions found, skipping save");
    return;
  }

  if (storageRuleEngine.canApplyRules()) {
    txns = await storageRuleEngine.applyRules(txns);
  }

  await parallel(
    storages.map((storage: TransactionStorage) => async () => {
      const { name } = storage.constructor;
      const logger = baseLogger.extend(name);
      const steps: Array<Timer> = [];

      try {
        logger(`saving ${txns.length} transactions`);
        const message = await send(saving(name));
        const start = performance.now();
        const stats = await storage.saveTransactions(txns, async (step) => {
          steps.at(-1)?.end();
          steps.push(new Timer(step));
          await editMessage(message?.message_id, saving(name, steps));
        });
        const duration = performance.now() - start;
        steps.at(-1)?.end();
        logger(`saved`);
        await editMessage(
          message?.message_id,
          statsString(stats, duration, steps),
        );
      } catch (e) {
        logger(`error saving transactions`, e);
        sendError(e, `saveTransactions::${name}`);
      }
    }),
  );
}

function resultsToTransactions(
  results: Array<AccountScrapeResult>,
): Array<TransactionRow> {
  const txns: Array<TransactionRow> = [];

  for (let { result, companyId } of results) {
    if (result.success) {
      for (let account of result.accounts ?? []) {
        for (let tx of account.txns) {
          txns.push({
            ...tx,
            account: account.accountNumber,
            companyId,
            hash: transactionHash(tx, companyId, account.accountNumber),
            uniqueId: transactionUniqueId(tx, companyId, account.accountNumber),
          });
        }
      }
    }
  }

  return txns;
}
