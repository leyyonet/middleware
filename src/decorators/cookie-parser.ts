import {decoratorPool} from "@leyyo/core";
import {FQN_PCK} from "../internal";
import {MdlMetadata} from "../pool";
import {$assert, $dev, $is, OneOrMore} from "@leyyo/common";
import cookieParser from "cookie-parser";

interface O {
    secrets: Array<string>;
    opt: cookieParser.CookieParseOptions;
}

interface P {
    v1?: OneOrMore<string> | cookieParser.CookieParseOptions;
    v2?: cookieParser.CookieParseOptions;
}

/**
 * @example
 *
 * // on application
 * @CookieParser() // with options: @CookieParser({...})
 * @ResApp
 * export class MyApplication {
 * // ...
 * }
 *
 * // on controller
 * @CookieParser() // with options: @CookieParser({...})
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
 *  @CookieParser() // with options: @CookieParser({...})
 *  getUser(@Param() id: string) {}
 * }
 * */

export function CookieParser(opt?: cookieParser.CookieParseOptions): ClassDecorator
export function CookieParser(secret?: OneOrMore<string>): ClassDecorator;
export function CookieParser(secret: OneOrMore<string>, opt?: cookieParser.CookieParseOptions): ClassDecorator;
export function CookieParser(v1?: OneOrMore<string> | cookieParser.CookieParseOptions, v2?: cookieParser.CookieParseOptions): ClassDecorator {
    return clazz =>
        deco.process([clazz], {v1, v2});
}

const deco = decoratorPool.newId<O, MdlMetadata<O>, P>(CookieParser)
    .fqn(FQN_PCK)
    .targets('class')
    .rules('no-multiple', 'no-inherited')
    .keywords('middleware')
    .processor((ins, p) => {
        const opt = {} as O;
        let givenOption: cookieParser.CookieParseOptions;
        if (typeof p.v1 === 'string') {
            $assert.text(p.v1, () => $dev.desc(ins, {field: 'secret'}));
            opt.secrets = [p.v1];
            givenOption = p.v2;
        } else if (Array.isArray(p.v1)) {
            $assert.textArray(p.v1, () => $dev.desc(ins, {field: 'secrets'}));
            opt.secrets = [...p.v1];
            givenOption = p.v2;
        } else {
            givenOption = p.v1;
        }
        if (!$is.empty(givenOption)) {
            $assert.bareObject(givenOption, () => $dev.desc(ins, {field: 'option'}));
            opt.opt = givenOption;
        }
        ins.set(opt);
    })
    .metadata({
        before: true,
        scopes: ['rest-app'],
        apply: (opt, ctx) => {
            const ct = ctx.asHttp();
            ct.app.use(cookieParser(opt.secrets, opt.opt));
        },
    })
;
