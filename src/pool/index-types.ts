import {ClassReflectionLike, DecoInstanceLike, DecoLike, PropertyReflectionLike} from "@leyyo/core";
import {Dict, Func} from "@leyyo/common";
import {MiddlewareScope} from "../literals";
import {Ctx, HttpQueue} from "@leyyo/http";

export interface MdlMetadata<O> {
    before?: boolean;
    scopes: Array<MiddlewareScope>;
    apply: MdlApplyLambda<O>;
}
export type MdlApplyLambda<O> = (opt: O, ctx: Ctx) => void;

export interface MiddlewareCollection {
    after: Array<MiddlewareItem>;
    before: Array<MiddlewareItem>;
}

export interface MiddlewareItem extends Omit<MdlMetadata<Dict>, 'scopes' | 'before'> {
    scope: MiddlewareScope;
    ins: DecoInstanceLike;
    index: number;
    value: any;
}

export interface MiddlewarePoolLike {
    initialize(): void;

    hasClass(ref: ClassReflectionLike, before: boolean): boolean;
    forClass(ref: ClassReflectionLike, before: boolean): Array<HttpQueue<MiddlewareCallback>>;

    hasMethod(ref: PropertyReflectionLike, before: boolean): boolean;
    forMethod(ref: PropertyReflectionLike, before: boolean): Array<HttpQueue<MiddlewareCallback>>;
}



export type MiddlewareCallback = (ctx: Ctx) => void;
