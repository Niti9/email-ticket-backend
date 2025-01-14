// import mongoose from "mongoose";
// import dotenv from "dotenv";
// dotenv.config({ path: "./config.env" });

// const DB = process.env.DATABASE;

// mongoose
//   .connect(DB)
//   .then(() => {
//     console.log("DB Connection successful");
//   })
//   .catch((err) => console.error("DB connection error:", err));

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });
const DB = process.env.DATABASE;
mongoose
  .connect(DB, {
    serverSelectionTimeoutMS: 5000 // Adjust timeout for server selection
  })
  .then(() => {
    console.log(`MongoDB Connected:  with ${process.env.DATABASE}`);
  })
  .catch((err) => {
    console.error(`DB connection error: ${err.message}`);
    process.exit(1);
  });
