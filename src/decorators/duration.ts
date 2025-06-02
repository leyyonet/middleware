import e from "express";
import {decoratorPool, footprint} from "@leyyo/core";
import {FQN} from "../internal";
import {MdlMetadata} from "../pool";
import {$assert, $dev, $is, Dict} from "@leyyo/common";
import {Context, Next, Req, Res} from "@leyyo/http";
import {IdMiddleware} from "../index.symbols";

interface O {
    log?: boolean;
    max?: number;
    onExceed?: OnExceedLambda;
    isAsync?: boolean;
}

interface P {
    v1?: number|true;
    v2?: true|OnExceedLambda;
    v3?: true;
}

type OnExceedLambda = OnExceedLambdaSync | OnExceedLambdaAsync;
type OnExceedLambdaSync = (req: e.Request, diff: number) => void;
type OnExceedLambdaAsync = (req: e.Request, diff: number) => Promise<void>;
/**
 * @example
 *
 * @Duration() //
 * @Duration('health')
 * @Duration(req => to.dict({status: 200, message: 'success', {from: '...'}}))
 * @Duration('health', req => to.dict({status: 200, message: 'success', {from: '...'}}))
 * class MyApplication {
 * // ...
 * }
 * */
export function Duration(): ClassDecorator;
export function Duration(): MethodDecorator;
export function Duration(log: true): ClassDecorator;
export function Duration(log: true): MethodDecorator;
export function Duration(maxDuration: number, log?: true): ClassDecorator;
export function Duration(maxDuration: number, log?: true): MethodDecorator;
export function Duration(maxDuration: number, onExceed: OnExceedLambda, log?: true): ClassDecorator;
export function Duration(maxDuration: number, onExceed: OnExceedLambda, log?: true): MethodDecorator;
export function Duration(maxDuration: number, log?: true): ClassDecorator;
export function Duration(maxDuration: number, log?: true): MethodDecorator;
export function Duration(v1?: number|true, v2?: true|OnExceedLambda, v3?: true): ClassDecorator|MethodDecorator {
    return (clazz, property, descriptor) =>
        deco.process([clazz, property, descriptor], {v1, v2, v3});
}

const deco = decoratorPool.newId<O, MdlMetadata<O>, P>(Duration)
    .fqn(FQN)
    .targets('class', 'method')
    .keywords(IdMiddleware)
    .rules('no-multiple', 'no-inherited', 'no-static')
    .processor((ins, p) => {
        const opt = {} as O;
        if (typeof p.v1 === 'number') {
            $assert.positiveInteger(p.v1, () => $dev.desc(ins, {field: 'maxDuration'}));
            opt.max = p.v1;
            if (p.v2 === true) {
                opt.log = true;
            }
            else if (!$is.empty(p.v2)) {
                $assert.func(p.v2, () => $dev.desc(ins, {field: 'onExceed'}));
                opt.onExceed = p.v2;
                if (footprint.isAsync(opt.onExceed, true)) {
                   opt.isAsync = true;
                }
                if (p.v3 === true) {
                    opt.log = true;
                }
            }
        }
        else if (p.v1 === true) {
            opt.log = true;
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
                            duration(opt, req, res, next)
                        );
                    }
                });
            }
            else if (initialize.controller) {
                initialize.controller.router.use((req: Req, res: Res, next: Next) =>
                    duration(opt, req, res, next)
                );
            }
            else {
                initialize.app.native.use((req: Req, res: Res, next: Next) =>
                    duration(opt, req, res, next)
                );
            }
        },
    })
;

function duration(opt: O, req: Req, res: Res, next: Next) {
    try {
        if (typeof res?.on === 'function') {
            const starting = Date.now();
            let finished = false;
            res.on('finish', async () => {
                if (!finished) {
                    finished = true;
                    doFulfill(req, opt, starting);
                }
            });
            res.on('close', async () => {
                if (!finished) {
                    finished = true;
                    doFulfill(req, opt, starting);
                }
            });
        }
    } catch (e) {
        $dev.log(e, {path: Context.fromRequest(req).path})
    }
    next();
}
function doFulfill(req: Req, opt: O, starting: number): void {
    const diff = Date.now() - starting;
    const locals = req['locals'] ?? {};
    if (!opt.max || diff <= opt.max) {
        doLog(req, opt, diff, locals);
        return;
    }
    if (opt.onExceed && !locals['$duration.onExceed']) {
        locals['$duration.onExceed'] = true;
        try {
            if (opt.isAsync) {
                (opt.onExceed as OnExceedLambdaAsync)(req, diff).then();
            }
            else {
                (opt.onExceed as OnExceedLambdaSync)(req, diff);
            }
        } catch (error) {
            $dev.log(error, {path: Context.fromRequest(req).path})
        }
    }
    if (opt.log) {
        doLog(req, opt, diff, locals);
    }
}

function doLog(req: Req, opt: O, diff: number, locals: Dict) {
    if (opt.log && !locals['$duration.logged']) {
        console.log(`${req.method}: ${Context.fromRequest(req).path} is called with ${diff}`);
        locals['$duration.logged'] = true;
        locals['$logged'] = true;
    }
}
