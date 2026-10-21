import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Atrás de proxies (ex.: GitHub Codespaces) o Origin difere do Host; liste aqui as origens confiáveis.
      allowedOrigins: [
        // Em desenvolvimento (inclui GitHub Codespaces) aceita o domínio de encaminhamento de portas.
        ...(process.env.NODE_ENV !== 'production' ? ['*.app.github.dev', 'localhost:3000'] : []),
        ...(process.env.OMV_ORIGENS_PERMITIDAS?.split(',').map((o) => o.trim()).filter(Boolean) ?? []),
      ],
    },
  },
  serverExternalPackages: ['@node-rs/argon2', 'pdfkit', 'exceljs'],
  async headers() {
    const prod = process.env.NODE_ENV === 'production';
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${prod ? '' : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default config;
