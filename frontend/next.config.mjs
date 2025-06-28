// @ts-check

import withBundleAnalyzer from "@next/bundle-analyzer";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow cross-origin requests for development
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://103.67.199.62:3000',
    'https://103.67.199.62:3000',
    'http://103.67.199.62',
    'https://103.67.199.62',
    '103.67.199.62',
    'localhost',
    '127.0.0.1',
  ],

  // Performance optimizations for Next.js 15+
  experimental: {
    // Enable turbo mode for faster builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
    // Enable optimizePackageImports for better tree shaking
    optimizePackageImports: [
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog', 
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-sheet',
      '@radix-ui/react-slider',
      '@radix-ui/react-switch',
      '@radix-ui/react-table',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'react-query',
      'recharts'
    ],

  },

  // Server external packages (moved from experimental)
  serverExternalPackages: ['@prisma/client'],

  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    domains: [
      'localhost',
      '103.67.199.62',
      '127.0.0.1'
    ]
  },

  // Bundle analyzer (optional, uncomment to analyze bundle)
  // bundleAnalyzer: {
  //   enabled: process.env.ANALYZE === 'true',
  // },

  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Framework chunk for React & Next.js
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?:react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // UI library chunk
          lib: {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|class-variance-authority|clsx|tailwind-merge)[\\/]/,
            name: 'lib',
            priority: 30,
            chunks: 'all',
          },
          // Query and form libraries
          query: {
            test: /[\\/]node_modules[\\/](@tanstack|@hookform|react-hook-form|zod)[\\/]/,
            name: 'query',
            priority: 25,
            chunks: 'all',
          },
          // Chart libraries
          charts: {
            test: /[\\/]node_modules[\\/](recharts|d3-|victory-)[\\/]/,
            name: 'charts',
            priority: 20,
            chunks: 'all',
          },
          // Commons chunk for shared components
          commons: {
            name: 'commons',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }

    // Optimize for development
    // if (dev) {
    //   config.optimization = {
    //     ...config.optimization,
    //     removeAvailableModules: false,
    //     removeEmptyChunks: false,
    //   };
    //   // Enable faster rebuilds in development
    //   // config.watchOptions = {
    //   //   poll: 1000,
    //   //   aggregateTimeout: 300,
    //   // }
    // }

    return config;
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: "camera=(self); microphone=(); geolocation=()",
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Enable strict mode for better debugging
  reactStrictMode: true,

  // Disable source maps in production for better performance
  productionBrowserSourceMaps: false,

  // ESLint configuration
  eslint: {
    dirs: ['app', 'components', 'hooks', 'lib'],
    ignoreDuringBuilds: false,
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false, // Enable strict TypeScript for production
  },

  // Output configuration for better performance
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard/admin',
        permanent: false,
      },
      {
        source: '/manager',
        destination: '/dashboard/manager',
        permanent: false,
      },
      {
        source: '/teacher',
        destination: '/dashboard/teacher',
        permanent: false,
      },
    ];
  },

  // Rewrites để proxy API requests sang backend trong môi trường dev
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    // Chỉ tạo rewrites nếu có API URL được định nghĩa
    if (!apiUrl || apiUrl === 'undefined') {
      return {
        beforeFiles: [],
        afterFiles: [],
        fallback: [],
      };
    }

    return {
      // These rewrites are checked after headers/redirects
      // and before files are checked
      beforeFiles: [
        {
          source: '/api/v1/:path*/', // Xử lý URL có dấu gạch chéo cuối
          destination: `${apiUrl}/:path*/`,
        },
        {
          source: '/api/v1/:path*', // Xử lý URL không có dấu gạch chéo cuối
          destination: `${apiUrl}/:path*`,
        },
      ],
      // These rewrites are checked after files are checked
      afterFiles: [],
      // These rewrites are checked as a last resort
      fallback: [],
    }
  },

  // Rewrites removed - using nginx proxy instead

  // Asset prefix for external access
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',

  // Dev server configuration  
  devIndicators: {
    position: 'bottom-right',
  },
};

const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzerConfig(nextConfig);
