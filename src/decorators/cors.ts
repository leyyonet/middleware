import {decoratorPool} from "@leyyo/core";
import {FQN} from "../internal";
import {MdlMetadata} from "../pool";
import {$assert, $dev, $is, Func} from "@leyyo/common";
import cors from "cors";
import {IdMiddleware} from "../index.symbols";

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
export function Cors(opt?: cors.CorsOptions): PropertyDecorator;
export function Cors(opt?: cors.CorsOptions): ClassDecorator|MethodDecorator|PropertyDecorator {
    return (clazz: Func, property?: PropertyKey, descriptor?: TypedPropertyDescriptor<any>) =>
        id.process([clazz, property, descriptor], {opt});
}

const id = decoratorPool.newId<O, MdlMetadata<O>, P>(Cors)
    .fqn(FQN)
    .targets('class', 'method', 'field')
    .rules('no-multiple', 'no-inherited', 'no-static')
    .keywords(IdMiddleware)
    .processor((ins, p) => {
        if (!$is.empty(p.opt)) {
            $assert.bareObject(p.opt, () => $dev.desc(ins, {field: 'option'}));
        }
        ins.set(p.opt);
    })
    .metadata({
        before: true,
        scopes: ['app', 'controller', 'endpoint'],
        apply: (opt, initialize) => {
            if (initialize.endpoint) {
                initialize.endpoint.parent.router.options(initialize.endpoint.path, cors(opt));
            }
            else if (initialize.controller) {
                initialize.controller.router.use(cors(opt));
            }
            else {
                initialize.app.native.use(cors(opt));
            }
        },
    })
;
