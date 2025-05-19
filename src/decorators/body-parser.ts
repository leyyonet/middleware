import {decoratorPool} from "@leyyo/core";
import {FQN_PCK} from "../internal";
import {$assert, $dev, $is} from "@leyyo/common";
import bodyFn from "body-parser";
import {MdlMetadata} from "../pool";

type O = bodyFn.OptionsJson;

interface P {
    opt?: bodyFn.OptionsJson;
}

/**
 * @example
 *
 * // on application
 * @BodyParser() // with options: @BodyParser({...})
 * @ResApp
 * export class MyApplication {
 * // ...
 * }
 *
 * // on controller
 * @BodyParser() // with options: @BodyParser({...})
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
 *  @BodyParser() // with options: @BodyParser({...})
 *  getUser(@Param() id: string) {}
 * }
 * */
export function BodyParser(opt?: bodyFn.OptionsJson): ClassDecorator {
    return clazz =>
        deco.process([clazz], {opt});
}

const deco = decoratorPool.newId<O, MdlMetadata<O>, P>(BodyParser)
    .fqn(FQN_PCK)
    .targets('class')
    .rules('no-multiple', 'no-inherited')
    .keywords('middleware')
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
            const ct = ctx.asHttp();
            ct.app.use(bodyFn.json(opt));
        },
    })
;
