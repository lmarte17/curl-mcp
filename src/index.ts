// Import necessary modules from the MCP SDK
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// Import zod for schema validation and type safety
import { z } from "zod";

// Define constants for your API integrations
const API_BASE_URL = "https://api.example.com"; // Replace with your API base URL
const USER_AGENT = "mcp-server/1.0"; // User-Agent header value for API requests

// Create an MCP server instance with a name and version
// This is the main entry point for our MCP implementation
const server = new McpServer({
  name: "my-mcp-server", // Server identifier in the MCP ecosystem - replace with your server name
  version: "1.0.0" // Semantic versioning for our server
});

/**
 * Helper function to make API requests
 *
 * @param url - The full URL endpoint to request data from
 * @returns A Promise that resolves to the parsed JSON response, or null if the request fails
 * @template T - Type parameter for the expected response data structure
 */
async function makeApiRequest<T>(url: string, options = {}): Promise<T | null> {
  // Create default headers for the API request
  const defaultHeaders = {
    "User-Agent": USER_AGENT,
    "Content-Type": "application/json"
  };

  const requestOptions = {
    headers: { ...defaultHeaders, ...(options as any).headers },
    ...(options || {})
  };

  try {
    // Make the HTTP request with fetch API
    const response = await fetch(url, requestOptions);

    // Check if the response was successful (status code 200-299)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the JSON response and cast it to the expected type
    return (await response.json()) as T;
  } catch (error) {
    // Log any errors that occur during the request
    console.error("Error making API request:", error);
    return null; // Return null to indicate a failed request
  }
}

/**
 * Interface for generic API responses
 * Replace or extend this with your specific API response structures
 */
interface ApiResponse {
  // Define the structure of your API responses here
  success: boolean;
  data?: any;
  message?: string;
}

/**
 * Utility function to format API data into a human-readable string
 * Customize this function based on your specific data format
 */
function formatResponse(data: any): string {
  // Implement custom formatting logic here
  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2);
  }
  return String(data);
}

// -----------------------------------------------------------------------------
// REGISTER YOUR MCP TOOLS BELOW
// -----------------------------------------------------------------------------

// EXAMPLE TOOL TEMPLATE:
// server.tool(
//   "tool_name", // Tool name - used by clients to call this tool
//   "Tool description", // Tool description - helps clients understand the purpose
//   {
//     // Define the input schema using zod for validation
//     param1: z.string().describe("Description of param1"),
//     param2: z.number().describe("Description of param2")
//   },
//   // Tool implementation function - what happens when this tool is called
//   async ({ param1, param2 }) => {
//     // Implement your tool logic here
//     // ...
//
//     // Return the result in the format expected by the MCP protocol
//     return {
//       content: [
//         {
//           type: "text", // Content type (text, image, etc.)
//           text: "Your response text here" // The actual response text
//         }
//       ]
//     };
//   }
// );

// Example tool implementation
server.tool(
  "example_tool", 
  "Example tool that demonstrates the basic structure", 
  {
    input: z.string().describe("Input data to process")
  },
  async ({ input }) => {
    // Process the input
    const processedInput = `Processed: ${input}`;
    
    // Return the result
    return {
      content: [
        {
          type: "text",
          text: processedInput
        }
      ]
    };
  }
);

/**
 * Main function to initialize and connect the MCP server
 */
async function main() {
  // Create a stdio transport for communication
  // This allows the server to communicate with clients via standard input/output
  const transport = new StdioServerTransport();

  // Connect the server to the transport
  // This starts listening for incoming messages and enables communication
  await server.connect(transport);

  // Log a message to indicate the server is running
  // Note: Using console.error instead of console.log because stdout is used for MCP communication
  console.error("MCP Server running on stdio");
}

// Call the main function and handle any fatal errors
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1); // Exit with error code 1 if there's a fatal error
});
