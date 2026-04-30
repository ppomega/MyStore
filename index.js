const express = require("express");
const mainRouter = require("./routes");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use("/", mainRouter);

app.listen(8000, () => {
  console.log("Server Sarted");
});
