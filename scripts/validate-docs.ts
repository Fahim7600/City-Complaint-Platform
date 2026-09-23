import fs from "node:fs";
import { swaggerSpec } from "../src/config/swagger";

const collectionPath =
  "postman/City-Complaint-Platform.postman_collection.json";
const documentedRoutes = Object.values(swaggerSpec.paths ?? {}).reduce(
  (count, pathItem) =>
    count +
    [
      "get",
      "post",
      "put",
      "patch",
      "delete",
      "options",
      "head",
      "trace",
    ].filter((method) => Boolean((pathItem as Record<string, unknown>)[method]))
      .length,
  0,
);

if (documentedRoutes === 0) {
  throw new Error("OpenAPI specification contains no documented routes");
}

const collection = JSON.parse(fs.readFileSync(collectionPath, "utf8"));
if (!collection.info || !Array.isArray(collection.item)) {
  throw new Error("Postman collection is not a valid collection document");
}

console.log(
  `Documentation valid: ${documentedRoutes} OpenAPI operations, ${collection.item.length} Postman folders`,
);
