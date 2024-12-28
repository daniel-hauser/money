import { TransactionRuleEngine } from "./transactionRuleEngine";
import { MoneymanTransaction } from "./moneymanTransaction";
import { TransactionRow } from "../../types";
import {
  TransactionStatuses,
  TransactionTypes,
} from "israeli-bank-scrapers/lib/transactions.js";
import { CompanyTypes } from "israeli-bank-scrapers";

const transactionRow1: TransactionRow = {
  date: "2021-01-01",
  processedDate: "2021-01-01",
  chargedAmount: 1000,
  description: "a test description here",
  memo: "Transfer to John's personal Paypal user: john.doe123@personal-mail.net",
  originalAmount: 1000,
  originalCurrency: "ILS",
  identifier: "identifier1",
  status: TransactionStatuses.Completed,
  type: TransactionTypes.Normal,
  account: "account1",
  companyId: CompanyTypes.max,
  hash: "hash1",
  uniqueId: "uniqueId1",
};

const transactionRow2: TransactionRow = {
  date: "2024-10-01",
  processedDate: "2024-10-01",
  chargedAmount: 500,
  description: "cellcom",
  memo: "electric bill",
  originalAmount: 1000,
  originalCurrency: "ILS",
  identifier: "identifier1",
  status: TransactionStatuses.Completed,
  type: TransactionTypes.Normal,
  account: "account2",
  companyId: CompanyTypes.max,
  hash: "hash2",
  uniqueId: "uniqueId2",
};

const transaction1 = MoneymanTransaction.fromTransactionRow(transactionRow1);

describe("MoneymanTransaction class", () => {
  it("should match string field values with provided regex", () => {
    const emailMatcher = "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}";
    expect(transaction1.fieldMatch("memo", emailMatcher)).toBe(true);
  });
  it("should check if string field values includes provided substring", () => {
    expect(transaction1.fieldIncludes("description", "test")).toBe(true);
  });
});

const TEST_TRANSACTION_RULES_FILE_PATH =
  "src/bot/rule-engine/transactionRuleTableTest.csv";
describe("RuleEngine constructor path finder", () => {
  it("should find rules csv file from provided path", () => {
    const ruleEngine = new TransactionRuleEngine(
      TEST_TRANSACTION_RULES_FILE_PATH,
    );
    expect(ruleEngine.canApplyRules()).toBe(true);
  });
});

describe("RuleEngineLogic", () => {
  it("should tag a transaction based on defined rules", async () => {
    const ruleEngine = new TransactionRuleEngine(
      TEST_TRANSACTION_RULES_FILE_PATH,
    );
    const updatedTrx = await ruleEngine.applyRules([transactionRow2]);
    expect(updatedTrx.length).toBe(1);
    expect(updatedTrx[0].tags).toBeDefined;
    const tag = updatedTrx[0].tags?.[0];
    expect(tag).toEqual("utilities / electric");
  });
});
