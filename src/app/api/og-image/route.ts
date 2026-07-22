import { createReadStream } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const imagePath = join(process.cwd(), "public", "og-dashboard.png");
  const stream = Readable.toWeb(createReadStream(imagePath)) as ReadableStream;

  return new Response(stream, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Disposition": "inline",
      "Content-Type": "image/png",
    },
  });
}
