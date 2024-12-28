import { CompanyTypes } from "israeli-bank-scrapers";
import {
  TransactionTypes,
  TransactionStatuses,
  TransactionInstallments,
} from "israeli-bank-scrapers/lib/transactions";
import { TransactionRow } from "../../types";

export class MoneymanTransaction implements TransactionRow {
  constructor(
    public account: string,
    public companyId: CompanyTypes,
    public hash: string,
    public uniqueId: string,
    public type: TransactionTypes,
    public date: string,
    public processedDate: string,
    public originalAmount: number,
    public originalCurrency: string,
    public chargedAmount: number,
    public description: string,
    public status: TransactionStatuses,
    public identifier?: string | number,
    public chargedCurrency?: string,
    public memo?: string,
    public installments?: TransactionInstallments,
    public category?: string,
    public tags?: Array<string>,
  ) {
    if (tags == null) {
      this.tags = [];
    }
  }

  static fromTransactionRow(
    transactionRow: TransactionRow,
  ): MoneymanTransaction {
    return new MoneymanTransaction(
      transactionRow.account,
      transactionRow.companyId,
      transactionRow.hash,
      transactionRow.uniqueId,
      transactionRow.type,
      transactionRow.date,
      transactionRow.processedDate,
      transactionRow.originalAmount,
      transactionRow.originalCurrency,
      transactionRow.chargedAmount,
      transactionRow.description,
      transactionRow.status,
      transactionRow.identifier,
      transactionRow.chargedCurrency,
      transactionRow.memo,
      transactionRow.installments,
      transactionRow.category,
      transactionRow.tags,
    );
  }

  toTransactionRow(): TransactionRow {
    return {
      account: this.account,
      companyId: this.companyId,
      hash: this.hash,
      uniqueId: this.uniqueId,
      type: this.type,
      date: this.date,
      processedDate: this.processedDate,
      originalAmount: this.originalAmount,
      originalCurrency: this.originalCurrency,
      chargedAmount: this.chargedAmount,
      description: this.description,
      status: this.status,
      identifier: this.identifier,
      chargedCurrency: this.chargedCurrency,
      memo: this.memo,
      installments: this.installments,
      category: this.category,
      tags: this.tags,
    };
  }

  fieldMatch(fieldName: keyof this, regex: string): boolean {
    const fieldValue = this[fieldName];
    if (fieldValue === undefined) {
      //console.log(`Field ${String(fieldName)} does not exist.`);
      return false;
    }
    // Ensure fieldValue is a string for regex testing
    const pattern = new RegExp(regex);
    return pattern.test(String(fieldValue));
  }

  fieldIncludes(fieldName: keyof this, substring: string): boolean {
    const fieldValue = this[fieldName];
    if (fieldValue === undefined) {
      //console.log(`Field ${String(fieldName)} does not exist.`);
      return false;
    }
    return String(fieldValue).includes(substring);
  }

  descriptionIncludes(searchString: string): boolean {
    // TODO - Enhanced trool library such that the fieldIncludes method above would be supported ...
    const regex = new RegExp(searchString, "i");
    const isIncluded = regex.test(this.description);
    return isIncluded;
  }

  tag(tag: string) {
    this.tags?.push(tag);
  }
}
