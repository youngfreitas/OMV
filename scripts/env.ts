/* Carrega o .env (Node ≥ 20.12) — os scripts via tsx não o leem sozinhos, ao contrário do Next.js. */
try {
  process.loadEnvFile('.env');
} catch {
  /* sem .env: usa as variáveis do ambiente */
}
