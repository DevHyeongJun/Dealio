export async function GET() {
  const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dealio API — Docs</title>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/dealio/api/openapi"
      data-configuration='${JSON.stringify({
        theme: 'default',
        layout: 'modern',
        defaultHttpClient: { targetKey: 'shell', clientKey: 'curl' },
        hideClientButton: false,
      })}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
