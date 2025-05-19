import {decoratorPool} from "@leyyo/core";
import {FQN_PCK} from "../internal";
import {MdlMetadata} from "../pool";
import {Dict} from "@leyyo/common";
import {Next, Req, Res} from "@leyyo/http";

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
    .fqn(FQN_PCK)
    .targets('class')
    .keywords('middleware')
    .rules('no-multiple', 'no-inherited')
    .processor((ins, _p) => {
        ins.set({});
    })
    .metadata({
        before: false,
        scopes: ['rest-app'],
        apply: (_opt, ctx) => {
            ctx.asHttp().app.use((error: Error, req: Req, res: Res, next: Next) => {
                if (res.headersSent) {
                    return next(error);
                }
                error['path'] = req.path;
                if (req.path !== req.$path) {
                    error['$path'] = req.$path;
                }
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
