const mock = require("mock-fs");
const fs = require("fs/promises");
const { hide, clear, reveal } = require("./lib");

const TEST_FILE_PATH = ".env";
const TEST_FILE_CONTENT = "PASSWORD=VERY_SENSITIVE_PASSWORD";

beforeEach(() => {
  mock({
    [TEST_FILE_PATH]: TEST_FILE_CONTENT,
    ".secrets": TEST_FILE_PATH,
  });
});

test("hide / reveal", async () => {
  const password = await hide();
  expect(typeof password).toBe("string");
  await fs.stat(".secrets.encrypted");
  await fs.unlink(TEST_FILE_PATH);
  await reveal(password);
  await fs.stat(TEST_FILE_PATH);
  expect(await fs.readFile(TEST_FILE_PATH, "utf-8")).toBe(TEST_FILE_CONTENT);
});

test("hide / reveal with encrypted file name", async () => {
  const encryptedFileName = ".custom-filename";
  const password = await hide(encryptedFileName);
  expect(typeof password).toBe("string");
  const files = await fs.readdir(".");
  expect(files).toContain(encryptedFileName);
  await fs.stat(encryptedFileName);
  await fs.unlink(TEST_FILE_PATH);
  await reveal(password, encryptedFileName);
  await fs.stat(TEST_FILE_PATH);
  expect(await fs.readFile(TEST_FILE_PATH, "utf-8")).toBe(TEST_FILE_CONTENT);
});

afterEach(() => {
  mock.restore();
});
