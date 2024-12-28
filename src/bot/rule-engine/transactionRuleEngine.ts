import Trool from "trool";
import { exportGSheetToCSV } from "../../utils/Google.js";
import { MoneymanTransaction } from "./moneymanTransaction.js";
import { TransactionRow } from "../../types.js";
import { send, sendError } from "../notifier.js";
import { createLogger } from "../../utils/logger.js";
import * as fs from "fs";

const {
  RULES_TABLE_CSV_FILE_PATH,
  GOOGLE_WORKSHEET_NAME_RULES = "",
  GOOGLE_SHEET_ID_RULES,
  GOOGLE_APPLICATION_CREDENTIALS,
} = process.env;

const logger = createLogger("TransactionRuleEngine");

export class TransactionRuleEngine {
  private rulesTableCsv: string;
  private rulesTableFound: boolean = false;
  private fetchRulesFromGsheet: boolean = false;
  private trool: Trool;
  private googleCredentials: any;
  constructor(csvFilePath?: string) {
    if (csvFilePath && fs.existsSync(csvFilePath)) {
      this.rulesTableCsv = this.readFileAsString(csvFilePath);
    } else if (
      RULES_TABLE_CSV_FILE_PATH &&
      fs.existsSync(RULES_TABLE_CSV_FILE_PATH)
    ) {
      this.rulesTableCsv = this.readFileAsString(RULES_TABLE_CSV_FILE_PATH);
    } else if (GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const jsonString = fs.readFileSync(
          GOOGLE_APPLICATION_CREDENTIALS,
          "utf8",
        );
        this.googleCredentials = JSON.parse(jsonString);
        this.fetchRulesFromGsheet = true;
      } catch (error) {
        logger("Failed to parse Google credentials, rules will not be applied");
      }
    }

    this.checkRulesTableCsv();
    this.initTrool();
  }

  private checkRulesTableCsv() {
    if (this.rulesTableCsv && this.rulesTableCsv !== "") {
      logger("Rules table loaded");
      this.rulesTableFound = true;
    }
  }

  private initTrool() {
    // This is required due to issues with the Trool package that only resolve as done here
    try {
      // Works via jest UT
      this.trool = new Trool(false);
    } catch (error) {
      // Works from the main project launch ...
      const TroolClass = (Trool as any).default;
      this.trool = new TroolClass(false);
    }
  }

  canApplyRules(): boolean {
    return this.rulesTableFound || this.fetchRulesFromGsheet;
  }

  private async loadRulesTable() {
    await this.readRulesFromGsheet();
    if (this.rulesTableFound) {
      await this.trool.init(this.rulesTableCsv, true);
      logger("Rules loaded to engine");
    } else {
      throw new Error("Can't load rules table not found");
    }
  }

  private async readRulesFromGsheet() {
    if (this.fetchRulesFromGsheet) {
      this.rulesTableCsv = await exportGSheetToCSV(
        this.googleCredentials,
        GOOGLE_SHEET_ID_RULES,
        GOOGLE_WORKSHEET_NAME_RULES,
      );
      this.checkRulesTableCsv();
    }
  }

  async applyRules(txns: Array<TransactionRow>): Promise<TransactionRow[]> {
    try {
      await this.loadRulesTable();
      const factsHolder = {
        MoneymanTransactions: txns.map((trx) =>
          MoneymanTransaction.fromTransactionRow(trx),
        ),
      };
      const updatedFacts = this.trool.applyRules(factsHolder);
      const updatedTransactionRows = updatedFacts.MoneymanTransactions.map(
        (trx) => trx.toTransactionRow(),
      );
      send("Transactions rules applied");
      return updatedTransactionRows;
    } catch (error) {
      sendError(error, "TransactionRules::");
      return txns; // Rules should not fail the flow and be graceful
    }
  }

  // Function to read a file and return its content as a string
  readFileAsString(filePath: string): string {
    return fs.readFileSync(filePath, { encoding: "utf-8" });
  }
}
