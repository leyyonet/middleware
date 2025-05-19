import {decoratorPool} from "@leyyo/core";
import {FQN_PCK} from "../internal";
import {MdlMetadata} from "../pool";
import {$assert, $dev, $is} from "@leyyo/common";
import helmet, {HelmetOptions} from "helmet";

type O = HelmetOptions;

interface P {
    opt?: HelmetOptions;
}

/**
 * @example
 *
 * // on application
 * @Helmet() // with options: @Helmet({...})
 * @ResApp
 * export class MyApplication {
 * // ...
 * }
 *
 * // on controller
 * @Helmet() // with options: @Helmet({...})
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
 *  @Helmet() // with options: @Helmet({...})
 *  getUser(@Param() id: string) {}
 * }
 * */
export function Helmet(opt?: HelmetOptions): ClassDecorator {
    return clazz =>
        deco.process([clazz], {opt});
}

const deco = decoratorPool.newId<O, MdlMetadata<O>, P>(Helmet)
    .fqn(FQN_PCK)
    .targets('class')
    .keywords('middleware')
    .rules('no-multiple', 'no-inherited')
    .processor((ins, p) => {
        if (!$is.empty(p.opt)) {
            $assert.bareObject(p.opt, () => $dev.desc(ins, {field: 'option'}));
        }
        ins.set(p.opt);
    })
    .metadata({
        before: true,
        scopes: ['rest-app'],
        apply: (opt, ctx) => {
            ctx.asHttp().app.use(helmet(opt));
        },
    })
;
