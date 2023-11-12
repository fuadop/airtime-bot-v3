import 'reflect-metadata';
import { inspect } from 'util';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';

import container from './inversify.config';
import Network from './service/network';
import Bot from './service/bot';

// set up DI
const bot = container.resolve(Bot);

const handler: APIGatewayProxyHandler = async (event) => {
	console.log(inspect(event, false, null, false));

	let body = event.body,
		response: APIGatewayProxyResult = {
			statusCode: 200,
			body: 'Hello from Lambda!',
		},
		isFromTelegram = Network.isTelegram(
			Network.getIpAddress(event.headers as Record<string, string>),
		);

	if (!isFromTelegram) {
		console.log('Malicious request to webhook');

		return response;
	}

	// bot handleUpdate 
	await bot.handle(
		JSON.parse(body!),
	);

	return response;
};

export { handler };

