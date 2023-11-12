import { Context, MiddlewareFn, NarrowedContext } from 'telegraf';
import { ChatJoinRequest, Message, Update } from 'telegraf/typings/core/types/typegram';
import Database from '../service/database';
import Phone from '../service/phone';
import Vendor from '../service/vendor';
import { injectable } from 'inversify';

type TextContext = NarrowedContext<
	Context<Update>, 
	{
		message: Update.New & Update.NonChannel & Message.TextMessage;
		update_id: number;
		chat_join_request?: ChatJoinRequest;
	}
>;

interface VendFields {
	Amount: number
	PhoneNumber: string
};

@injectable()
class BotController {
	private _db: Database;
	private _vendor: Vendor;

	// * DI
	constructor(database: Database, vendor: Vendor) {
		this._db = database;
		this._vendor = vendor;
	}

	private async isBotAdmin(ctx: TextContext): Promise<boolean> {
		if (!ctx.from)
			return false;

		return await this._db.admins.has(ctx.from.id);
	}

	private async isProperMention(ctx: TextContext): Promise<boolean> {
		if (!ctx.message)
			return false;
		if (!ctx.telegram)
			return false;

		const isMention = ctx.message.entities
			?.some(i => i.type === 'mention');

		if (!isMention)
			return false;

		const botInfo = await ctx.telegram.getMe(),
			botUsername = '@' + botInfo.username?.replace('@', '');

		const isMentionBot = ctx.message.text?.includes(botUsername);

		if (!isMentionBot)
			return false;

		return true;
	}

	private async deduceVendFields(ctx: TextContext): Promise<VendFields | null> {
		const text = ctx.message.text;
		if (!text)
			return null;

		let Amount: number = 0, 
			PhoneNumber: string,
			[amountSide, contactSide] = text.toLowerCase().split('for');

		// figure out the amount
		{
			const regex = new RegExp(/\d+/),
				matches = regex.exec(amountSide);

			const amount = matches?.[0];
			if (amount)
				Amount = parseInt(amount);
		}

		// figure the contact
		{
			let contact = contactSide.trim(),
				isPhoneNumber = Phone.isValid(contact);

			if (contact === 'me') 
				contact = '@' + ctx.from?.username?.replace('@', '');

			PhoneNumber = isPhoneNumber ?
				Phone.toString(contact) :
				await this._db.contacts.get(contact);
		}

		return (Amount && !isNaN(Amount) && PhoneNumber) ?
			{ Amount, PhoneNumber } :
			null;
	}

	// * middlewares
	public validationMiddleware: MiddlewareFn<Context<Update>> = async (ctx, next) => {
		const isBotAdmin = await this.isBotAdmin(ctx as TextContext),
			isProperMention = await this.isProperMention(ctx as TextContext);

		const isAuthorized = isProperMention && isBotAdmin;
		if (isAuthorized)
			return await next();


		// reply error message
		if (isProperMention)
			return await ctx.reply('Don\'t talk to me! 🙅‍♀️');
	}

	public reflectionMiddleware: MiddlewareFn<Context<Update>> = async (ctx, next) => {

		const botInfo = await ctx.telegram.getMe(),
			botUsername = '@' + botInfo.username?.replace('@', ''),
			name = ctx.from?.first_name ?? ctx.from?.username ?? '',
			// @ts-ignore
			request = ctx.message?.text?.replace(botUsername, '').trim();

		await ctx.reply(`Howdy ${name ?? 'champ'} 👋, You said ${request}.`);

		return await next();
	}

	// * controllers
	public async handleFor(ctx: TextContext) {
		try {
			const fields = await this.deduceVendFields(ctx);
			if (!fields)
				throw new Error('Unable to deduce amount and/or phone number');

			const res = await this._vendor.vendAirtime(fields.Amount, fields.PhoneNumber);
			if (!res.data)
				throw new Error(res.message ?? 'Vendor API Error');

			const prefix = res.status === 'success' ? '✅' : '⚠️';
			await ctx.reply(`${prefix} Transaction ${res.data.reference} finished with status of ${res.status}.`);

			const resp = await this._vendor.getBill(res.data.reference);
			if (!resp.data)
				throw new Error(resp.message ?? 'Vendor API Error');

			return await ctx.reply(
				`Airtime recharge for ${res.data.phone_number} (₦ ${resp.data.amount}) on ${resp.data.transaction_date}.\n`+
				`You were charged ₦ ${res.data.amount - resp.data.commission}, you saved ₦ ${resp.data.commission} 🎉.`,
			);
		} catch (error) {
			if (error.name === 'InvalidPhoneError')
				return await ctx.reply('Invalid phone number, please confirm phone number and try again.');

			return await ctx.reply('❌ Request failed due to: ' + error.message ?? error.name);
		};
	}

	public async handleBalance(ctx: TextContext) {
		try {
			const res = await this._vendor.getBalance();
			if (!res.data)
				throw new Error(res.message ?? 'Vendor API Error');

			await ctx.reply(`💰 Your wallet balance is ₦ ${res.data.available_balance}.`);

			const resp = await this._vendor.getSummary();

			return await ctx.reply(`📊 *Stats*\n\nSpent: ₦ ${resp.sum_bills}\nSaved: ₦ ${resp.sum_commission}\nRecharges: ${resp.count_airtime}.`);
		} catch (error) {
			return await ctx.reply('❌ Request failed due to: ' + error.message ?? error.name);
		};
	}

	public async handleHelp(ctx: TextContext) {
		return await ctx.reply('1. balance\n2. <amount> for <phone_number> (e.g 500 for 08153207998)');
	}

	public async handleFallback(ctx: TextContext) {
		return ctx.reply('I can\'t be of help. 🫠');
	}
}

export default BotController;

