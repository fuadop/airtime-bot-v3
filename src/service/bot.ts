import { Telegraf } from 'telegraf';
import { injectable } from 'inversify';
import { Update } from 'telegraf/typings/core/types/typegram';
import BotController from '../controller/bot';

@injectable()
class Bot {
	private _bot: Telegraf
	private _controller: BotController

	// * DI
	constructor(botController: BotController) {
		this._bot = new Telegraf(process.env.BOT_TOKEN!);

		this._controller = botController;

		this.register();
	}

	async send(text: string, chatId: string | number = '-657547641') {
		return await this._bot.telegram.sendMessage(chatId, text);
	}

	// Handle webhook request
	async handle(update: Record<string, any>) {
		await this._bot.handleUpdate(update as Update);
	}

	// Register Events
	register() {
		this._bot.use(
			// * validation middleware
			this._controller.validationMiddleware.bind(this._controller),
			// * reflection middleware
			this._controller.reflectionMiddleware.bind(this._controller),
		);

		// * vend airtime
		this._bot.hears(/for/gmi, this._controller.handleFor.bind(this._controller));

		// * metrics and balance
		this._bot.hears(/balance/gmi, this._controller.handleBalance.bind(this._controller));

		// * help
		this._bot.hears(/help/gmi, this._controller.handleHelp.bind(this._controller));

		// * reply unknown
		this._bot.use(this._controller.handleFallback.bind(this._controller));
		// this._bot.on('text', this._controller.handleFallback);
	}
}

export default Bot;

