const orm = require("mongoose");

const borrowerSchema = new orm.Schema(
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
    initialDebt: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    debt: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    lastCredit: Date,
    lastDebit: Date,
    lastCreditedValue: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    lastDebitedValue: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = borrowerSchema;
