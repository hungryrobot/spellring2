var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import "dotenv/config";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  insertRingStorageSchema: () => insertRingStorageSchema,
  insertSpellSchema: () => insertSpellSchema,
  insertUserSchema: () => insertUserSchema,
  ringStorage: () => ringStorage,
  spells: () => spells,
  users: () => users
});
import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var spells = pgTable("spells", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  class: text("class").notNull(),
  level: integer("level").notNull(),
  description: text("description").notNull(),
  spell: text("spell").notNull(),
  type: text("type").notNull(),
  concentration: text("concentration").notNull(),
  upcast: text("upcast").notNull(),
  range: text("range").notNull(),
  isFavorite: boolean("is_favorite").notNull().default(false)
});
var ringStorage = pgTable("ring_storage", {
  id: serial("id").primaryKey(),
  spellId: integer("spell_id").notNull(),
  addedAt: text("added_at").notNull(),
  upcastLevel: integer("upcast_level").notNull().default(0)
});
var insertSpellSchema = createInsertSchema(spells).omit({
  id: true
});
var insertRingStorageSchema = createInsertSchema(ringStorage).omit({
  id: true,
  addedAt: true
}).extend({
  upcastLevel: z.number().min(0).default(0)
});
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async getAllSpells() {
    return await db.select().from(spells);
  }
  async createSpell(insertSpell) {
    const [spell] = await db.insert(spells).values(insertSpell).returning();
    return spell;
  }
  async createSpells(insertSpells) {
    if (insertSpells.length === 0) return [];
    return await db.insert(spells).values(insertSpells).returning();
  }
  async deleteAllSpells() {
    await db.delete(ringStorage);
    await db.delete(spells);
  }
  async getRingStorage() {
    return await db.select({
      id: ringStorage.id,
      spellId: ringStorage.spellId,
      addedAt: ringStorage.addedAt,
      upcastLevel: ringStorage.upcastLevel,
      spell: spells
    }).from(ringStorage).innerJoin(spells, eq(ringStorage.spellId, spells.id));
  }
  async addSpellToRing(insertRingStorage) {
    const [ring] = await db.insert(ringStorage).values({
      ...insertRingStorage,
      addedAt: (/* @__PURE__ */ new Date()).toISOString(),
      upcastLevel: insertRingStorage.upcastLevel || 0
    }).returning();
    return ring;
  }
  async removeSpellFromRing(id) {
    await db.delete(ringStorage).where(eq(ringStorage.id, id));
  }
  async clearRingStorage() {
    await db.delete(ringStorage);
  }
  async toggleSpellFavorite(spellId) {
    const [spell] = await db.select().from(spells).where(eq(spells.id, spellId));
    if (spell) {
      await db.update(spells).set({ isFavorite: !spell.isFavorite }).where(eq(spells.id, spellId));
    }
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { z as z2 } from "zod";
import multer from "multer";
import Papa from "papaparse";
var upload = multer({ storage: multer.memoryStorage() });
async function registerRoutes(app2) {
  app2.head("/api/health", (req, res) => {
    res.status(200).end();
  });
  app2.get("/api/health", (req, res) => {
    res.json({ status: "ok", storage: "database" });
  });
  app2.get("/api/spells", async (req, res) => {
    try {
      const spells2 = await storage.getAllSpells();
      res.json(spells2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch spells" });
    }
  });
  app2.post("/api/spells/upload", upload.single("csvFile"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const csvData = req.file.buffer.toString("utf8");
      const parseResult = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().trim()
      });
      if (parseResult.errors.length > 0) {
        return res.status(400).json({
          message: "CSV parsing failed",
          errors: parseResult.errors
        });
      }
      const firstRow = parseResult.data[0] || {};
      console.log("CSV Headers detected:", Object.keys(firstRow));
      console.log("First row sample:", firstRow);
      const spellMap = /* @__PURE__ */ new Map();
      for (const row of parseResult.data) {
        const spellName = row.name?.trim() || "";
        if (!spellName) continue;
        let classValue = row.class?.trim() || row.classes?.trim() || row.spellclass?.trim() || row.school?.trim() || row.caster?.trim() || row.casterclass?.trim() || row.dndclass?.trim() || row.characterclass?.trim() || "";
        const classes = classValue ? classValue.split(",").map((c) => c.trim()).filter((c) => c) : [""];
        console.log(`Processing spell: ${spellName}, classes found: ${classes.join(", ")}`);
        if (spellMap.has(spellName)) {
          const existingSpell = spellMap.get(spellName);
          const existingClasses = existingSpell.class.split(",").map((c) => c.trim());
          const allClasses = [.../* @__PURE__ */ new Set([...existingClasses, ...classes])];
          existingSpell.class = allClasses.join(", ");
        } else {
          spellMap.set(spellName, {
            name: spellName,
            class: classes.join(", "),
            level: parseInt(row.level) || parseInt(row.spelllevel) || 0,
            description: row.description?.trim() || row.desc?.trim() || "",
            spell: row.spell?.trim() || row.description?.trim() || row.desc?.trim() || "",
            type: row.type?.trim() || "Spell",
            concentration: row.concentration?.trim() || "No",
            upcast: row.upcast?.trim() || "No",
            range: row.range?.trim() || "Unknown"
          });
        }
      }
      const spells2 = Array.from(spellMap.values());
      const validSpells = [];
      const errors = [];
      for (let i = 0; i < spells2.length; i++) {
        if (!spells2[i].name || spells2[i].name.trim() === "") {
          continue;
        }
        try {
          const validSpell = insertSpellSchema.parse(spells2[i]);
          validSpells.push(validSpell);
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
      if (errors.length > 0) {
        return res.status(400).json({
          message: "Some spells failed validation",
          errors
        });
      }
      await storage.deleteAllSpells();
      const createdSpells = await storage.createSpells(validSpells);
      res.json({
        message: `Successfully imported ${createdSpells.length} spells`,
        spells: createdSpells
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload CSV" });
    }
  });
  app2.get("/api/ring", async (req, res) => {
    try {
      const ringStorage2 = await storage.getRingStorage();
      res.json(ringStorage2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ring storage" });
    }
  });
  app2.post("/api/ring", async (req, res) => {
    try {
      const insertRingStorage = insertRingStorageSchema.parse(req.body);
      const currentRing = await storage.getRingStorage();
      const currentCapacity = currentRing.reduce((sum, item) => sum + (item.spell.level + item.upcastLevel), 0);
      const allSpells = await storage.getAllSpells();
      const spell = allSpells.find((s) => s.id === insertRingStorage.spellId);
      if (!spell) {
        return res.status(404).json({ message: "Spell not found" });
      }
      const effectiveLevel = spell.level + (insertRingStorage.upcastLevel || 0);
      if (currentCapacity + effectiveLevel > 5) {
        return res.status(400).json({
          message: `Cannot add spell. Ring capacity exceeded. Current: ${currentCapacity}/5, Effective spell level: ${effectiveLevel}`
        });
      }
      const ringStorage2 = await storage.addSpellToRing(insertRingStorage);
      res.json(ringStorage2);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid request data" });
      }
      res.status(500).json({ message: "Failed to add spell to ring" });
    }
  });
  app2.delete("/api/ring/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      await storage.removeSpellFromRing(id);
      res.json({ message: "Spell removed from ring" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove spell from ring" });
    }
  });
  app2.delete("/api/ring", async (req, res) => {
    try {
      await storage.clearRingStorage();
      res.json({ message: "Ring storage cleared" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear ring storage" });
    }
  });
  app2.patch("/api/spells/:id/favorite", async (req, res) => {
    try {
      const spellId = parseInt(req.params.id);
      if (isNaN(spellId)) {
        return res.status(400).json({ error: "Invalid spell ID" });
      }
      await storage.toggleSpellFavorite(spellId);
      res.json({ message: "Spell favorite status toggled" });
    } catch (error) {
      console.error("Toggle favorite error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "127.0.0.1"
  }, () => {
    log(`serving on port ${port}`);
  });
})();
