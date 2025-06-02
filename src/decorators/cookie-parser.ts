import {decoratorPool} from "@leyyo/core";
import {FQN} from "../internal";
import {MdlMetadata} from "../pool";
import {$assert, $dev, $is, OneOrMore} from "@leyyo/common";
import cookieParser from "cookie-parser";
import {IdMiddleware} from "../index.symbols";

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
        id.process([clazz], {v1, v2});
}

const id = decoratorPool.newId<O, MdlMetadata<O>, P>(CookieParser)
    .fqn(FQN)
    .targets('class')
    .rules('no-multiple', 'no-inherited')
    .keywords(IdMiddleware)
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
        scopes: ['app'],
        apply: (opt, initialize) => {
            initialize.app.native.use(cookieParser(opt.secrets, opt.opt));
        }
     })
;
