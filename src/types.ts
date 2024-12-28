import type { CompanyTypes } from "israeli-bank-scrapers";
import type { Transaction } from "israeli-bank-scrapers/lib/transactions.js";
import type {
  ScraperCredentials,
  ScraperScrapingResult,
} from "israeli-bank-scrapers";
import { SaveStats } from "./bot/saveStats.js";
export type { Transaction };

export type AccountConfig = ScraperCredentials & {
  companyId: CompanyTypes;
};

export interface TransactionRow extends Transaction {
  account: string;
  companyId: CompanyTypes;
  hash: string;
  uniqueId: string;
  tags?: Array<string>;
}

export interface AccountScrapeResult {
  companyId: CompanyTypes;
  result: ScraperScrapingResult;
}

export type CategoryString = string;
export type CategoryDef = {
  contains?: Array<string>;
  startsWith?: Array<string>;
  eq?: Array<string>;
};

export interface TransactionStorage {
  canSave(): boolean;
  saveTransactions(
    txns: Array<TransactionRow>,
    onProgress: (status: string) => Promise<void>,
  ): Promise<SaveStats>;
}

export type ScraperConfig = {
  startDate: Date;
  futureMonthsToScrape: number;
  parallelScrapers: number;
  accounts: Array<AccountConfig>;
};

export interface RunnerHooks {
  onBeforeStart(): Promise<void>;
  onStatusChanged(rows: string[], totalTime?: number): Promise<void>;
  onResultsReady(results: AccountScrapeResult[]): Promise<void>;
  onError(e: Error, caller?: string): Promise<void>;
  failureScreenshotHandler: (
    photoPath: string,
    caption: string,
  ) => Promise<unknown>;
}
export type Runner = (hooks: RunnerHooks) => Promise<void>;
