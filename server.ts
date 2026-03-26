import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "1.0.0", service: "heya-backend" });
  });

  app.get("/api/agents/config", (req, res) => {
    // This could eventually come from a database
    res.json({
      defaultModel: "gemini-3-flash-preview",
      maxAgents: 5,
      features: ["multi-agent", "convergence", "smart-routing"]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Heya server running on http://localhost:${PORT}`);
  });
}

startServer();
