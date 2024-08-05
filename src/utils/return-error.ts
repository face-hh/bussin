import { RuntimeVal } from "../runtime/values";

export default class ReturnError { // Made class for instanceof thing so that normal errors don't get caught :D
	message?: RuntimeVal;
	constructor(message?: RuntimeVal) {
		this.message = message;
	}
}