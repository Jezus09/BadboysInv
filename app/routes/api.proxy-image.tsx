/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type LoaderFunctionArgs } from "react-router";

/**
 * Image proxy endpoint to bypass CORS restrictions
 * Used by 3D sticker editor to load Steam CDN images
 * 
 * Usage: /api/proxy-image?url=https://cdn.steamstatic.com/...
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get("url");

  if (!imageUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Validate URL is from Steam CDN
  if (!imageUrl.startsWith("https://cdn.steamstatic.com/")) {
    return new Response("Invalid URL - only Steam CDN allowed", { status: 403 });
  }

  try {
    // Fetch image from Steam CDN
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return new Response(`Failed to fetch image: ${response.status}`, {
        status: response.status,
      });
    }

    // Get image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";

    // Return image with CORS headers
    return new Response(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable", // Cache for 1 year
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  } catch (error) {
    console.error("[ProxyImage] Failed to fetch:", imageUrl, error);
    return new Response("Failed to fetch image", { status: 500 });
  }
}
