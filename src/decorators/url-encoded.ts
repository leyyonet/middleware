import {decoratorPool} from "@leyyo/core";
import {FQN} from "../internal";
import {MdlMetadata} from "../pool";
import {$assert, $dev, $is} from "@leyyo/common";
import bodyFn from "body-parser";
import {IdMiddleware} from "../index.symbols";

type O = bodyFn.OptionsUrlencoded;

interface P {
    opt?: bodyFn.OptionsUrlencoded;
}

/**
 * @example
 *
 * // on application
 * @UrlEncoded() // with options: @UrlEncoded({...})
 * @ResApp
 * export class MyApplication {
 * // ...
 * }
 *
 * // on controller
 * @UrlEncoded() // with options: @UrlEncoded({...})
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
 *  @UrlEncoded() // with options: @UrlEncoded({...})
 *  getUser(@Param() id: string) {}
 * }
 * */
export function UrlEncoded(opt?: bodyFn.OptionsUrlencoded): ClassDecorator {
    return clazz =>
        deco.process([clazz], {opt});
}

const deco = decoratorPool.newId<O, MdlMetadata<O>, P>(UrlEncoded)
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
            initialize.app.native.use(bodyFn.urlencoded(opt));
        },
    })
;
