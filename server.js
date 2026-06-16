// server.js — LOCAL / StackBlitz preview only.
// Serves the static site so `npm start` works in StackBlitz.
// Vercel ignores this (.vercelignore); in production Vercel serves the static
// files itself and runs the /api functions as serverless endpoints.
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = process.env.PORT || 3000;
const types = {
  ".html":"text/html", ".css":"text/css", ".js":"text/javascript",
  ".json":"application/json", ".svg":"image/svg+xml", ".png":"image/png",
  ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".gif":"image/gif",
  ".ico":"image/x-icon", ".webp":"image/webp", ".woff2":"font/woff2"
};

http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end("Forbidden"); }

  fs.readFile(file, (err, data) => {
    if (err) {
      // Real asset missing (.js/.css/.png/...) -> say so clearly. Do NOT return
      // HTML, or the browser would try to parse HTML as JS ("Unexpected token '<'").
      if (path.extname(p)) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end("404 Not Found: " + p +
          "\nThis file is not at the project root. Make sure js/ and css/ sit next to index.html.");
      }
      // Extensionless route -> serve index.html (the app uses hash routing anyway).
      return fs.readFile(path.join(root, "index.html"), (e, html) => {
        if (e) { res.writeHead(404); return res.end("index.html not found at project root"); }
        res.writeHead(200, { "Content-Type": "text/html" }); res.end(html);
      });
    }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(port, () => console.log("EX-CAP dev server running on http://localhost:" + port));
