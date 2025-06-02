import {
    ClassReflectionLike,
    CoreReflectionLike,
    DecoInstanceLike,
    DecoLike,
    lifecycle,
    PropertyReflectionLike,
    reflectionPool,
    Target
} from "@leyyo/core";
import {$assert, $dev, $log, $repo, Dict} from "@leyyo/common";
import {MdlMetadata, MiddlewareCollection, MiddlewareItem, MiddlewarePoolLike} from "./index-types";
import {FQN} from "../internal";
import {HttpInitialize, httpSigner, HttpTarget} from "@leyyo/http";
import {IdMiddleware} from "../index.symbols";

export class MiddlewarePool implements MiddlewarePoolLike {
    private logger = $log.create(MiddlewarePool);
    private readonly controllerCollections: Map<ClassReflectionLike, MiddlewareCollection>;
    private readonly endpointCollections: Map<PropertyReflectionLike, MiddlewareCollection>;

    constructor() {
        this.controllerCollections = $repo.newMap(FQN, 'controllerCollections');
        this.endpointCollections = $repo.newMap(FQN, 'endpointCollections');

        lifecycle.onAll(FQN)
            .before('leyyo.http-api')
            .before('leyyo.http-client');

        lifecycle.onInitialize(FQN, () => this.initialize());
        lifecycle.onClear(FQN, () => this._clear());
    }

    protected _clear(): void {
        this.controllerCollections.clear();
        this.endpointCollections.clear();
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

    addClass(ref: ClassReflectionLike, ins: DecoInstanceLike, scope: HttpTarget, value: any, metadata: MdlMetadata<Dict>, index: number): void {
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

    protected _getClassScope(ref: ClassReflectionLike): HttpTarget {
        if (httpSigner.is(ref.creator, 'http.app')) {
            return 'app';
        } else if (httpSigner.is(ref.creator, 'http.controller')) {
            return 'controller';
        }
        throw $dev.developerError({issue: 'middleware.can.be.assigned.to.application.or.controller'});
    }

    protected _checkAllowedScope(ref: CoreReflectionLike, deco: DecoLike, scopes: Array<HttpTarget>, scope: HttpTarget) {
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
        const classScopes = ['app', 'controller', 'class'] as Array<HttpTarget | Target>;
        const methodScopes = ['endpoint', 'method'] as Array<HttpTarget | Target>;
        const fieldScopes = ['field'] as Array<HttpTarget | Target>;
        reflectionPool.classes()
            .forEach(clazzRef => {
                let classChecked = false;
                let scope: HttpTarget;
                clazzRef.docsAll()
                    .forEach((doc, index) => {
                        const deco = doc.ins.identifier;
                        if (!deco.hasKeyword(IdMiddleware)) {
                            return;
                        }
                        const metadata = deco.getMetadata<MdlMetadata>();
                        $assert.boolean(metadata.before, () => $dev.desc(deco, {field: 'metadata.before'}));
                        $assert.func(metadata.apply, () => $dev.desc(deco, {field: 'metadata.apply'}));
                        $assert.literalArray(metadata.scopes, classScopes, () => $dev.desc(deco, {field: 'metadata.scopes'}));
                        if (!classChecked) {
                            scope = this._getClassScope(clazzRef);
                            this._checkAllowedScope(clazzRef, deco, metadata.scopes, scope);
                            classChecked = true;
                        }
                        this.addClass(clazzRef, doc.ins, scope, doc.value, metadata, index);
                    });

                clazzRef.listInstanceProperties({kind: 'method'})
                    .forEach(prop => {
                        let propChecked = false;
                        prop.docsAll()
                            .forEach((doc, index) => {
                                const deco = doc.ins.identifier;
                                if (!deco.hasKeyword(IdMiddleware)) {
                                    return;
                                }
                                const metadata = deco.getMetadata<MdlMetadata>();
                                if (!propChecked) {
                                    if (!httpSigner.isExt(clazzRef.creator, prop.name, 'methods') && httpSigner.is(prop.callable, 'http.endpoint')) {
                                        throw $dev.developerError({issue: 'middleware.can.be.assigned.to.endpoint'});
                                    }
                                    this._checkAllowedScope(prop, deco, metadata.scopes, 'endpoint');
                                    propChecked = true;
                                }
                                this.addMethod(prop, doc.ins, doc.value, metadata, index);
                            });
                    });

                // todo static and field for ignore warning
            });

        // todo other for ignore warning
    }

    private _bind(list: Array<MiddlewareItem>, before: boolean, initialize: HttpInitialize) {
        list.forEach(item => {
            try {
                item.apply(item.value, initialize);
                this.logger.debug(`Bound to ${before ? 'before' : 'after'} ${item.ins.description}`);
            } catch (e) {
                this.logger.error(` ${before ? 'before' : 'after'} ${item.ins.description}`, e);
            }
        });
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

    bindForClass(ref: ClassReflectionLike, before: boolean, initialize: HttpInitialize): void {
        if (!this.controllerCollections.has(ref) && this.controllerCollections.get(ref).before?.length > 0) {
            return;
        }
        const coll = this.controllerCollections.get(ref);
        this._bind(before ? coll.before : coll.after, before, initialize);
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

    bindForMethod(ref: PropertyReflectionLike, before: boolean, initialize: HttpInitialize): void {
        if (!this.endpointCollections.has(ref)) {
            return;
        }
        const coll = this.endpointCollections.get(ref);
        this._bind(before ? coll.before : coll.after, before, initialize);
    }
}

// noinspection JSUnusedGlobalSymbols
export const middlewarePool: MiddlewarePoolLike = new MiddlewarePool();
