const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Image Processing Service API",
      version: "1.0.0",
      description:
        "Backend API for uploading, transforming, retrieving, and managing images.",
    },

    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://image-processing-service-8wui.onrender.com"
            : "http://localhost:3000",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
