export type KeysOfValue<T, TCondition> = {
  [K in keyof T]: T[K] extends TCondition
    ? K
    : never;
}[keyof T];
