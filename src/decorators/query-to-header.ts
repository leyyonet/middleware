import {decoratorPool} from "@leyyo/core";
import {FQN} from "../internal";
import {MdlMetadata} from "../pool";
import {$assert, $dev, $is} from "@leyyo/common";
import {Next, Req, Res} from "@leyyo/http";
import {IdMiddleware} from "../index.symbols";

export interface O {
    prefix?: string;
    fields?: Array<string>;
    prefixLength: number;
}

interface P {
    v1?: string | Array<string>;
    v2?: Array<string>;
}
/**
 * @example
 *
 * // on application
 * @QueryToHeader() // with options: @QueryToHeader({...})
 * @ResApp
 * export class MyApplication {
 * // ...
 * }
 *
 * // on controller
 * @QueryToHeader() // with options: @QueryToHeader({...})
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
 *  @QueryToHeader() // with options: @QueryToHeader({...})
 *  getUser(@Param() id: string) {}
 * }
 * */
export function QueryToHeader(): ClassDecorator;
export function QueryToHeader(prefix: string): ClassDecorator;
export function QueryToHeader(prefix: string, fields: Array<string>): ClassDecorator;
export function QueryToHeader(fields: Array<string>): MethodDecorator;
export function QueryToHeader(v1?: string|Array<string>, v2?: Array<string>): ClassDecorator|MethodDecorator {
    return (clazz, property, descriptor) =>
        deco.process([clazz, property, descriptor], {v1, v2});
}

const deco = decoratorPool.newId<O, MdlMetadata<O>, P>(QueryToHeader)
    .fqn(FQN)
    .targets('class')
    .keywords(IdMiddleware)
    .rules('no-multiple', 'no-inherited')
    .processor((ins, p) => {
        const opt = {} as O;
        if (typeof p.v1 === 'string') {
            $assert.text(p.v1, () => $dev.desc(ins, {field: 'prefix'}));
            opt.prefix = p.v1;
            if (!$is.empty(p.v2)) {
                $assert.textArray(p.v2, () => $dev.desc(ins, {field: 'fields'}));
                opt.fields = p.v2;
            }
        }
        else if (!$is.empty(p.v1)) {
            $assert.textArray(p.v1, () => $dev.desc(ins, {field: 'fields'}));
            opt.fields = p.v1;
        }
        if (!opt.fields) {
            opt.fields = [];
            if (!opt.prefix) {
                opt.prefix = '--';
            }
        }
        if (opt.prefix) {
            opt.prefixLength = opt.prefix.length;
        }
        ins.set(opt);
    })
    .metadata({
        before: true,
        scopes: ['app', 'controller', 'endpoint'],
        apply: (opt, initialize) => {
            if (initialize.endpoint) {
                const router = initialize.endpoint.parent.router;
                initialize.endpoint.methods.forEach(m => {
                    if (typeof router[m] === 'function') {
                        router[m](initialize.endpoint.path, (req: Req, res: Res, next: Next) =>
                            convert(opt, req, res, next)
                        );
                    }
                });
            }
            else if (initialize.controller) {
                initialize.controller.router.use((req: Req, res: Res, next: Next) =>
                    convert(opt, req, res, next)
                );
            }
            else {
                initialize.app.native.use((req: Req, res: Res, next: Next) =>
                    convert(opt, req, res, next)
                );
            }
        },
    })
;

function convert(opt: O, req: Req, res: Res, next: Next) {
    let path: string;
    try {
        path = req?.route?.path ?? req.originalUrl;
        if (typeof path === 'string' && path.includes('?')) {
            path = path.split('?').shift();
        }
        for (const [k, v] of Object.entries(req.query)) {
            let headerKey: string;
            if (k.startsWith(opt.prefix)) {
                headerKey = toHeaderName(k.substring(opt.prefixLength));
                delete req.query[k];
            } else if (opt.fields.includes(k)) {
                headerKey = toHeaderName(k);
                delete req.query[k];
            }
            if (headerKey) {
                req.headers[headerKey] = v as string;
            }
        }
    } catch (e) {
        $dev.log(e, {path})
    }
    next();
}

function toHeaderName(key: string): string {
    return key.replace( /([A-Z])/g, " $1" ).split(' ').join('_').split('_').join('-').toLowerCase();
}
