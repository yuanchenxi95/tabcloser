export function exhaustiveSwitchGuard(value: never): never {
  throw new Error(`Unhandled case: ${String(value)}`);
}
