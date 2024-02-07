import WebSocket from "ws";

class BinaryAPI {
	constructor(app_id, token, balance, risk, currency) {
		this.ws = new WebSocket(
			`wss://ws.derivws.com/websockets/v3?app_id=${app_id}`,
		);
		this.ws.setMaxListeners(50);
		this.token = token;
		this.balance = balance;
		this.risk = risk;
		this.short_term_prices = [];
		this.long_term_prices = [];
		this.currency = currency;
		this.resistanceLevel = null;
		this.supportLevel = null;
		this.strategies = [];

		this.ws.on("open", () => {
			this.startTrading();
		});
	}

	calculate_trade_size() {
		return this.balance * this.risk;
	}

	// This method is used to get the price of a symbol
	async get_price(symbol) {
		const params = {
			ticks_history: symbol,
			end: "latest",
			start: 1,
			style: "candles",
			adjust_start_time: 1,
			count: 1,
		};

		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(params));
		} else {
			console.error("WebSocket is not open");
		}

		return new Promise((resolve, reject) => {
			this.ws.once("message", (data) => {
				resolve(JSON.parse(data));
			});
		});
	}

	// This method is used to update the short-term and long-term moving averages
	update_prices(price) {
		if (this.short_term_prices.length >= 5) {
			this.short_term_prices.shift();
		}
		this.short_term_prices.push(price);
		if (this.long_term_prices.length >= 20) {
			this.long_term_prices.shift();
		}
		this.long_term_prices.push(price);
	}

	// This method is used to check if the short-term moving average crosses the long-term moving average
	check_crossing() {
		if (
			this.short_term_prices.length < 5 ||
			this.long_term_prices.length < 20
		) {
			return null;
		}

		const short_sma =
			this.short_term_prices.reduce((a, b) => a + b, 0) /
			this.short_term_prices.length;
		const long_sma =
			this.long_term_prices.reduce((a, b) => a + b, 0) /
			this.long_term_prices.length;

		if (short_sma > long_sma) {
			return "buy";
		}
		if (short_sma < long_sma) {
			return "sell";
		}
		return null;
	}

	// This method is used to calculate the relative strength index (RSI)
	calculate_rsi(period = 14) {
		if (this.short_term_prices.length < period) {
			return null;
		}

		let gains = 0;
		let losses = 0;

		for (let i = 1; i < this.short_term_prices.length; i++) {
			const difference =
				this.short_term_prices[i] - this.short_term_prices[i - 1];
			if (difference > 0) {
				gains += difference;
			} else {
				losses += Math.abs(difference);
			}
		}

		const averageGain = gains / period;
		const averageLoss = losses / period;

		if (averageLoss === 0) {
			return "buy";
		}

		const rs = averageGain / averageLoss;
		const rsi = 100 - 100 / (1 + rs);

		if (rsi > 70) {
			return "sell";
		}
		if (rsi < 30) {
			return "buy";
		}
		return null;
	}

	// This method is used to calculate the support and resistance levels
	calculate_support_and_resistance() {
		const prices = this.short_term_prices;
		this.supportLevel = Math.min(...prices);
		this.resistanceLevel = Math.max(...prices);
	}

	// This method is used to calculate the support and resistance levels
	calculate_breakout() {
		if (this.short_term_prices.length < 2) {
			return null;
		}

		const currentPrice =
			this.short_term_prices[this.short_term_prices.length - 1];
		const previousPrice =
			this.short_term_prices[this.short_term_prices.length - 2];

		if (
			currentPrice > this.resistanceLevel &&
			previousPrice <= this.resistanceLevel
		) {
			return "buy";
		}
		if (
			currentPrice < this.supportLevel &&
			previousPrice >= this.supportLevel
		) {
			return "sell";
		}
		return null;
	}

	calculate_mean_reversion() {
		const prices = this.long_term_prices;
		const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
		const currentPrice =
			this.short_term_prices[this.short_term_prices.length - 1];

		if (currentPrice > mean) {
			return "sell";
		}
		if (currentPrice < mean) {
			return "buy";
		}
		return "hold";
	}

	// This method is used to start the trading bot
	startTrading() {
		setInterval(async () => {
			const response = await this.get_price(this.currency);
			const price = response.candles[0].close;
			this.update_prices(price);

			this.calculate_support_and_resistance();

			const signals = this.strategies.map((strategy) => strategy());

			const buySignals = signals.every((signal) => signal === "buy");
			const sellSignals = signals.every((signal) => signal === "sell");

			if (buySignals) {
				const trade_size = this.calculate_trade_size();
				console.log(`Signal: buy, Trade size: ${trade_size}`);
			}

			if (sellSignals) {
				const trade_size = this.calculate_trade_size();
				console.log(`Signal: sell, Trade size: ${trade_size}`);
			}
		}, 1000);
	}
}

export default BinaryAPI;
