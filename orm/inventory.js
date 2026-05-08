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

function getModeEntries(mode) {
  if (!mode) {
    return [];
  }

  if (mode instanceof Map) {
    return Array.from(mode.entries());
  }

  if (Array.isArray(mode)) {
    return mode.flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return [];
      }

      if (entry instanceof Map) {
        return Array.from(entry.entries());
      }

      return Object.entries(entry);
    });
  }

  return Object.entries(mode);
}

function getModeKeys(mode) {
  return getModeEntries(mode).map(([key]) => key);
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
    type: [orm.Schema.Types.Mixed],
    validate: {
      validator(mode) {
        return getModeEntries(mode).every(([key, value]) => {
          const quantity = Number(value);

          return (
            allowedModeKeySet.has(key) &&
            Number.isInteger(quantity) &&
            quantity >= 0
          );
        });
      },
      message: `Mode must be an array using these keys with integer quantities: ${ALLOWED_MODE_KEYS.join(", ")}`,
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
