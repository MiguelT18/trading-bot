import BinaryAPI from "./api/BinaryAPI.js";
import { configDotenv } from "dotenv";
import express from "express";
configDotenv();

const app = express();

app.get("/", (req, res) => {
	res.send("Hello World");
});

const port = process.env.PORT || 3000;
const api_key = process.env.API_KEY;
const api_id = process.env.API_ID;

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});

const api = new BinaryAPI(api_id, api_key, 100, 0.02, "frxEURUSD");

const strategies = [
	api.check_crossing.bind(api),
	api.calculate_rsi.bind(api),
	api.calculate_breakout.bind(api),
	api.calculate_mean_reversion.bind(api),
];

if (strategies && strategies.length > 0) {
	api.startTrading(strategies);
} else {
	console.error("Strategies array is undefined or empty");
}

app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send("Something went wrong!");
});
