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

const transformSchema = Joi.object({
  resize: resizeSchema.optional(),

  crop: cropSchema.optional(),

  rotate: Joi.number().valid(0, 90, 180, 270, 360).optional(),

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
