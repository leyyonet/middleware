import {Fqn} from "@leyyo/core";
import {Loader} from "@leyyo/injection";

import {FQN} from "./internal";
import {middlewarePool} from "./pool";

@Loader(middlewarePool)
@Fqn(FQN)
export class MiddlewareLoader {

}
