const validate = (Schema) => {
  return (req, res, next) => {
    const { error, value } = Schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((detail) => detail.message),
      });
    }

    req.body = value;

    next();
  };
};

module.exports = validate;
