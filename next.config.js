/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

const nextConfig = {
  reactStrictMode: true,
  env: {
    // Garantir que as variáveis de ambiente sejam explicitamente passadas
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    HF_API_TOKEN: process.env.HF_API_TOKEN,
    HF_MODEL: process.env.HF_MODEL
  },
  // Configuração de runtime para garantir que as variáveis estejam disponíveis no servidor
  serverRuntimeConfig: {
    // Variáveis apenas disponíveis no servidor
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  // Configuração de runtime para garantir que as variáveis estejam disponíveis no cliente
  publicRuntimeConfig: {
    // Variáveis disponíveis no cliente e servidor
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  swcMinify: true,
  compiler: {
    // Desativa a remoção de console.logs em produção
    removeConsole: false
  },
  experimental: {
    // Reduz a otimização para evitar problemas no build
    optimizePackageImports: ['@supabase/auth-helpers-react'],
  },
  webpack: (config, { isServer, dev }) => {
    // Configuração especial para o arquivo problemático
    config.module.rules.push({
      test: /\[id\]\.js$/,
      include: /pages\/workout-mode/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['next/babel'],
          plugins: [
            '@babel/plugin-transform-react-jsx',
            ['@babel/plugin-transform-runtime', { regenerator: true }]
          ]
        }
      }
    });
    
    return config;
  },
  // Configuração para páginas que requerem autenticação
  trailingSlash: false,
  images: {
    domains: ['']
  },
  async rewrites() {
    return [
      {
        source: '/workout-timer-sw.js',
        destination: '/workout-timer-sw.js',
      },
    ];
  },
  // Desativar a geração estática para páginas específicas
  // Usando a nova abordagem em vez de 'target'
  output: 'standalone',
};

// Log para depuração das variáveis de ambiente no momento do build
console.log('Variáveis de ambiente disponíveis durante o build:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Definida' : 'Não definida');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Definida' : 'Não definida');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Definida' : 'Não definida');

module.exports = withPWA(nextConfig); 