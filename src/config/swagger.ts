import swaggerJSDoc from "swagger-jsdoc";
import { config } from "./env";

const idSchema = { type: "string", format: "uuid" };
const dateSchema = { type: "string", format: "date-time" };

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "City Complaint & Service Request Platform API",
      version: "1.0.0",
      description:
        "API for reporting, managing, and resolving city complaints.",
    },
    servers: [{ url: `${config.APP_BASE_URL}/api/v1` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        SuccessResponse: {
          type: "object",
          required: ["success", "message"],
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: { nullable: true },
          },
        },
        ErrorResponse: {
          type: "object",
          required: ["success", "message"],
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            errors: { nullable: true },
          },
        },
        User: {
          type: "object",
          properties: {
            id: idSchema,
            name: { type: "string" },
            email: { type: "string", format: "email" },
            googleId: { type: "string", nullable: true },
            role: {
              type: "string",
              enum: ["CITIZEN", "TECHNICIAN", "MANAGER", "ADMIN"],
            },
            isPremium: { type: "boolean" },
            phone: { type: "string", nullable: true },
            avatarUrl: { type: "string", nullable: true },
            departmentId: { ...idSchema, nullable: true },
            requestedRole: {
              type: "string",
              nullable: true,
              enum: ["CITIZEN", "TECHNICIAN", "MANAGER", "ADMIN"],
            },
            approvalStatus: {
              type: "string",
              nullable: true,
              enum: ["PENDING", "APPROVED", "REJECTED"],
            },
            decidedById: { ...idSchema, nullable: true },
            decidedAt: { ...dateSchema, nullable: true },
            experience: { type: "string", nullable: true },
            qualification: { type: "string", nullable: true },
            createdAt: dateSchema,
            updatedAt: dateSchema,
            deletedAt: { ...dateSchema, nullable: true },
          },
        },
        Complaint: {
          type: "object",
          properties: {
            id: idSchema,
            title: { type: "string" },
            description: { type: "string" },
            citizenId: idSchema,
            categoryId: idSchema,
            departmentId: idSchema,
            location: { type: "string" },
            status: {
              type: "string",
              enum: [
                "PENDING",
                "ASSIGNED",
                "IN_PROGRESS",
                "RESOLVED",
                "CLOSED",
                "REJECTED",
                "CANCELLED",
              ],
            },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            assignedTechnicianId: { ...idSchema, nullable: true },
            slaDueAt: { ...dateSchema, nullable: true },
            overdueNotifiedAt: { ...dateSchema, nullable: true },
            resolvedAt: { ...dateSchema, nullable: true },
            createdAt: dateSchema,
            updatedAt: dateSchema,
            deletedAt: { ...dateSchema, nullable: true },
          },
        },
        Category: {
          type: "object",
          properties: {
            id: idSchema,
            name: { type: "string" },
            departmentId: idSchema,
            slaHours: { type: "integer" },
            description: { type: "string", nullable: true },
            createdAt: dateSchema,
            updatedAt: dateSchema,
            deletedAt: { ...dateSchema, nullable: true },
          },
        },
        Department: {
          type: "object",
          properties: {
            id: idSchema,
            name: { type: "string" },
            description: { type: "string", nullable: true },
            createdAt: dateSchema,
            updatedAt: dateSchema,
            deletedAt: { ...dateSchema, nullable: true },
          },
        },
        Payment: {
          type: "object",
          properties: {
            id: idSchema,
            userId: idSchema,
            amount: { type: "integer" },
            currency: { type: "string" },
            stripePaymentIntentId: { type: "string", nullable: true },
            stripeInvoiceId: { type: "string", nullable: true },
            status: {
              type: "string",
              enum: ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"],
            },
            purpose: { type: "string", enum: ["PREMIUM_SUBSCRIPTION"] },
            createdAt: dateSchema,
            updatedAt: dateSchema,
          },
        },
        Subscription: {
          type: "object",
          properties: {
            id: idSchema,
            userId: idSchema,
            stripeCustomerId: { type: "string", nullable: true },
            stripeSubscriptionId: { type: "string", nullable: true },
            status: {
              type: "string",
              enum: ["ACTIVE", "CANCELED", "PAST_DUE", "INCOMPLETE"],
            },
            currentPeriodEnd: { ...dateSchema, nullable: true },
            cancelAtPeriodEnd: { type: "boolean" },
            createdAt: dateSchema,
            updatedAt: dateSchema,
          },
        },
        Notification: {
          type: "object",
          properties: {
            id: idSchema,
            userId: idSchema,
            type: { type: "string" },
            message: { type: "string" },
            relatedEntityType: { type: "string", nullable: true },
            relatedEntityId: { type: "string", nullable: true },
            isRead: { type: "boolean" },
            createdAt: dateSchema,
          },
        },
        Review: {
          type: "object",
          properties: {
            id: idSchema,
            complaintId: idSchema,
            citizenId: idSchema,
            technicianId: idSchema,
            rating: { type: "integer", minimum: 1, maximum: 5 },
            comment: { type: "string", nullable: true },
            createdAt: dateSchema,
          },
        },
        AuditLog: {
          type: "object",
          properties: {
            id: idSchema,
            actorId: idSchema,
            action: { type: "string" },
            entityType: { type: "string" },
            entityId: idSchema,
            metadata: { nullable: true },
            createdAt: dateSchema,
          },
        },
      },
    },
  },
  apis: [
    "./src/modules/**/*.routes.ts",
    "./src/app.ts",
    "./src/routes/index.ts",
  ],
});
