#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "fs";
import path from "path";
import { globSync } from "glob";
import { z } from "zod";

// The docs are located in the parent directory under src/content/docs
const DOCS_DIR = path.resolve(process.cwd(), "../src/content/docs");

const server = new McpServer(
  { name: "drizzle-docs-mcp", version: "1.0.0" }
);

server.registerTool("list_docs", {
  description: "List all available Drizzle ORM documentation files."
}, async () => {
  const files = globSync("**/*.mdx", { cwd: DOCS_DIR });
  return { content: [{ type: "text", text: files.join("\n") }] };
});

server.registerTool("read_doc", {
  description: "Read the content of a specific Drizzle documentation file.",
  inputSchema: {
    filepath: z.string().describe("The path of the file to read (e.g., 'overview.mdx')")
  }
}, async (args) => {
  const { filepath } = args;
  const fullPath = path.join(DOCS_DIR, filepath);
  
  if (!fullPath.startsWith(DOCS_DIR) || !fs.existsSync(fullPath)) {
    return { content: [{ type: "text", text: `Error: File ${filepath} not found.` }], isError: true };
  }
  const content = fs.readFileSync(fullPath, "utf-8");
  return { content: [{ type: "text", text: content }] };
});

server.registerTool("search_docs", {
  description: "Search for a keyword or phrase across all Drizzle documentation.",
  inputSchema: {
    query: z.string().describe("The text to search for")
  }
}, async (args) => {
  const { query } = args;
  const files = globSync("**/*.mdx", { cwd: DOCS_DIR });
  let results = "";

  for (const file of files) {
    const content = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
    if (content.toLowerCase().includes(query.toLowerCase())) {
      // Extract a small snippet around the match
      const matchIndex = content.toLowerCase().indexOf(query.toLowerCase());
      const snippet = content.substring(Math.max(0, matchIndex - 50), Math.min(content.length, matchIndex + 100));
      results += `\n--- ${file} ---\n...${snippet}...\n`;
    }
  }
  return { content: [{ type: "text", text: results || "No matches found." }] };
});

// Start the server using stdio transport
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Drizzle Docs MCP Server running on stdio");
}

run().catch((error) => console.error(error));
