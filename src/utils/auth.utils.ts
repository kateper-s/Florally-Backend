import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function encryptPassword(password: string): Promise<string> {
  const salt = randomBytes(8).toString("hex");
  const hash = (await scryptAsync(password, salt, 32)) as Buffer;
  return salt + "." + hash.toString("hex");
}

export async function checkPassword(
  dto: { password: string },
  storedPassword: string,
): Promise<boolean> {
  const [salt, storedHash] = storedPassword.split(".");
  const hash = (await scryptAsync(dto.password, salt, 32)) as Buffer;
  return storedHash === hash.toString("hex");
}
