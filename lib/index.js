"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cli = exports.nameOf = exports.reveal = exports.clear = exports.hide = void 0;
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const helpers_1 = require("yargs/helpers");
const util_1 = require("util");
const yargs_1 = __importDefault(require("yargs"));
const DEFAULT_SECRET_LIST_FILE = ".secrets";
const DEFAULT_SALT = Buffer.from("X6ozBBnXA0ZukGMgQSU1xFr4frisiSfrTlwF4ZUW633IWihpFBhtxWVHpioGdf47YELOtC0bpOEpOBl5T657AL9tCeu8GYvxDFQzRE1jengGcbYO21ZShRPN9CTxoqxEqVHiQg==", "base64");
const IV = Buffer.alloc(16).fill(0);
let verbose = false;
const log = (message) => {
    if (verbose)
        console.log(message);
};
const pbkdf2 = (0, util_1.promisify)(crypto_1.default.pbkdf2);
const hash = (password, salt) => pbkdf2(Buffer.from(password, "utf-8"), salt, 10000, 32, "sha256");
const getFileName = async (password) => {
    const passwordHash = (await hash(password, DEFAULT_SALT)).toString("base64url");
    const filename = `encrypted-${passwordHash.substring(0, 8)}`;
    return filename;
};
const getSecretFiles = async () => {
    try {
        const secretList = await promises_1.default.readFile(DEFAULT_SECRET_LIST_FILE, "utf-8");
        const secretFiles = secretList
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length);
        return secretFiles;
    }
    catch {
        console.error(`Cannot find '${DEFAULT_SECRET_LIST_FILE}' file.`);
        return [];
    }
};
const init = (f) => f();
const hashPassword = (password) => crypto_1.default.createHash("sha256").update(password, "utf-8").digest();
async function hide(password) {
    const secretFiles = await getSecretFiles();
    if (secretFiles.length === 0)
        throw new Error("Secret file is empty.");
    // Create content from secrets
    const secrets = {
        files: {},
    };
    log("Encrypt file");
    await Promise.all(secretFiles.map(async (secretFile) => {
        try {
            log(`  ${secretFile}`);
            const secret = await promises_1.default.readFile(secretFile, "utf-8");
            secrets.files[secretFile] = secret;
        }
        catch {
            console.error(`Cannot find secret file ${secretFile}`);
        }
    }));
    const content = JSON.stringify(secrets);
    // Initialize password
    const _password = await init(async () => {
        if (password && password.length > 0) {
            if (password.length < 10)
                throw new Error("Password is too short. Password should be at least 10 characters long.");
            return password;
        }
        else
            return (await hash(content, DEFAULT_SALT)).toString("base64url");
    });
    // Calculate hash of password. This is Required because of password length normalization.
    const hashedPassword = hashPassword(_password);
    // Get encrypted file name. File name is derived from password, not file content.
    const encryptedFileName = await getFileName(_password);
    // Encrypt content
    const cipher = crypto_1.default.createCipheriv("aes-256-cbc", hashedPassword, IV);
    const encrypted = cipher.update(content, "utf-8", "base64") + cipher.final("base64");
    await promises_1.default.writeFile(encryptedFileName, encrypted, "utf-8");
    return _password;
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
        catch { }
    }));
}
exports.clear = clear;
async function reveal(password) {
    const filename = await getFileName(password);
    // Get encrypted content
    let encrypted;
    try {
        const _encrypted = await promises_1.default.readFile(filename, "utf-8");
        encrypted = Buffer.from(_encrypted, "base64");
    }
    catch {
        throw new Error(`Cannot find '${filename}' file.`);
    }
    // Calculate hashed password
    const hashedPassword = hashPassword(password);
    // Decrypt content
    const decipher = crypto_1.default.createDecipheriv("aes-256-cbc", hashedPassword, IV);
    const content = decipher.update(encrypted) + decipher.final("utf-8");
    // Retrieve secrets from content
    const secret = JSON.parse(content);
    log("Create secret file");
    await Promise.all(Object.entries(secret.files).map(async ([secretFile, secret]) => {
        await promises_1.default.writeFile(secretFile, secret, "utf-8");
        log(`  ${secretFile}`);
    }));
}
exports.reveal = reveal;
async function nameOf(password) {
    return getFileName(password);
}
exports.nameOf = nameOf;
async function cli() {
    const argv = await (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv)).argv;
    const command = argv._[0];
    if (argv.v || argv.verbose || process.env.VERBOSE)
        verbose = true;
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
            const password = argv.p ||
                argv.password ||
                process.env.GIT_KEY_PASSWORD ||
                "";
            await reveal(password);
            break;
        }
        case "nameof":
        case "name": {
            const password = argv.p ||
                argv.password ||
                process.env.GIT_KEY_PASSWORD ||
                "";
            const nameOfPassword = await nameOf(password);
            console.log(password);
        }
        default:
            console.error(`No such command exists : ${command}`);
            break;
    }
}
exports.cli = cli;
