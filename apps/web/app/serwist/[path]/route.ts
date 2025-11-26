import { createSerwistRoute } from "@serwist/turbopack";

const serwistRoute = createSerwistRoute({
  swSrc: "app/sw.ts",
  nextConfig: {
    basePath: "/",
  },
});

// Only export the GET handler and generateStaticParams
// Route segment configs (dynamic, dynamicParams, revalidate) are not compatible
// with Next.js 16's cacheComponents feature
export const GET = serwistRoute.GET;

// Custom generateStaticParams to work around Iterator.map bug in @serwist/turbopack
// The library uses map.keys().map(...) which relies on Iterator.prototype.map
// This may not work in all environments
export const generateStaticParams = async (): Promise<{ path: string }[]> => {
  try {
    const result = await serwistRoute.generateStaticParams();
    return result;
  } catch {
    // Fallback: return known static paths for the service worker
    return [{ path: "sw.js" }, { path: "sw.js.map" }];
  }
};
