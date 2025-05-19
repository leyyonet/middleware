import {decoratorPool} from "@leyyo/core";
import {FQN_PCK} from "../internal";
import {MdlMetadata} from "../pool";
import {$assert, $dev, $is} from "@leyyo/common";
import queryFn from "qs";

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
            ctx.asHttp().app.set('query parser', (str: string) => queryFn.parse(str, opt));
        },
    })
;
