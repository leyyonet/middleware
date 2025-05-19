import e from "express";
import {decoratorPool, footprint, fqnHandler} from "@leyyo/core";
import {FQN_PCK} from "../internal";
import {MdlMetadata} from "../pool";
import {$assert, $dev, $is, ClassLike, Dict, Func} from "@leyyo/common";
import {NotFoundException} from "../errors";
import {HttpMethod, HttpMethodItems, Req, Res} from "@leyyo/http";

type IgnoreType = 'all'|'each'|'none';
interface O {
    errorClass: ClassLike;
    ignoreType: IgnoreType;
    pathList?: Array<string>;
    pathMap?: Record<HttpMethod, Array<string>>;
    statusMessage: string;
}

interface P {
    v1?: Func | ClassLike | Array<string> | Record<HttpMethod, Array<string>>;
    v2?: Array<string> | Record<HttpMethod, Array<string>>;
}

/**
 * @example
 *
 * @NotFoundPath() //
 * @NotFoundPath('health')
 * @NotFoundPath(req => to.dict({status: 200, message: 'success', {from: '...'}}))
 * @NotFoundPath('health', req => to.dict({status: 200, message: 'success', {from: '...'}}))
 * class MyApplication {
 * // ...
 * }
 * */
export function NotFoundPath(): ClassDecorator;
export function NotFoundPath(errorClass: Func | ClassLike): ClassDecorator;
export function NotFoundPath(ignoredForAllMethods: Array<string>): ClassDecorator;
export function NotFoundPath(ignoredForEachMethod: Record<HttpMethod, Array<string>>): ClassDecorator;
export function NotFoundPath(errorClass: Func | ClassLike, ignoredForAllMethods: Array<string>): ClassDecorator;
export function NotFoundPath(errorClass: Func | ClassLike, ignoredForEachMethod: Record<HttpMethod, Array<string>>): ClassDecorator;
export function NotFoundPath(v1?: Func | ClassLike|Array<string>|Record<HttpMethod, Array<string>>, v2?: Array<string>|Record<HttpMethod, Array<string>>): ClassDecorator {
    return clazz =>
        deco.process([clazz], {v1, v2});
}

const deco = decoratorPool.newId<O, MdlMetadata<O>, P>(NotFoundPath)
    .fqn(FQN_PCK)
    .targets('class')
    .keywords('middleware')
    .rules('no-multiple', 'no-inherited')
    .processor((ins, p) => {
        const opt = {ignoreType: 'none'} as O;
        let paths: Array<string> | Record<HttpMethod, Array<string>>;
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
            if (p.v2 && typeof p.v2 === 'object') {
                paths = p.v2;
            }
        }
        else if (p.v1 && typeof p.v1 === 'object') {
            paths = p.v1;
        }
        if (paths) {
            if (Array.isArray(paths) && paths.length > 0) {
                $assert.textArray(paths, () => $dev.desc(ins, {field: 'ignoredForAllMethods'}));
                opt.pathList = paths;
                opt.ignoreType = 'all';
            }
            else if ($is.bareObject(paths) && Object.keys(paths).length > 0) {
                opt.pathMap = {} as Record<HttpMethod, Array<string>>;
                for (const [method, values] of Object.entries(paths as Dict)) {
                    $assert.literal(method.toLowerCase(), HttpMethodItems, () => $dev.desc(ins, {field: 'ignoredForEachMethod', method}));
                    opt.pathMap[method.toLowerCase()] = values;
                }
                opt.ignoreType = 'each';
            }
        }
        if (!opt.errorClass) {
            opt.errorClass = NotFoundException;
        }
        opt.statusMessage = fqnHandler.get(opt.errorClass);
        ins.set(opt);
    })
    .metadata({
        before: false,
        scopes: ['rest-app'],
        apply: (opt, ctx) => {
            ctx.asHttp().app.use((req: Req, res: Res) => {
                switch (opt.ignoreType) {
                    case "all":
                        if (opt.pathList.includes(req.$path)) {
                            res.statusMessage = opt.statusMessage;
                            res.status(404).end();
                            return;
                        }
                        break;
                    case "each":
                        if (opt.pathMap[req.method] && (opt.pathMap[req.method]).includes(req.$path)) {
                            res.statusMessage = opt.statusMessage;
                            res.status(404).end();
                            return;
                        }
                        break;
                }
                const e = new opt.errorClass(req.method);
                res.statusMessage = opt.statusMessage;
                // todo
                res.status(404).json(e);
            });
        },
    })
;
