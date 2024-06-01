import 'reflect-metadata';
import container from './inversify.config';

import Bot from './service/bot';
import Vendor from './service/vendor/vtu-ng';
import Database, { Schedule } from './service/database';

// set up DI
const bot = container.resolve(Bot),
	db = container.resolve(Database),
	vendor = container.resolve(Vendor);

const handler = async () => {
	const schedules: Schedule[] = await db.schedules.weekly();
	
	for (const schedule of schedules) {
		try {
			const res = await vendor.vendAirtime(schedule.Amount, schedule.PhoneNumber);
			if (!res.data)
				throw new Error(res.message ?? 'Vendor API Error');

			const resp = await vendor.getBill(res.data.reference);
			if (!resp.data)
				throw new Error(res.message ?? 'Vendor API Error');

			await bot.send(
`Hey there ${schedule.PhoneNumber}, your weekly recharge of ₦ ${schedule.Amount} completed with a status of ${res.status}.

Transaction ID: ${res.data.reference}
You were charged ₦ ${res.data.amount - resp.data.commission} and you saved ₦ ${resp.data.commission} 🎉.
Have a great week champ ❤️.`
			);
		} catch (error) {
			console.log(error);

			const message = error.message ?? error.name ?? '';

			await bot.send(`Hey there ${schedule.PhoneNumber}, your weekly recharge of ₦ ${schedule.Amount} failed ❌. ${message}`);
		};
	}
};

export { handler };

