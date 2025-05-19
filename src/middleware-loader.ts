import {Fqn, Loader} from "@leyyo/core";

import {FQN_PCK} from "./internal";
import {middlewarePool} from "./pool";

@Loader(middlewarePool)
@Fqn(FQN_PCK)
export class MiddlewareLoader {

}
