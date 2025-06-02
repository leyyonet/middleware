import {ClassReflectionLike, DecoInstanceLike, PropertyReflectionLike} from "@leyyo/core";
import {Dict} from "@leyyo/common";
import {HttpInitialize, HttpQueue, HttpTarget} from "@leyyo/http";

export interface MdlMetadata<O = Dict> {
    before?: boolean;
    scopes: Array<HttpTarget>;
    apply: MdlApplyLambda<O>;
}
export type MdlApplyLambda<O> = (opt: O, initialize: HttpInitialize) => void;

export interface MiddlewareCollection {
    after: Array<MiddlewareItem>;
    before: Array<MiddlewareItem>;
}

export interface MiddlewareItem extends Omit<MdlMetadata, 'scopes' | 'before'> {
    scope: HttpTarget;
    ins: DecoInstanceLike;
    index: number;
    value: any;
}

export interface MiddlewarePoolLike {
    initialize(): void;

    hasClass(ref: ClassReflectionLike, before: boolean): boolean;
    bindForClass(ref: ClassReflectionLike, before: boolean, initialize: HttpInitialize): void;

    hasMethod(ref: PropertyReflectionLike, before: boolean): boolean;
    bindForMethod(ref: PropertyReflectionLike, before: boolean, initialize: HttpInitialize): void;
}



export type MiddlewareCallback = (initialize: HttpInitialize) => void;
