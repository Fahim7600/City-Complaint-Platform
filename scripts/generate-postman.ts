import fs from "node:fs";
import path from "node:path";
import { convert } from "openapi-to-postmanv2";
import { swaggerSpec } from "../src/config/swagger";

const outputDirectory = path.resolve(process.cwd(), "postman");
const outputPath = path.join(
  outputDirectory,
  "City-Complaint-Platform.postman_collection.json",
);

fs.mkdirSync(outputDirectory, { recursive: true });

convert(
  { type: "json", data: swaggerSpec },
  { folderStrategy: "Tags", requestNameSource: "url" },
  (
    error: unknown,
    result: {
      result?: boolean;
      output?: Array<{ data?: unknown }>;
      reason?: string;
    },
  ) => {
    if (error || !result.result || !result.output) {
      throw (
        error ??
        new Error(result.reason ?? "Unable to convert OpenAPI spec to Postman")
      );
    }
    const collection = result.output[0]?.data;
    if (!collection) {
      throw new Error("Postman converter returned no collection data");
    }
    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));
    console.log(`Generated ${outputPath}`);
  },
);
