import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function encryptPassword(password: string): Promise<string> {
  const salt = randomBytes(8).toString("hex");
  const hash = (await scryptAsync(password, salt, 32)) as Buffer;
  return salt + "." + hash.toString("hex");
}

export async function checkPassword(
  inputPassword: string,
  storedPassword: string,
): Promise<boolean> {
  console.log("Checking password. Stored:", storedPassword);

  if (!storedPassword || !storedPassword.includes(".")) {
    console.error("Invalid stored password format");
    return false;
  }

  const [salt, storedHash] = storedPassword.split(".");
  console.log("Salt:", salt, "Stored hash:", storedHash);

  const hash = (await scryptAsync(inputPassword, salt, 32)) as Buffer;
  const inputHash = hash.toString("hex");
  console.log("Input hash:", inputHash);

  const result = storedHash === inputHash;
  console.log("Password match:", result);

  return result;
}
