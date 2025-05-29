const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/DB");
const authRouter = require("./routes/authRoutes");
const propertiesRouter = require("./routes/propertiesRoutes");
const favouritesRouter = require("./routes/favouriteRoutes");
const recommendationsRouter = require("./routes/recommendationsRoutes");
const { connectRedis } = require("./config/Redis");

app.use(cors());

app.use(express.json());
app.get("/", (req, res) => {
  res.json("deployed successfully");
});

app.use("/api/auth", authRouter);
app.use("/api/properties", propertiesRouter);
app.use("/api/favourites", favouritesRouter);
app.use("/api/recommendations", recommendationsRouter);

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

connectDB();
connectRedis();
