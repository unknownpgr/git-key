export declare function hide(encryptedFileName?: string): Promise<string>;
export declare function clear(): Promise<void>;
export declare function reveal(password: string, encryptedFileName?: string): Promise<void>;
export declare function cli(): Promise<void>;
