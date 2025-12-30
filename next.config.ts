import type { NextConfig } from "next";

const nextConfig: NextConfig = {
        serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist', 'canvas'],

        images: {
                remotePatterns: [
                        {
                                protocol: 'https',
                                hostname: '*.s3.*.amazonaws.com',
                                port: '',
                                pathname: '/**',
                        },
                        {
                                protocol: 'https',
                                hostname: 'picsum.photos',
                                port: '',
                                pathname: '/**',
                        }
                ],
        },

        webpack: (config, { isServer }) => {
                if (isServer) {
                        config.externals = [
                                ...(config.externals || []),
                                'canvas',
                                '@napi-rs/canvas',
                                'pdfjs-dist'
                        ];
                }
                return config;
        },
}

export default nextConfig;
