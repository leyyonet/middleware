import e from "express";
import {decoratorPool, footprint} from "@leyyo/core";
import {FQN_PCK} from "../internal";
import {MdlMetadata} from "../pool";
import {$assert, $dev, $is, AsyncFnc} from "@leyyo/common";
import {Next, Req, Res} from "@leyyo/http";

interface O {
    requestHandler: e.RequestHandler;
    isAsync?: boolean;
    secure: boolean;
}

interface P {
    requestHandler: e.RequestHandler;
    secure: boolean;
}

/**
 * @example
 *
 * @UseBefore() //
 * @UseBefore('health')
 * @UseBefore(req => to.dict({status: 200, message: 'success', {from: '...'}}))
 * @UseBefore('health', req => to.dict({status: 200, message: 'success', {from: '...'}}))
 * class MyApplication {
 * // ...
 * }
 * */
export function UseBefore(requestHandler: e.RequestHandler): ClassDecorator;
export function UseBefore(requestHandler: e.RequestHandler, secure: boolean): ClassDecorator;
export function UseBefore(requestHandler: e.RequestHandler): MethodDecorator;
export function UseBefore(requestHandler: e.RequestHandler, secure: boolean): MethodDecorator;
export function UseBefore(requestHandler: e.RequestHandler, secure?: boolean): ClassDecorator|MethodDecorator {
    return (clazz, property, descriptor) =>
        deco.process([clazz, property, descriptor], {requestHandler, secure});
}

const deco = decoratorPool.newId<O, MdlMetadata<O>, P>(UseBefore)
    .fqn(FQN_PCK)
    .targets('class', 'method')
    .rules('no-inherited', 'no-static')
    .keywords('middleware')
    .processor((ins, p) => {
        const opt = {} as O;
        $assert.func(p.requestHandler, () => $dev.desc(ins, {field: 'requestHandler'}));
        if (footprint.isAsync(opt.requestHandler, true)) {
            opt.isAsync = true;
        }
        if (!$is.empty(p.secure)) {
            $assert.boolean(p.secure, () => $dev.desc(ins, {field: 'secure'}));
            opt.secure = p.secure;
        }
        ins.set(opt);
    })
    .metadata({
        before: true,
        scopes: ['rest-app', 'controller', 'endpoint'],
        apply: (opt, ctx) => {
            const ct = ctx.asHttp();
            if (ct.endpoint) {
                const router = ct.endpoint.controller.router;
                ct.endpoint.methods.forEach(m => {
                    if (typeof router[m] === 'function') {
                        if (opt.secure) {
                            router[m](ct.endpoint.path, (req: Req, res: Res, next: Next) =>
                                run(opt, req, res, next)
                            );
                        }
                        else {
                            router[m](ct.endpoint.path, opt.requestHandler);
                        }
                    }
                });
            }
            else if (ct.controller) {
                if (opt.secure) {
                    ct.controller.router.use(ct.controller.path, (req: Req, res: Res, next: Next) =>
                        run(opt, req, res, next)
                    );
                }
                else {
                    ct.controller.router.use(ct.controller.path, opt.requestHandler);
                }
            }
            else {
                if (opt.secure) {
                    ct.app.use((req: Req, res: Res, next: Next) =>
                        run(opt, req, res, next)
                    );
                }
                else {
                    ct.app.use(opt.requestHandler);
                }
            }
        },
    })
;

function run(opt: O, req: Req, res: Res, next: Next) {
    if (opt.isAsync) {
        (opt.requestHandler as AsyncFnc)(req, res, next)
            .then()
            .catch(error => {
                next(error);
            });
    }
    else {
        try {
            opt.requestHandler(req, res, next);
        } catch (error) {
            next(error);
        }
    }
}
