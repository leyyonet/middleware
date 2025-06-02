import {decoratorPool} from "@leyyo/core";
import {FQN} from "../internal";
import {$assert, $dev, $is} from "@leyyo/common";
import bodyFn from "body-parser";
import {MdlMetadata} from "../pool";
import {IdMiddleware} from "../index.symbols";

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
        id.process([clazz], {opt});
}

const id = decoratorPool.newId<O, MdlMetadata<O>, P>(BodyParser)
    .fqn(FQN)
    .targets('class')
    .rules('no-multiple', 'no-inherited')
    .keywords(IdMiddleware)
    .processor((ins, p) => {
        if (!$is.empty(p.opt)) {
            $assert.bareObject(p.opt, () => $dev.desc(ins, {field: 'option'}));
        }
        ins.set(p.opt);
    })
    .metadata({
        before: true,
        scopes: ['app'],
        apply: (opt, initialize) => {
            initialize.app.native.use(bodyFn.json(opt));
        },
    })
;
