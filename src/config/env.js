const Joi = require("joi");

const schema = Joi.object({
  PORT: Joi.number().port().default(3000),

  MONGODB_URI: Joi.string()
    .pattern(/^mongodb(\+srv)?:\/\/.+/)
    .required()
    .messages({
      "string.pattern.base":
        "MONGODB_URI must be a valid MongoDB connection string.",
    }),

  JWT_SECRET: Joi.string().min(10).required(),

  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),

  CLIENT_URL: Joi.string().uri().optional(),
}).unknown(true);

const { error, value } = schema.validate(process.env, {
  abortEarly: false,
  stripUnknown: true,
});

if (error) {
  throw new Error(
    `Environment validation error: ${error.details
      .map((d) => d.message)
      .join(", ")}`,
  );
}

module.exports = value;
