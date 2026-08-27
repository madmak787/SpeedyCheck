function resolveBasePath() {
  if (process.env.NEXT_PUBLIC_BASE_PATH) {
    return process.env.NEXT_PUBLIC_BASE_PATH.replace(/\/$/, "")
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return ""

  try {
    const { pathname } = new URL(appUrl)
    if (!pathname || pathname === "/") return ""
    return pathname.replace(/\/$/, "")
  } catch {
    return ""
  }
}

const basePath = resolveBasePath()

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  ...(basePath ? { basePath } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  transpilePackages: ["@cloudflare/speedtest"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
