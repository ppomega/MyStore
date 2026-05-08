const orm = require("mongoose");

const tenantSchema = new orm.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: false,
      trim: true,
    },
    rent: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    doj: {
      type: Date,
      default: Date.now,
    },
    lastRent: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = tenantSchema;
