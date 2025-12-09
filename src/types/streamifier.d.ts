declare module 'streamifier' {
  export function createReadStream(buffer: Buffer): NodeJS.ReadableStream;
  const streamifier: {
    createReadStream(buffer: Buffer): NodeJS.ReadableStream;
  };
  export default streamifier;
}
