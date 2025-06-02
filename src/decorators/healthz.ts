import e from "express";
import {decoratorPool, footprint} from "@leyyo/core";
import {FQN} from "../internal";
import {MdlMetadata} from "../pool";
import {$is, Dict} from "@leyyo/common";
import {Next, Req, Res} from "@leyyo/http";
import {IdMiddleware} from "../index.symbols";

interface O {
    path: string;
    callback: HealthCallback;
    isAsync: boolean;
}

type HealthCallback = HealthCallbackSync | HealthCallbackAsync;
type HealthCallbackSync = (req: e.Request) => HealthCallbackTuple;
type HealthCallbackAsync = (req: e.Request) => Promise<HealthCallbackTuple>;

type HealthCallbackTuple = [number, string, any]; // as [status, statusMessage, data]

interface P {
    v1?: string|HealthCallback;
    v2?: HealthCallback;
}
/**
 * @example
 *
 * @Healthz() //
 * @Healthz('health')
 * @Healthz(req => to.dict({status: 200, message: 'success', {from: '...'}}))
 * @Healthz('health', req => to.dict({status: 200, message: 'success', {from: '...'}}))
 * class MyApplication {
 * // ...
 * }
 * */
export function Healthz(): ClassDecorator;
export function Healthz(callback: HealthCallback): ClassDecorator;
export function Healthz(path: string): ClassDecorator;
export function Healthz(path: string, callback: HealthCallback): ClassDecorator;
export function Healthz(v1?: string|HealthCallback, v2?: HealthCallback): ClassDecorator {
    return clazz =>
        deco.process([clazz], {v1, v2});
}

const deco = decoratorPool.newId<O, MdlMetadata<O>, P>(Healthz)
    .fqn(FQN)
    .targets('class')
    .keywords(IdMiddleware)
    .rules('no-inherited', 'no-static')
    .processor((ins, p) => {
        const opt = {} as O;
        if (typeof p.v1 === 'string') {
            opt.path = p.v1.trim().replace(/^\/|\/$/g, '').trim();
            if (typeof p.v2 === 'function') {
                opt.callback = p.v2;
            }
            opt.isAsync = footprint.isAsync(opt.callback);
        }
        else if (typeof p.v1 === 'function') {
            opt.callback = p.v1;
            opt.isAsync = footprint.isAsync(opt.callback);
        }
        ins.set(opt);
    })
    .metadata({
        before: true,
        scopes: ['app'],
        apply: (opt, initialize) => {
            let fn: e.RequestHandler;
            if (opt.callback) {
                if (opt.isAsync) {
                    fn = (req: Req, res: Res, next: Next) => {
                        (opt.callback as HealthCallbackAsync)(req).then(result => {
                            convertResult(res, result);
                        }).catch(e => {
                            next(e);
                        })
                    };
                }
                else {
                    fn = (req: Req, res: Res, next: Next) => {
                        try {
                            const result = (opt.callback as HealthCallbackSync)(req);
                            convertResult(res, result);
                        }
                        catch (e) {
                            next(e);
                        }
                    };
                }
            }
            else {
                fn = defaultResult;
            }

            const path = opt.path ? opt.path : 'healthz';
            initialize.app.native.get(`/${path}`, fn);
        },
    })
;

function defaultResult(_req: Req, res: Res, _next: Next) {
    res.statusMessage = 'Live';
    res.status(200).send();
}
function failedResult(res: e.Response, status: number, statusMessage: string, error?: Dict) {
    res.statusMessage = statusMessage;
    if ($is.object(error)) {
        res.status(status).json(error);
    }
    else {
        res.status(status).end();
    }
}
function convertResult(res: Res, result: HealthCallbackTuple) {
    if (!Array.isArray(result)) {
        failedResult(res, 400, 'Tuple is not array', {type: typeof result});
        return;
    }
    const [status, statusMessage, data] = result;
    if (!Number.isInteger(status) || status < 400 || status > 999) {
        failedResult(res, 400, 'Status is not valid', {type: typeof status, status: $is.primitive(status) ? status : undefined});
        return;
    }
    if (!$is.text(statusMessage)) {
        failedResult(res, 400, 'Status message is not valid', {type: typeof statusMessage, status: $is.primitive(statusMessage) ? statusMessage : undefined});
        return;
    }
    res.statusMessage = statusMessage;
    if ($is.empty(data)) {
        res.status(status).end();
        return;
    }
    const type = typeof data;
    switch (type) {
        case "string":
            res.status(status).send(data);
            return;
        case "bigint":
        case "number":
            res.status(status).send((data as number).toString(10));
            return;
        case "boolean":
            res.status(status).send(data ? 'true' : 'false');
            return;
        case "object":
            res.status(status).json(data);
            return;
    }
    res.status(status).json({info: 'Unexpected type', type});
}
