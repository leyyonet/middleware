// @todo
export class EmptyPathException extends Error {
    constructor(method: string) {
        super(`Path is empty for method ${method}`);
    }
}
