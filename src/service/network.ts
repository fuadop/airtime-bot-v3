import { cidrSubnet } from 'ip';

class Network {
	static getIpAddress(headers: Record<string, string>): string {
		const keys = [
			'X-Forwarded-For',
			'x-forwarded-for',
			'X-FORWARDED-FOR',
			'X-Real-Ip',
			'x-real-ip',
			'X-REAL-IP',
		];

		const key = keys.find(k => !!headers?.[k]);

		return key ?
			headers[key] :
			'';
	}

	static isTelegram(ipAddress: string): boolean {
		const addresses = ipAddress
			.split(',').map(i => i.trim());

		return addresses.some(i => 
			cidrSubnet('91.108.4.0/22').contains(i) ||
			cidrSubnet('149.154.160.0/20').contains(i)
		);
	}
}

export default Network;

