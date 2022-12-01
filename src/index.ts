import fs from "fs/promises";
import crypto from "crypto";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { promisify } from "util";

const DEFAULT_SECRET_LIST_FILE = ".secrets";
const DEFAULT_SALT = Buffer.from(
  "X6ozBBnXA0ZukGMgQSU1xFr4frisiSfrTlwF4ZUW633IWihpFBhtxWVHpioGdf47YELOtC0bpOEpOBl5T657AL9tCeu8GYvxDFQzRE1jengGcbYO21ZShRPN9CTxoqxEqVHiQg==",
  "base64"
);
const IV = Buffer.alloc(16).fill(0);

let verbose = false;

interface ISecret {
  files: { [k: string]: string };
}

const log = (message: string) => {
  if (verbose) console.log(message);
};
const pbkdf2 = promisify(crypto.pbkdf2);
const hash = (password: string, salt: Buffer) =>
  pbkdf2(Buffer.from(password, "utf-8"), salt, 10000, 32, "sha256");
const getFileName = async (password: string) => {
  const passwordHash = (await hash(password, DEFAULT_SALT)).toString(
    "base64url"
  );
  const filename = `encrypted-${passwordHash.substring(0, 8)}`;
  return filename;
};
const getSecretFiles = async (): Promise<string[]> => {
  try {
    const secretList = await fs.readFile(DEFAULT_SECRET_LIST_FILE, "utf-8");
    const secretFiles = secretList
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length);
    return secretFiles;
  } catch {
    console.error(`Cannot find '${DEFAULT_SECRET_LIST_FILE}' file.`);
    return [];
  }
};
const init = <T>(f: () => T) => f();
const hashPassword = (password: string) =>
  crypto.createHash("sha256").update(password, "utf-8").digest();

export async function hide(password?: string) {
  const secretFiles = await getSecretFiles();
  if (secretFiles.length === 0) throw new Error("Secret file is empty.");

  // Create content from secrets
  const secrets: ISecret = {
    files: {},
  };
  log("Encrypt file");
  await Promise.all(
    secretFiles.map(async (secretFile) => {
      try {
        log(`  ${secretFile}`);
        const secret = await fs.readFile(secretFile, "utf-8");
        secrets.files[secretFile] = secret;
      } catch {
        console.error(`Cannot find secret file ${secretFile}`);
      }
    })
  );
  const content = JSON.stringify(secrets);

  // Initialize password
  const _password = await init(async () => {
    if (password && password.length > 0) {
      if (password.length < 10)
        throw new Error(
          "Password is too short. Password should be at least 10 characters long."
        );
      return password;
    } else return (await hash(content, DEFAULT_SALT)).toString("base64url");
  });

  // Calculate hash of password. This is Required because of password length normalization.
  const hashedPassword = hashPassword(_password);

  // Get encrypted file name. File name is derived from password, not file content.
  const encryptedFileName = await getFileName(_password);

  // Encrypt content
  const cipher = crypto.createCipheriv("aes-256-cbc", hashedPassword, IV);
  const encrypted =
    cipher.update(content, "utf-8", "base64") + cipher.final("base64");
  await fs.writeFile(encryptedFileName, encrypted, "utf-8");

  return _password;
}

export async function clear() {
  const secretFiles = await getSecretFiles();
  log("Clear secret file");
  await Promise.all(
    secretFiles.map(async (secretFile) => {
      try {
        await fs.unlink(secretFile);
        log(`  ${secretFile}`);
      } catch {}
    })
  );
}

export async function reveal(password: string) {
  const filename = await getFileName(password);

  // Get encrypted content
  let encrypted: Buffer;
  try {
    const _encrypted: string = await fs.readFile(filename, "utf-8");
    encrypted = Buffer.from(_encrypted, "base64");
  } catch {
    throw new Error(`Cannot find '${filename}' file.`);
  }

  // Calculate hashed password
  const hashedPassword = hashPassword(password);

  // Decrypt content
  const decipher = crypto.createDecipheriv("aes-256-cbc", hashedPassword, IV);
  const content = decipher.update(encrypted) + decipher.final("utf-8");

  // Retrieve secrets from content
  const secret = JSON.parse(content) as ISecret;
  log("Create secret file");
  await Promise.all(
    Object.entries(secret.files).map(async ([secretFile, secret]) => {
      await fs.writeFile(secretFile, secret, "utf-8");
      log(`  ${secretFile}`);
    })
  );
}

export async function cli() {
  const argv = await yargs(hideBin(process.argv)).argv;
  const command = argv._[0] as string;

  if (argv.v || argv.verbose || process.env.VERBOSE) verbose = true;

  switch (command) {
    case "hide": {
      const password = await hide();
      log("Password :");
      console.log(password);
      break;
    }

    case "clear": {
      await clear();
      break;
    }

    case "reveal": {
      const password =
        (argv.p as string) ||
        (argv.password as string) ||
        process.env.GIT_KEY_PASSWORD ||
        "";
      await reveal(password);
      break;
    }

    default:
      console.error(`No such command exists : ${command}`);
      break;
  }
}
