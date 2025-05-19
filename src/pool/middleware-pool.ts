import {
    ClassReflectionLike,
    CoreReflectionLike,
    DecoInstanceLike,
    DecoLike, lifecycle,
    PropertyReflectionLike, reflectionPool
} from "@leyyo/core";
import {$assert, $descriptor, $dev, $repo, Dict} from "@leyyo/common";
import {MdlMetadata, MiddlewareCallback, MiddlewareCollection, MiddlewarePoolLike} from "./index-types";
import {FQN_PCK} from "../internal";
import {MiddlewareScope, MiddlewareScopeItems} from "../literals";
import {HttpQueue, httpSigner} from "@leyyo/http";

export class MiddlewarePool implements MiddlewarePoolLike {

    private readonly controllerCollections: Map<ClassReflectionLike, MiddlewareCollection>;
    private readonly endpointCollections: Map<PropertyReflectionLike, MiddlewareCollection>;

    constructor() {
        this.controllerCollections = $repo.newMap($descriptor.sym(FQN_PCK, 'controllerCollections'));
        this.endpointCollections = $repo.newMap($descriptor.sym(FQN_PCK, 'endpointCollections'));

        lifecycle.register('clear', 50, 'MiddlewarePool', () => {
            this.controllerCollections.clear();
            this.endpointCollections.clear();
        });

        lifecycle.register('initialize', 50, 'MiddlewarePool', () => {
            this.initialize();
        });
    }

    protected _initRef<R extends CoreReflectionLike>(ref: R, map: Map<R, MiddlewareCollection>): MiddlewareCollection {
        if (!map.has(ref)) {
            map.set(ref, {
                before: [],
                after: [],
            });
        }
        return map.get(ref);
    }

    addClass(ref: ClassReflectionLike, ins: DecoInstanceLike, scope: MiddlewareScope, value: any, metadata: MdlMetadata<Dict>, index: number): void {
        const coll = this._initRef(ref, this.controllerCollections);
        if (metadata.before) {
            coll.before.push({
                ins, scope, value, index,
                apply: metadata.apply,
            });
        } else {
            coll.after.push({
                ins, scope, value, index,
                apply: metadata.apply,
            });
        }
    }

    addMethod(ref: PropertyReflectionLike, ins: DecoInstanceLike, value: any, metadata: MdlMetadata<Dict>, index: number): void {
        const coll = this._initRef(ref, this.endpointCollections);
        if (metadata.before) {
            coll.before.push({
                ins, scope: 'endpoint', value, index,
                apply: metadata.apply,
            });
        } else {
            coll.after.push({
                ins, scope: 'endpoint', value, index,
                apply: metadata.apply,
            });
        }
    }

    protected _getClassScope(ref: ClassReflectionLike): MiddlewareScope {
        if (httpSigner.is(ref.creator, 'http.app')) {
            return 'rest-app';
        } else if (httpSigner.is(ref.creator, 'http.controller')) {
            return 'controller';
        }
        throw $dev.developerError({issue: 'middleware.can.be.assigned.to.application.or.controller'});
    }

    protected _checkAllowedScope(ref: CoreReflectionLike, deco: DecoLike, scopes: Array<MiddlewareScope>, scope: MiddlewareScope) {
        if (!scopes.includes(scope)) {
            throw $dev.developerError({
                issue: 'middleware.metadata.does.not.support',
                scopes,
                scope,
                ref: ref.description,
                desc: deco.description
            });
        }
    }

    initialize(): void {
        reflectionPool.classes()
            .forEach(clazzRef => {
                let classChecked = false;
                let scope: MiddlewareScope;
                clazzRef.docsAll()
                    .forEach((doc, index) => {
                        const deco = doc.ins.identifier;
                        if (deco.hasKeyword('middleware')) {
                            const metadata = deco.getMetadata<MdlMetadata<Dict>>();
                            $assert.boolean(metadata.before, () => $dev.desc(deco, {field: 'metadata.before'}));
                            $assert.func(metadata.apply, () => $dev.desc(deco, {field: 'metadata.apply'}));
                            $assert.literalArray(metadata.scopes, MiddlewareScopeItems, () => $dev.desc(deco, {field: 'metadata.scopes'}));
                            if (!classChecked) {
                                scope = this._getClassScope(clazzRef);
                                this._checkAllowedScope(clazzRef, deco, metadata.scopes, scope);
                                classChecked = true;
                            }
                            this.addClass(clazzRef, doc.ins, scope, doc.value, metadata, index);
                        }
                });

                clazzRef.listInstanceProperties({kind: 'method'})
                    .forEach(prop => {
                        let propChecked = false;
                        prop.docsAll()
                            .forEach((doc, index) => {
                                const deco = doc.ins.identifier;
                                if (deco.hasKeyword('middleware')) {
                                    const metadata = deco.getMetadata<MdlMetadata<Dict>>();
                                    if (!propChecked) {
                                        if (!httpSigner.isExt(clazzRef.creator, prop.name, 'methods') && httpSigner.is(prop.callable, 'http.endpoint')) {
                                            throw $dev.developerError({issue: 'middleware.can.be.assigned.to.endpoint'});
                                        }
                                        this._checkAllowedScope(prop, deco, metadata.scopes, 'endpoint');
                                        propChecked = true;
                                    }
                                    this.addMethod(prop, doc.ins, doc.value, metadata, index);
                                }
                            });
                    });

                // todo static and field for ignore warning
            });

        // todo other for ignore warning
    }

    hasClass(ref: ClassReflectionLike, before: boolean): boolean {
        if (!this.controllerCollections.has(ref)) {
          return false;
        }
        if (before) {
            return this.controllerCollections.get(ref).before?.length > 0;
        }
        return this.controllerCollections.get(ref).after?.length > 0;
    }
    forClass(ref: ClassReflectionLike, before: boolean): Array<HttpQueue<MiddlewareCallback>> {
        if (!this.controllerCollections.has(ref) && this.controllerCollections.get(ref).before?.length > 0) {
            return [];
        }
        const coll = this.controllerCollections.get(ref);
        const queue = [] as Array<HttpQueue<MiddlewareCallback>>;
        if (before) {
            coll.before.forEach(item => {
                queue.push({
                    index: item.index,
                    callback: ctx => item.apply(item.value, ctx),
                });
            })
        } else {
            coll.after.forEach(item => {
                queue.push({
                    index: item.index,
                    callback: ctx => item.apply(item.value, ctx),
                });
            })
        }
        return queue;
    }

    hasMethod(ref: PropertyReflectionLike, before: boolean): boolean {
        if (!this.endpointCollections.has(ref)) {
            return false;
        }
        if (before) {
            return this.endpointCollections.get(ref).before?.length > 0;
        }
        return this.endpointCollections.get(ref).after?.length > 0;
    }
    forMethod(ref: PropertyReflectionLike, before: boolean): Array<HttpQueue<MiddlewareCallback>> {
        if (!this.endpointCollections.has(ref)) {
            return [];
        }
        const coll = this.endpointCollections.get(ref);
        const queue = [] as Array<HttpQueue<MiddlewareCallback>>;
        if (before) {
            coll.before.forEach(item => {
                queue.push({
                    index: item.index,
                    callback: ctx => item.apply(item.value, ctx),
                });
            })
        } else {
            coll.after.forEach(item => {
                queue.push({
                    index: item.index,
                    callback: ctx => item.apply(item.value, ctx),
                });
            })
        }
        return queue;
    }
}
// noinspection JSUnusedGlobalSymbols
export const middlewarePool: MiddlewarePoolLike = new MiddlewarePool();
