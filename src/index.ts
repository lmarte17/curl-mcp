// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch, { Response, RequestInit } from "node-fetch";

// Types for requests and responses
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface CurlRequest {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  timeout: number;
}

interface CurlResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: string;
}

// Create an MCP server
const server = new McpServer({
  name: "curl-api",
  version: "1.0.0",
});

// Define the curl tool that fetches data from a URL
server.tool(
  "curl",
  "Makes an HTTP request to a URL and returns the response",
  {
    url: z.string().url().describe("The URL to make a request to"),
    method: z
      .enum(["GET", "POST", "PUT", "DELETE", "PATCH"])
      .default("GET")
      .describe("HTTP method to use"),
    headers: z
      .record(z.string())
      .optional()
      .describe("HTTP headers to include with the request"),
    body: z.any().optional().describe("Request body (for POST, PUT, PATCH requests)"),
    timeout: z
      .number()
      .min(1000)
      .max(30000)
      .default(10000)
      .describe("Request timeout in milliseconds"),
  },
  async ({ url, method, headers, body, timeout }: CurlRequest) => {
    try {
      console.error(`Making ${method} request to ${url}`);

      const options: RequestInit = {
        method,
        headers: headers || {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout,
      };

      // Add body for non-GET requests if provided
      if (method !== "GET" && body !== undefined) {
        options.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const response: Response = await fetch(url, options);

      // Try to parse as JSON first
      let responseText: string;
      let responseData: any;

      try {
        responseData = await response.json();
        responseText = JSON.stringify(responseData, null, 2);
      } catch (e) {
        // If not JSON, get as text
        responseText = await response.text();
      }

      // Include status and headers in response
      const result: CurlResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseText,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error making request:", errorMessage);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error making request: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Add a JSON parsing tool to help with processing API responses
server.tool(
  "parse-json",
  "Parses a JSON string and returns a formatted representation",
  {
    json: z.string().describe("The JSON string to parse"),
    path: z.string().optional().describe("Optional JSONPath-like expression to extract specific data"),
  },
  async ({ json, path }: { json: string; path?: string }) => {
    try {
      const data = JSON.parse(json);

      // Extract data using path if provided
      let result: any = data;
      if (path) {
        try {
          // Very simple path implementation - split by dots and traverse
          const parts = path.split(".");
          for (const part of parts) {
            if (result === null || result === undefined) break;
            result = result[part];
          }
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error extracting data with path "${path}": ${errorMessage}`,
              },
            ],
          };
        }
      }

      return {
        content: [
          {
            type: "text",
            text: typeof result === "object" ? JSON.stringify(result, null, 2) : String(result),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error parsing JSON: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Start server
async function main(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Curl API MCP Server running");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error starting server:", errorMessage);
    process.exit(1);
  }
}

main();