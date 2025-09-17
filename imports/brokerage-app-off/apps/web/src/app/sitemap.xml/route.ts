export async function GET() {
  const urls = ["/", "/pricing", "/analytics", "/markets", "/trading", "/dashboard"];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map((u) => `\n  <url><loc>https://localhost${u}</loc></url>`)
    .join("")}\n</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml" } });
}



