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

const orderItemSchema = new orm.Schema(
  {
    itemId: {
      type: orm.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    name: String,
    mode: {
      type: String,
      required: true,
      enum: ALLOWED_MODE_KEYS,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new orm.Schema(
  {
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "Order must contain at least one item",
      },
    },
    estimatedTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      required: true,
      default: "Pending",
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["Shop", "Customer"],
      trim: true,
    },
    vendor: {
      type: String,
      trim: true,
    },
    orderSlip: {
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

orderSchema.pre("validate", function calculateOrderTotals() {
  this.items = this.items.map((item) => {
    if (item.total == null) {
      item.total = item.quantity * item.price;
    }
    return item;
  });

  if (this.estimatedTotal == null) {
    this.estimatedTotal = this.items.reduce((sum, item) => sum + item.total, 0);
  }
});
orderSchema.pre("validate", function () {
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  this.createdAt = new Date(Date.now() + IST_OFFSET);
});

module.exports = orderSchema;
