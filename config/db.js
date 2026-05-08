const orm = require("mongoose");
require("dotenv").config();

async function connectToDb() {
  if (orm.connection.readyState === 1) {
    return;
  }

  await orm.connect(process.env.DB);
}

module.exports = {
  connectToDb,
};
