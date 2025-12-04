export function deepMerge<T extends object, U extends object>(target: T, source: U): T & U {
  const result: any = { ...target };

  for (const key of Object.keys(source)) {
    const value = (source as any)[key];

    if (
      key in target &&
      isObject((target as any)[key]) &&
      isObject(value)
    ) {
      result[key] = deepMerge((target as any)[key], value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function isObject(value: any): value is object {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
