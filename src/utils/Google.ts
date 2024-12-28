import { GoogleSpreadsheet } from "google-spreadsheet";
import { GoogleAuth } from "google-auth-library";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("utils/Google");

export async function getGoogleSheet(
  serviceAccountEmail: string,
  serviceAccountPrivateKey: string,
  sheetId: string,
) {
  try {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      credentials: {
        client_email: serviceAccountEmail,
        private_key: serviceAccountPrivateKey,
      },
    });

    const doc = new GoogleSpreadsheet(sheetId, auth);
    await doc.loadInfo();
    return doc;
  } catch (error) {
    logger(`Error fetching google sheet: ${error}`);
    throw error;
  }
}

export async function exportGSheetToCSV(
  googleCredentials: any,
  sheetId: string | undefined,
  worksheetName: string | undefined,
): Promise<string> {
  if (
    !googleCredentials.client_email ||
    !googleCredentials.private_key ||
    !sheetId ||
    !worksheetName
  ) {
    throw new Error("All google arguments must be passed");
  }
  try {
    const doc = await getGoogleSheet(
      googleCredentials.client_email,
      googleCredentials.private_key,
      sheetId,
    );
    const sheet = doc.sheetsByTitle[worksheetName];
    if (!sheet) {
      throw new Error(`Sheet ${worksheetName} not found`);
    }
    const arrayBuffer = await sheet.downloadAsCSV();
    const csvData = arrayBufferToString(arrayBuffer);
    return csvData;
  } catch (error) {
    logger(`Error exporting google sheet to CSV ${error}`);
    throw error;
  }
}

function arrayBufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}
