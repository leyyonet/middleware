import e from "express";
import {decoratorPool} from "@leyyo/core";
import {FQN_PCK} from "../internal";
import {MdlMetadata} from "../pool";
import {UseBefore} from "./use-before";

interface O {
    requestHandler: e.RequestHandler;
    isAsync?: boolean;
    secure: boolean;
}

interface P {
    requestHandler: e.RequestHandler;
    secure: boolean;
}

/**
 * @example
 *
 * @Use() //
 * @Use('health')
 * @Use(req => to.dict({status: 200, message: 'success', {from: '...'}}))
 * @Use('health', req => to.dict({status: 200, message: 'success', {from: '...'}}))
 * class MyApplication {
 * // ...
 * }
 * */
export function Use(requestHandler: e.RequestHandler): ClassDecorator;
export function Use(requestHandler: e.RequestHandler, secure: boolean): ClassDecorator;
export function Use(requestHandler: e.RequestHandler): MethodDecorator;
export function Use(requestHandler: e.RequestHandler, secure: boolean): MethodDecorator;
export function Use(requestHandler: e.RequestHandler, secure?: boolean): ClassDecorator|MethodDecorator {
    return (clazz, property, descriptor) =>
        deco.process([clazz, property, descriptor], {requestHandler, secure});
}

const deco = decoratorPool.newClone<O, MdlMetadata<O>, P>(Use, UseBefore)
    .fqn(FQN_PCK)
    .targets('class', 'method')
;
