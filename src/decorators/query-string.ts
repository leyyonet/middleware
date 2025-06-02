import {decoratorPool} from "@leyyo/core";
import {FQN} from "../internal";
import {MdlMetadata} from "../pool";
import {$assert, $dev, $is} from "@leyyo/common";
import queryFn from "qs";
import {IdMiddleware} from "../index.symbols";

type O = queryFn.IParseOptions;

interface P {
    opt?: queryFn.IParseOptions;
}

/**
 * @example
 *
 * // on application
 * @QueryString() // with options: @QueryString({...})
 * @ResApp
 * export class MyApplication {
 * // ...
 * }
 *
 * // on controller
 * @QueryString() // with options: @QueryString({...})
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
 *  @QueryString() // with options: @QueryString({...})
 *  getUser(@Param() id: string) {}
 * }
 * */
export function QueryString(opt?: queryFn.IParseOptions): ClassDecorator {
    return clazz =>
        deco.process([clazz], {opt});
}

const deco = decoratorPool.newId<O, MdlMetadata<O>, P>(QueryString)
    .fqn(FQN)
    .targets('class')
    .keywords(IdMiddleware)
    .rules('no-multiple', 'no-inherited')
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
            initialize.app.native.set('query parser', (str: string) => queryFn.parse(str, opt));
        },
    })
;
