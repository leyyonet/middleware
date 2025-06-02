import {decoratorPool, footprint, fqnHandler} from "@leyyo/core";
import {FQN} from "../internal";
import {MdlMetadata} from "../pool";
import {$dev, ClassLike, Func} from "@leyyo/common";
import {EmptyPathException} from "../errors";
import {Req, Res} from "@leyyo/http";
import {IdMiddleware} from "../index.symbols";

interface O {
    ignore: boolean;
    errorClass: ClassLike;
    statusMessage: string;
}

interface P {
    v1: true|Func | ClassLike;
}

/**
 * @example
 *
 * @EmptyPath() //
 * @EmptyPath('health')
 * @EmptyPath(req => to.dict({status: 200, message: 'success', {from: '...'}}))
 * @EmptyPath('health', req => to.dict({status: 200, message: 'success', {from: '...'}}))
 * class MyApplication {
 * // ...
 * }
 * */
export function EmptyPath(): ClassDecorator;
export function EmptyPath(ignore: true): ClassDecorator;
export function EmptyPath(errorClass: Func | ClassLike): ClassDecorator;
export function EmptyPath(v1?: true|Func | ClassLike): ClassDecorator {
    return clazz =>
        deco.process([clazz], {v1});
}

const deco = decoratorPool.newId<O, MdlMetadata<O>, P>(EmptyPath)
    .fqn(FQN)
    .targets('class')
    .keywords(IdMiddleware)
    .rules('no-multiple', 'no-inherited')
    .processor((ins, p) => {
        const opt = {} as O;
        if (typeof p.v1 === 'function') {
            const inspect = footprint.inspect(p.v1);
            if (inspect.type !== 'class') {
                throw $dev.invalidError({
                    issue: 'class.should.be.error.class',
                    desc: ins.description,
                    field: 'errorClass',
                    clazz: fqnHandler.get(p.v1)
                });
            }
            opt.errorClass = p.v1 as ClassLike;
        }
        else if (p.v1 === true) {
            opt.ignore = true;
        }
        if (!opt.errorClass) {
            opt.errorClass = EmptyPathException;
        }
        opt.statusMessage = fqnHandler.get(opt.errorClass);
        ins.set(opt);
    })
    .metadata({
        before: true,
        scopes: ['app'],
        apply: (opt, initialize) => {
            initialize.app.native.get('/', (req: Req, res: Res) => {
                if (opt.ignore) {
                    res.statusMessage = opt.statusMessage;
                    res.status(404).end();
                }
                else {
                    const error = new opt.errorClass(req.method);
                    res.statusMessage = opt.statusMessage;
                    // todo
                    res.status(404).json(error);
                }
            });
        },
    })
;
