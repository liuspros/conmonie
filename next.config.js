module.exports = {
  reactStrictMode: true,
  async headers() { return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] }]; },
  async rewrites() { return [{ source: '/__/auth/:path*', destination: 'https://conmonie.firebaseapp.com/__/auth/:path*' }, { source: '/__/firebase/init.json', destination: 'https://conmonie.firebaseapp.com/__/firebase/init.json' }]; },
  experimental: { serverComponentsExternalPackages: ['firebase-admin'] },
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, canvas: false, encoding: false };
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, os: false, crypto: false, stream: false, util: false, http: false, https: false, zlib: false, url: false };
    return config;
  },
};
