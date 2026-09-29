// Utility helper functions
export function generateId(len = 8) {
  const arr = new Uint8Array(len / 2);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, dec => dec.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function getInitials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
