import { Container } from 'inversify';
import Database from './service/database';
import Vendor from './service/vendor';
import BotController from './controller/bot';
import Bot from './service/bot';

var container = new Container();
container.bind<Vendor>(Vendor).toSelf();
container.bind<Database>(Database).toSelf();
container.bind<BotController>(BotController).toSelf();

container.bind<Bot>(Bot).toSelf();

export default container;
