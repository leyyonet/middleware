import {decoratorPool} from "@leyyo/core";
import {FQN_PCK} from "../internal";
import {MdlMetadata} from "../pool";
import {$assert, $dev, $is} from "@leyyo/common";
import cors from "cors";

type O = cors.CorsOptions;

interface P {
    opt?: cors.CorsOptions;
}
/**
 * @example
 *
 * // on application
 * @Cors() // with options: @Cors({...})
 * @ResApp
 * export class MyApplication {
 * // ...
 * }
 *
 * // on controller
 * @Cors() // with options: @Cors({...})
 * @Controller('users')
 * export class MyController {
 * // ...
 * }
 *
 * // on endpoint
 * @Controller('users')
 * export class MyController {
 *
 *  @Get(':id')
 *  @Cors() // with options: @Cors({...})
 *  getUser(@Param() id: string) {}
 * }
 * */
export function Cors(opt?: cors.CorsOptions): ClassDecorator;
export function Cors(opt?: cors.CorsOptions): MethodDecorator;
export function Cors(opt?: cors.CorsOptions): ClassDecorator|MethodDecorator {
    return (clazz, property, descriptor) =>
        deco.process([clazz, property, descriptor], {opt});
}

const deco = decoratorPool.newId<O, MdlMetadata<O>, P>(Cors)
    .fqn(FQN_PCK)
    .targets('class', 'method')
    .rules('no-multiple', 'no-inherited', 'no-static')
    .keywords('middleware')
    .processor((ins, p) => {
        if (!$is.empty(p.opt)) {
            $assert.bareObject(p.opt, () => $dev.desc(ins, {field: 'option'}));
        }
        ins.set(p.opt);
    })
    .metadata({
        before: true,
        scopes: ['rest-app', 'controller', 'endpoint'],
        apply: (opt, ctx) => {
            const ct = ctx.asHttp();
            if (ct.endpoint) {
                ct.endpoint.controller.router.options(ct.endpoint.path, cors(opt));
            }
            else if (ct.controller) {
                ct.controller.router.options(ct.controller.path, cors(opt));
            }
            else {
                ct.app.use(cors(opt));
            }
        },
    })
;
