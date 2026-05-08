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

const inventorySchema = new orm.Schema({
  name: String,
  buyingPrice: {
    type: Number,
    min: 0,
  },
  sellingPrice: {
    type: Number,
    min: 0,
  },
  mode: {
    type: Map,
    of: {
      type: Number,
      min: 0,
      validate: {
        validator(value) {
          return Number.isInteger(value);
        },
        message: "Mode quantity must be an integer",
      },
    },
    validate: {
      validator(mode) {
        return getModeKeys(mode).every((key) => allowedModeKeySet.has(key));
      },
      message: `Mode can only contain these keys: ${ALLOWED_MODE_KEYS.join(", ")}`,
    },
  },
  defaultMode: {
    type: String,
    enum: ALLOWED_MODE_KEYS,
    trim: true,
    validate: {
      validator(value) {
        return !value || getModeKeys(this.mode).includes(value);
      },
      message: "Default mode must be one of the item's mode keys",
    },
  },
  category: String,
  weight: String,
});

inventorySchema.pre("validate", function setDefaultMode() {
  if (this.defaultMode) {
    return;
  }

  const [firstModeKey] = getModeKeys(this.mode);
  if (firstModeKey) {
    this.defaultMode = firstModeKey;
  }
});

module.exports = inventorySchema;
