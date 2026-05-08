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

function getModeFromValidationContext(context) {
  if (context.mode) {
    return context.mode;
  }

  if (typeof context.get === "function") {
    return context.get("mode");
  }

  if (typeof context.getUpdate === "function") {
    const update = context.getUpdate();
    return update && (update.mode || (update.$set && update.$set.mode));
  }

  return undefined;
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
        const mode = getModeFromValidationContext(this);
        return !value || getModeKeys(mode).includes(value);
      },
      message: "Default mode must be one of the item's mode keys",
    },
  },
  category: String,
  weight: {
    type: String,
    trim: true,
    validate: {
      validator(value) {
        const mode = getModeFromValidationContext(this);
        return !value || getModeKeys(mode).includes("Loose");
      },
      message: "Weight can only be defined for Loose items",
    },
  },
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
