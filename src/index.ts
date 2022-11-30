import fs from "fs/promises";
import crypto from "crypto";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const SECRET_ENCRYPTED_FILE = ".secrets.encrypted";
const SECRET_LIST_FILE = ".secrets";
let verbose = false;

function log(message: string) {
  if (verbose) console.log(message);
}

async function getSecretFiles(): Promise<string[]> {
  try {
    const secretList = await fs.readFile(SECRET_LIST_FILE, "utf-8");
    const secretFiles = secretList
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length);
    return secretFiles;
  } catch {
    console.error(`Cannot find '${SECRET_LIST_FILE}' file.`);
    return [];
  }
}

export async function hide(encryptedFileName: string = SECRET_ENCRYPTED_FILE) {
  const secretFiles = await getSecretFiles();
  if (secretFiles.length === 0) throw new Error("Secret file is empty.");

  const secrets: { [k: string]: string } = {};
  log("Encrypt file");
  await Promise.all(
    secretFiles.map(async (secretFile) => {
      try {
        log(`  ${secretFile}`);
        const secret = await fs.readFile(secretFile, "utf-8");
        secrets[secretFile] = secret;
      } catch {
        console.error(`Cannot find secret file ${secretFile}`);
      }
    })
  );

  const content = JSON.stringify(secrets);
  const password = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", password, iv);
  const encrypted =
    cipher.update(content, "utf-8", "base64") + cipher.final("base64");
  const encryptedFile = JSON.stringify({
    iv: iv.toString("base64"),
    encrypted,
  });
  await fs.writeFile(encryptedFileName, encryptedFile, "utf-8");

  let encodedPassword = password.toString("base64");
  if (encryptedFileName !== SECRET_ENCRYPTED_FILE) {
    const encodedFileName = Buffer.from(encryptedFileName, "utf-8").toString(
      "base64"
    );
    encodedPassword += ":" + encodedFileName;
  }
  return encodedPassword;
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
  const [encodedPassword, encodedFileName] = password.split(":");
  let encryptedFileName;
  if (!encodedFileName) {
    encryptedFileName = SECRET_ENCRYPTED_FILE;
  } else {
    encryptedFileName = Buffer.from(encodedFileName, "base64").toString(
      "utf-8"
    );
  }

  let encryptedFile;
  try {
    encryptedFile = await fs.readFile(encryptedFileName, {
      encoding: "utf-8",
    });
  } catch {
    console.error(`Cannot find '${encryptedFileName}' file.`);
    return;
  }

  const { encrypted, iv } = JSON.parse(encryptedFile);
  const _password = Buffer.from(encodedPassword, "base64");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    _password,
    Buffer.from(iv, "base64")
  );
  let decrypted = JSON.parse(
    decipher.update(encrypted, "base64", "utf-8") + decipher.final("utf-8")
  ) as { [k: string]: string };

  log("Create secret file");
  await Promise.all(
    Object.entries(decrypted).map(async ([secretFile, secret]) => {
      await fs.writeFile(secretFile, secret, "utf-8");
      log(`  ${secretFile}`);
    })
  );
}

export async function cli() {
  const argv = await yargs(hideBin(process.argv)).argv;
  const command = argv._[0] as string;

  if (argv.v || argv.verbose || process.env.VERBOSE) verbose = true;
  const encryptedFileName =
    ((argv.n || argv.filename) as string | undefined) ||
    process.env.GIT_KEY_ENCRYPTED_FILE;

  switch (command) {
    case "hide": {
      const password = await hide(encryptedFileName);
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
