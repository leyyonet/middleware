import e from "express";
import {decoratorPool, footprint} from "@leyyo/core";
import {FQN} from "../internal";
import {MdlMetadata} from "../pool";
import {$assert, $dev, $is, AsyncFnc} from "@leyyo/common";
import {Next, Req, Res} from "@leyyo/http";
import {IdMiddleware} from "../index.symbols";

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
 * @UseAfter() //
 * @UseAfter('health')
 * @UseAfter(req => to.dict({status: 200, message: 'success', {from: '...'}}))
 * @UseAfter('health', req => to.dict({status: 200, message: 'success', {from: '...'}}))
 * class MyApplication {
 * // ...
 * }
 * */
export function UseAfter(requestHandler: e.RequestHandler): ClassDecorator;
export function UseAfter(requestHandler: e.RequestHandler, secure: boolean): ClassDecorator;
export function UseAfter(requestHandler: e.RequestHandler): MethodDecorator;
export function UseAfter(requestHandler: e.RequestHandler, secure: boolean): MethodDecorator;
export function UseAfter(requestHandler: e.RequestHandler, secure?: boolean): ClassDecorator|MethodDecorator {
    return (clazz, property, descriptor) =>
        deco.process([clazz, property, descriptor], {requestHandler, secure});
}

const deco = decoratorPool.newId<O, MdlMetadata<O>, P>(UseAfter)
    .fqn(FQN)
    .targets('class', 'method')
    .rules('no-inherited', 'no-static')
    .keywords(IdMiddleware)
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
        before: false,
        scopes: ['app', 'controller', 'endpoint'],
        apply: (opt, initialize) => {
            if (initialize.endpoint) {
                const router = initialize.endpoint.parent.router;
                initialize.endpoint.methods.forEach(m => {
                    if (typeof router[m] === 'function') {
                        if (opt.secure) {
                            router[m](initialize.endpoint.path, (req: Req, res: Res, next: Next) =>
                                run(opt, req, res, next)
                            );
                        }
                        else {
                            router[m](initialize.endpoint.path, opt.requestHandler);
                        }
                    }
                });
            }
            else if (initialize.controller) {
                if (opt.secure) {
                    initialize.controller.router.use((req: Req, res: Res, next: Next) =>
                        run(opt, req, res, next)
                    );
                }
                else {
                    initialize.controller.router.use(opt.requestHandler);
                }
            }
            else {
                if (opt.secure) {
                    initialize.app.native.use((req: Req, res: Res, next: Next) =>
                        run(opt, req, res, next)
                    );
                }
                else {
                    initialize.app.native.use(opt.requestHandler);
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
