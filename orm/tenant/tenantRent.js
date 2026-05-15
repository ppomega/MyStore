const orm = require("mongoose");

const tenantRentSchema = new orm.Schema(
  {
    tenant: {
      type: orm.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    month: {
      type: Date,
      required: true,
    },
    roomRent: {
      type: Number,
      required: true,
      min: 0,
    },
    beforeUnits: {
      type: Number,
      required: true,
      min: 0,
    },
    afterUnits: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value) {
          const beforeUnits =
            this.beforeUnits ??
            (typeof this.get === "function" ? this.get("beforeUnits") : undefined);

          return beforeUnits == null || value >= beforeUnits;
        },
        message: "After units must be greater than or equal to before units",
      },
    },
    units: {
      type: Number,
      required: true,
      min: 0,
    },
    unitRate: {
      type: Number,
      required: true,
      min: 0,
      default: 8,
    },
    totalRent: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ["Paid", "Pending"],
      default: "Pending",
      trim: true,
    },
    rentSlip: {
      filePath: {
        type: String,
        trim: true,
      },
      fileName: {
        type: String,
        trim: true,
      },
      generatedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = tenantRentSchema;
