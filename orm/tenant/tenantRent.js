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
    units: {
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
