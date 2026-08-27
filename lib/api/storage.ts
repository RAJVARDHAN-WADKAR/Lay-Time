"use client";

export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    if (item === null || item === undefined) return defaultValue;
    return JSON.parse(item);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("demurrage_storage_change", { detail: { key } }));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage`, e);
  }
}

export function removeStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent("demurrage_storage_change", { detail: { key } }));
  } catch (e) {
    console.error(`Error removing ${key} from localStorage`, e);
  }
}
