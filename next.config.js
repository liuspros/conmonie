module.exports = {
  reactStrictMode: true,
  async headers() { return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] }]; },
  experimental: { serverComponentsExternalPackages: ['firebase-admin'] },
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, canvas: false, encoding: false };
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, os: false, crypto: false, stream: false, util: false, http: false, https: false, zlib: false, url: false };
    return config;
  },
};
