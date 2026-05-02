// src/server/app.ts
import express from "express";
import routes from "./routes.js";
const app = express();

app.use(routes);
app.get("/", (req, res) => {
  res.send("Server running");
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});