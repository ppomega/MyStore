const orm = require("mongoose");

const borrowerPaymentSchema = new orm.Schema(
  {
    borrower: {
      type: orm.Schema.Types.ObjectId,
      ref: "Borrower",
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

module.exports = borrowerPaymentSchema;