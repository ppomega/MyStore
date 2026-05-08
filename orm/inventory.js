const orm = require("mongoose");

const ALLOWED_MODE_KEYS = [
  "Loose",
  "Piece",
  "Bottle",
  "Packet",
  "Ladi",
  "Set",
  "Bag",
  "Katta",
  "Petti",
];

const allowedModeKeySet = new Set(ALLOWED_MODE_KEYS);

function getModeKeys(mode) {
  if (!mode) {
    return [];
  }

  if (mode instanceof Map) {
    return Array.from(mode.keys());
  }

  return Object.keys(mode);
}

module.exports = new orm.Schema({
  name: String,
  buyingPrice: Number,
  sellingPrice: Number,
  mode: {
    type: Map,
    of: {
      type: Number,
      validate: {
        validator(value) {
          return Number.isInteger(value);
        },
        message: "Mode quantities must be integers",
      },
    },
    validate: {
      validator(mode) {
        return getModeKeys(mode).every((key) => allowedModeKeySet.has(key));
      },
      message: `Mode can only contain these keys: ${ALLOWED_MODE_KEYS.join(", ")}`,
    },
  },
  category: String,
  weight: String,
});
