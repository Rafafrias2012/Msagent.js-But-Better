// buffer.js

// Enum-like object for seek directions
export const SeekDir = {
    BEG: 0,
    CUR: 1,
    END: 2
};

// BufferStream class for parsing binary data
export class BufferStream {
    constructor(buffer, byteOffset = 0) {
        this.bufferImpl = buffer;
        this.dataView = new DataView(this.bufferImpl.buffer, byteOffset);
        this.readPointer = 0;
    }

    seek(where, whence) {
        switch (whence) {
            case SeekDir.BEG:
                this.readPointer = where;
                break;

            case SeekDir.CUR:
                this.readPointer += where;
                break;

            case SeekDir.END:
                if (where > 0) {
                    throw new Error('Cannot use SeekDir.END with where greater than 0');
                }
                this.readPointer = this.bufferImpl.length + where;
                break;
        }

        return this.readPointer;
    }

    tell() {
        return this.seek(0, SeekDir.CUR);
    }

    // Internal method for reading different data types
    _readImpl(func, size, le = undefined) {
        const result = func.call(this.dataView, this.readPointer, le);
        this.readPointer += size;
        return result;
    }

    // Creates a view of a part of the buffer
    subBuffer(len) {
        const oldReadPointer = this.readPointer;
        const buffer = this.bufferImpl.subarray(oldReadPointer, oldReadPointer + len);
        this.readPointer += len;
        return new BufferStream(buffer, oldReadPointer);
    }

    // Signed and unsigned integer read methods
    readS8() {
        return this._readImpl(DataView.prototype.getInt8, 1);
    }

    readU8() {
        return this._readImpl(DataView.prototype.getUint8, 1);
    }

    readS16LE() {
        return this._readImpl(DataView.prototype.getInt16, 2, true);
    }

    readS16BE() {
        return this._readImpl(DataView.prototype.getInt16, 2, false);
    }

    readU16LE() {
        return this._readImpl(DataView.prototype.getUint16, 2, true);
    }

    readU16BE() {
        return this._readImpl(DataView.prototype.getUint16, 2, false);
    }

    readS32LE() {
        return this._readImpl(DataView.prototype.getInt32, 4, true);
    }

    readS32BE() {
        return this._readImpl(DataView.prototype.getInt32, 4, false);
    }

    readU32LE() {
        return this._readImpl(DataView.prototype.getUint32, 4, true);
    }

    readU32BE() {
        return this._readImpl(DataView.prototype.getUint32, 4, false);
    }

    // Temporary offset modification method
    withOffset(where, cb) {
        const last = this.tell();
        this.seek(where, SeekDir.BEG);
        cb();
        this.seek(last, SeekDir.BEG);
    }

    // Boolean read method
    readBool() {
        const res = this.readU8();
        return res !== 0;
    }

    // String reading methods
    readString(len, charReader = this.readU16LE) {
        let str = '';
        for (let i = 0; i < len; ++i) {
            str += String.fromCharCode(charReader.call(this));
        }
        // Dispose of null terminator
        charReader.call(this);
        return str;
    }

    readPascalString(
        lengthReader = this.readU32LE, 
        charReader = this.readU16LE
    ) {
        const len = lengthReader.call(this);
        if (len === 0) return '';
        return this.readString(len, charReader);
    }

    // Data chunk reading methods
    readDataChunkBuffer(lengthReader = this.readU32LE) {
        const len = lengthReader.call(this);
        return this.subBuffer(len);
    }

    readDataChunk(lengthReader = this.readU32LE) {
        return this.readDataChunkBuffer(lengthReader).raw();
    }

    // Counted list reading method
    readCountedList(
        objReader, 
        lengthReader = this.readU32LE
    ) {
        const len = lengthReader.call(this);
        const arr = [];
        
        if (len === 0) return arr;

        for (let i = 0; i < len; ++i) {
            arr.push(objReader(this));
        }

        return arr;
    }

    // Return raw buffer
    raw() {
        return this.bufferImpl;
    }
}
