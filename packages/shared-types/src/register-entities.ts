import { registerEntity } from "@repo/entities";

import { Customer } from "./entities/customer.js";
import { Order } from "./entities/order.js";

registerEntity(Customer);
registerEntity(Order);
