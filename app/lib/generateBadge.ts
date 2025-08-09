export async function generateBadge(reg: { id: string; firstName: string; lastName: string }) {
  // In prod, plug real logic; for now return deterministic URL.
  return `https://storage.example/badges/${reg.id}.png`;
}
