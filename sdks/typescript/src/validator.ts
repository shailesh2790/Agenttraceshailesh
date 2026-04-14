import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "fs";
import { join } from "path";

export interface ValidationError {
  path: string;
  message: string;
}

let _ajv: Ajv | null = null;
let _validateFn: ReturnType<Ajv["compile"]> | null = null;

function getValidator(): ReturnType<Ajv["compile"]> {
  if (_validateFn) return _validateFn;

  const schemaPath = join(__dirname, "..", "schemas", "v0.2.json");
  const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));

  _ajv = new Ajv({ allErrors: true });
  addFormats(_ajv);
  _validateFn = _ajv.compile(schema);
  return _validateFn;
}

/**
 * Validate a trace object against the AgentTrace v0.2 schema.
 *
 * Returns `null` if valid.
 * Returns an array of `{ path, message }` objects if invalid.
 *
 * @example
 * ```ts
 * import { validate } from "agentrace";
 * const errors = validate(myTrace);
 * if (errors === null) console.log("valid");
 * ```
 */
export function validate(trace: unknown): ValidationError[] | null {
  const fn = getValidator();
  const valid = fn(trace);
  if (valid) return null;
  return (fn.errors ?? []).map((err) => ({
    path: err.instancePath || "/",
    message: err.message ?? "unknown error",
  }));
}
