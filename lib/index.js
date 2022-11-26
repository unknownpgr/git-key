"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cli = exports.reveal = exports.clear = exports.hide = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const crypto_1 = __importDefault(require("crypto"));
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const SECRET_LIST_FILE = ".secrets";
const SECRET_ENCRYPTED_FILE = ".secrets.encrypted";
let verbose = false;
function log(message) {
    if (verbose)
        console.log(message);
}
async function getSecretFiles() {
    try {
        const secretList = await promises_1.default.readFile(SECRET_LIST_FILE, "utf-8");
        const secretFiles = secretList
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length);
        return secretFiles;
    }
    catch {
        console.error(`Cannot find '${SECRET_LIST_FILE}' file.`);
        return [];
    }
}
async function hide() {
    const secretFiles = await getSecretFiles();
    if (secretFiles.length === 0)
        return;
    const secrets = {};
    log("Encrypt file");
    await Promise.all(secretFiles.map(async (secretFile) => {
        try {
            log(`  ${secretFile}`);
            const secret = await promises_1.default.readFile(secretFile, "utf-8");
            secrets[secretFile] = secret;
        }
        catch {
            console.error(`Cannot find secret file ${secretFile}`);
        }
    }));
    const content = JSON.stringify(secrets);
    const password = crypto_1.default.randomBytes(32);
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv("aes-256-cbc", password, iv);
    const encrypted = cipher.update(content, "utf-8", "base64") + cipher.final("base64");
    const encryptedFile = JSON.stringify({
        iv: iv.toString("base64"),
        encrypted,
    });
    await promises_1.default.writeFile(SECRET_ENCRYPTED_FILE, encryptedFile, "utf-8");
    return password.toString("base64");
}
exports.hide = hide;
async function clear() {
    const secretFiles = await getSecretFiles();
    log("Clear secret file");
    await Promise.all(secretFiles.map(async (secretFile) => {
        try {
            await promises_1.default.unlink(secretFile);
            log(`  ${secretFile}`);
        }
        catch {
            console.error(`Cannot create ${secretFile}`);
        }
    }));
}
exports.clear = clear;
async function reveal(password) {
    let encryptedFile;
    try {
        encryptedFile = await promises_1.default.readFile(SECRET_ENCRYPTED_FILE, {
            encoding: "utf-8",
        });
    }
    catch {
        console.error(`Cannot find '${SECRET_ENCRYPTED_FILE}' file.`);
        return;
    }
    const { encrypted, iv } = JSON.parse(encryptedFile);
    const _password = Buffer.from(password, "base64");
    const decipher = crypto_1.default.createDecipheriv("aes-256-cbc", _password, Buffer.from(iv, "base64"));
    let decrypted = JSON.parse(decipher.update(encrypted, "base64", "utf-8") + decipher.final("utf-8"));
    log("Create secret file");
    await Promise.all(Object.entries(decrypted).map(async ([secretFile, secret]) => {
        await promises_1.default.writeFile(secretFile, secret, "utf-8");
        log(`  ${secretFile}`);
    }));
}
exports.reveal = reveal;
async function cli() {
    const argv = await (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv)).argv;
    const command = argv._[0];
    if (argv.v || argv.verbose)
        verbose = true;
    switch (command) {
        case "hide":
            console.log(await hide());
            break;
        case "clear":
            await clear();
            break;
        case "reveal":
            const password = argv.p ||
                argv.password ||
                process.env.GIT_KEY_PASSWORD ||
                "";
            await reveal(password);
            break;
        default:
            break;
    }
}
exports.cli = cli;
