const mock = require("mock-fs");
const fs = require("fs/promises");
const { hide, clear, reveal } = require("./lib");

const TEST_FILE_PATH = ".env";
const TEST_FILE_CONTENT = "PASSWORD=VERY_SENSITIVE_PASSWORD";

beforeAll(() => {
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

afterAll(() => {
  mock.restore();
});
