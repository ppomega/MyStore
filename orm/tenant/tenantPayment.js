const orm = require("mongoose");

const tenantPaymentSchema = new orm.Schema(
  {
    tenant: {
      type: orm.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = tenantPaymentSchema;