// @todo
export class NotFoundException extends Error {
    constructor(path: string, method: string) {
        super(`Path ${path} could not be found for method ${method}`);
    }
}
