import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
    experimental: {
        serverActions: {
            bodySizeLimit: "80mb", // Slightly more than MAX_IMAGE_SIZE_BYTES in constants.ts
        },
    },
};

export default nextConfig;
