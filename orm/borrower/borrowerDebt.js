const orm = require("mongoose");

const borrowerDebtSchema = new orm.Schema(
  {
    borrower: {
      type: orm.Schema.Types.ObjectId,
      ref: "Borrower",
      required: true,
    },
    debtTaken: {
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

module.exports = borrowerDebtSchema;
