export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Karo Online — Temporary Issue</title>
<style>
  :root { color-scheme: light; }
  html,body { margin:0; height:100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: linear-gradient(180deg,#fff8dc,#f5e9b8); color:#3a2a05; }
  .wrap { min-height:100%; display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { max-width:380px; width:100%; background:rgba(255,255,255,0.7); border:1px solid rgba(212,175,55,0.4); border-radius:20px; padding:28px; text-align:center; box-shadow:0 10px 30px rgba(146,64,14,0.12); }
  h1 { font-size:20px; margin:0 0 8px; color:#92400e; }
  p { font-size:14px; line-height:1.5; margin:0 0 18px; color:#6b4a18; }
  .row { display:flex; gap:10px; justify-content:center; }
  button, a.btn { font:inherit; font-size:13px; font-weight:600; padding:10px 16px; border-radius:999px; border:0; cursor:pointer; text-decoration:none; }
  .primary { background:linear-gradient(135deg,#d97706,#92400e); color:#fff; }
  .ghost { background:#fff; color:#92400e; border:1px solid #d4af37; }
  .brand { margin-top:18px; font-size:11px; color:#a08040; letter-spacing:0.08em; text-transform:uppercase; }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <h1>Thodi der mein wapas try karein</h1>
    <p>App temporarily reach nahi ho pa rahi. Page refresh karein ya home par jaayein.</p>
    <div class="row">
      <button class="primary" onclick="location.reload()">Refresh</button>
      <a class="ghost btn" href="/">Home</a>
    </div>
    <div class="brand">Powered by Filipra Pvt Ltd</div>
  </div>
</div>
</body>
</html>`;
}
