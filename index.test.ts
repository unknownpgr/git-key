import mock from "mock-fs";
import fs from "fs/promises";
import { hide, clear, reveal, nameOf } from "./lib";

const TEST_FILE_PATH = ".env";
const TEST_FILE_CONTENT = "PASSWORD=VERY_SENSITIVE_PASSWORD";

beforeEach(() => {
  mock({
    [TEST_FILE_PATH]: TEST_FILE_CONTENT,
    ".secrets": TEST_FILE_PATH,
  });
});

test("clear", async () => {
  let files = await fs.readdir(".");
  expect(files).toContain(TEST_FILE_PATH);
  await clear();
  files = await fs.readdir(".");
  expect(files).not.toContain(TEST_FILE_PATH);
});

test("hide / reveal", async () => {
  const password = await hide();
  expect(typeof password).toBe("string");
  await fs.unlink(TEST_FILE_PATH);
  await reveal(password);
  await fs.stat(TEST_FILE_PATH);
  expect(await fs.readFile(TEST_FILE_PATH, "utf-8")).toBe(TEST_FILE_CONTENT);
});

test("hide / reveal with custom password", async () => {
  const customPassword = "T3ST_P@SSW0RD";
  const password = await hide(customPassword);
  expect(password).toEqual(customPassword);
  await fs.unlink(TEST_FILE_PATH);
  await reveal(password);
  await fs.stat(TEST_FILE_PATH);
  expect(await fs.readFile(TEST_FILE_PATH, "utf-8")).toBe(TEST_FILE_CONTENT);
});

test("hide / get file name with password", async () => {
  const password = await hide();
  expect(typeof password).toBe("string");
  await fs.unlink(TEST_FILE_PATH);
  const fileName = await nameOf(password);
  await fs.stat(fileName);
});

afterEach(() => {
  mock.restore();
});
