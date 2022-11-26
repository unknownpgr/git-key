const fs = require("fs/promises");
const crypto = require("crypto");

const SECRET_LIST_FILE = ".secrets";
const SECRET_ENCRYPTED_FILE = ".secrets.encrypted";

async function getSecretFiles() {
  const secretList = await fs.readFile(SECRET_LIST_FILE, "utf-8");
  const secretFiles = secretList
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length);
  return secretFiles;
}

async function hide() {
  let secretFiles;
  try {
    secretFiles = await getSecretFiles();
  } catch {
    console.error(`Could not find '${SECRET_LIST_FILE}' file.`);
    return;
  }

  const secrets = {};
  await Promise.all(
    secretFiles.map(async (secretFile) => {
      try {
        const secret = await fs.readFile(secretFile, "utf-8");
        secrets[secretFile] = secret;
      } catch {
        console.error(`Could not find secret file ${secretFile}`);
      }
    })
  );

  const content = JSON.stringify(secrets);
  const password = crypto.randomBytes(32);
  const initializeVector = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    password,
    initializeVector
  );
  const encrypted =
    cipher.update(content, "utf-8", "base64") + cipher.final("base64");
  const encryptedFile = JSON.stringify({
    initializeVector: initializeVector.toString("base64"),
    encrypted,
  });
  await fs.writeFile(SECRET_ENCRYPTED_FILE, encryptedFile, {
    encoding: "utf-8",
  });
  console.log(password.toString("base64"));
}

async function clear() {
  const secretFiles = await getSecretFiles();
  await Promise.all(
    secretFiles.map(async (secretFile) => fs.unlink(secretFile))
  );
}

async function reveal(argv) {
  let encryptedFile;
  try {
    encryptedFile = await fs.readFile(SECRET_ENCRYPTED_FILE, {
      encoding: "utf-8",
    });
  } catch {
    console.error(`Could not find '${SECRET_ENCRYPTED_FILE}' file.`);
    return;
  }

  const { encrypted, initializeVector } = JSON.parse(encryptedFile);
  const password = Buffer.from(
    (
      (argv && (argv.password || argv.p)) ||
      process.env.GIT_KEY_PASSWORD
    ).trim(),
    "base64"
  );
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    password,
    Buffer.from(initializeVector, "base64")
  );
  let decrypted = JSON.parse(
    decipher.update(encrypted, "base64", "utf-8") + decipher.final("utf-8")
  );

  await Promise.all(
    Object.entries(decrypted).map(([secretFile, secret]) =>
      fs.writeFile(secretFile, secret, "utf-8")
    )
  );
}

module.exports = { hide, clear, reveal };
