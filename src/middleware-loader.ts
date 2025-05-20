import {Fqn} from "@leyyo/core";
import {Loader} from "@leyyo/injection";

import {FQN_PCK} from "./internal";
import {middlewarePool} from "./pool";

@Loader(middlewarePool)
@Fqn(FQN_PCK)
export class MiddlewareLoader {

}
