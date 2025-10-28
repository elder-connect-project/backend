// swagger.js
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const redoc = require("redoc-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My Backend API",
      version: "1.0.0",
      description: "Scalar-like API docs for Node.js backend",
    },
    servers: [
      { url: "http://localhost:5000" } // Change port if needed
    ],
  },
  apis: ["./routes/*.js"], // Path to your route files
};

const specs = swaggerJsDoc(options);

function setupDocs(app) {
  // Swagger UI (interactive testing)
  app.use("/swagger", swaggerUi.serve, swaggerUi.setup(specs));

  // Redoc UI (modern look)
  app.get(
    "/docs",
    redoc({
      title: "API Docs",
      specUrl: "/swagger.json",
    })
  );

  // Raw OpenAPI JSON
  app.get("/swagger.json", (req, res) => res.json(specs));
}

module.exports = setupDocs;
