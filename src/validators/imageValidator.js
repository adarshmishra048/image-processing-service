const Joi = require("joi");

const resizeSchema = Joi.object({
  width: Joi.number().integer().min(1).max(10000).required(),

  height: Joi.number().integer().min(1).max(10000).required(),
});

const cropSchema = Joi.object({
  x: Joi.number().integer().min(0).required(),
  y: Joi.number().integer().min(0).required(),
  width: Joi.number().integer().min(1).required(),
  height: Joi.number().integer().min(1).required(),
});

const operationSchema = Joi.alternatives().try(
  Joi.object({
    type: Joi.string().valid("resize").required(),
    width: Joi.number().integer().min(1).max(10000).required(),
    height: Joi.number().integer().min(1).max(10000).required(),
  }),
  Joi.object({
    type: Joi.string().valid("crop").required(),
    x: Joi.number().integer().min(0).required(),
    y: Joi.number().integer().min(0).required(),
    width: Joi.number().integer().min(1).required(),
    height: Joi.number().integer().min(1).required(),
  }),
  Joi.object({
    type: Joi.string().valid("rotate").required(),
    angle: Joi.number().min(-360).max(360).required(),
  }),
  Joi.object({
    type: Joi.string().valid("blur").required(),
    value: Joi.number().min(0).max(100).required(),
  }),
  Joi.object({
    type: Joi.string().valid("format").required(),
    value: Joi.string().valid("jpg", "jpeg", "png", "webp").required(),
  }),
  Joi.object({
    type: Joi.string().valid("grayscale").required(),
  }),
  Joi.object({
    type: Joi.string().valid("sepia").required(),
  }),
);

const operationsSchema = Joi.array().items(operationSchema).max(20).optional();

const transformSchema = Joi.object({
  resize: resizeSchema.optional(),

  crop: cropSchema.optional(),

  operations: operationsSchema,

  rotate: Joi.number().min(0).max(360).optional(),

  flip: Joi.boolean().optional(),

  mirror: Joi.boolean().optional(),

  grayscale: Joi.boolean().optional(),

  sepia: Joi.boolean().optional(),

  blur: Joi.alternatives()
    .try(Joi.boolean(), Joi.number().min(0.3).max(100))
    .optional(),

  sharpen: Joi.boolean().optional(),

  format: Joi.string().valid("jpg", "jpeg", "png", "webp").optional(),
})
  .min(1) // at least one transformation
  .required();

module.exports = {
  transformSchema,
};
