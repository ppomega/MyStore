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
    debt: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    lastCredit: Date,
    lastDebit: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = borrowerSchema;
