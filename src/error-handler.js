require("dotenv").config();
const { NODE_ENV } = require("./config");
function errorHandler(error, req, res, next) {
	let response;
	if (NODE_ENV === "production") {
		response = { error: { message: "server error" } };
	} else {
		console.error(error);
		response = { message: error.mesage, error };
	}
	res.status(500).json(response);
}
module.exports = errorHandler;
