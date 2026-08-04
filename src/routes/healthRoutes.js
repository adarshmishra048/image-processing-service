const express = require("express");
const router = express.Router();

const { livez, readyz } = require("../controllers/healthController");

router.get("/livez", livez);
router.get("/readyz", readyz);

module.exports = router;
