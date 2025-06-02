import {decoratorPool} from "@leyyo/core";
import {FQN} from "../internal";
import {MdlMetadata} from "../pool";
import {Dict} from "@leyyo/common";
import {Context, Next, Req, Res} from "@leyyo/http";
import {IdMiddleware} from "../index.symbols";

type O = Dict;
type P = Dict;

/**
 * @example
 *
 * @GeneralError() //
 * class MyApplication {
 * // ...
 * }
 * */
export function GeneralError(): ClassDecorator {
    return clazz =>
        deco.process([clazz], {});
}

const deco = decoratorPool.newId<O, MdlMetadata<O>, P>(GeneralError)
    .fqn(FQN)
    .targets('class')
    .keywords(IdMiddleware)
    .rules('no-multiple', 'no-inherited')
    .processor((ins, _p) => {
        ins.set({});
    })
    .metadata({
        before: false,
        scopes: ['app'],
        apply: (_opt, initialize) => {
            initialize.app.native.use((error: Error, req: Req, res: Res, next: Next) => {
                if (res.headersSent) {
                    return next(error);
                }
                error['path'] = Context.fromRequest(req).path;
                error['method'] = req.method;
                res.statusMessage = error.name;
                let status = error['status'] as number;
                if (!Number.isInteger(status) || status < 400 || status > 999) {
                    status = 500;
                }
                // todo
                res.status(status).json(error);
            });
        },
    })
;
