'use strict'

// Memory is an hashmap that represents RAM cells.
// Every cell is undefined at start, undefined means 0x00
// This class throws MemoryExceptions

export default class {

    constructor() {
        this.memory = {};
    }

    // Returns the whole memory object
    getMemory() {
        return this.memory;
    }

    // Sets the whole memory object 
    setMemory(memory) {
        this.memory = {... memory};
    }

    // Gets a single byte from memory
    // If the byte is undefined it's defaulted to 0x00
    getByte(address) {
        address = address | 0; 

        this.isValidAddress(address);

        return this.memory[address] === undefined ? 0x00 : this.memory[address];
    }

    // Gets a word from memory
    getWord(address) {

        let firstBytes = this.getByte(address + 0);
        let secondBytes = this.getByte(address + 1);

        return parseInt(firstBytes + secondBytes, 16);
    }

    // Gets a long-word from memory
    getLong(address) {

        let firstBytes = this.getByte(address + 0);
        let secondBytes = this.getByte(address + 1);
        let thirdBytes = this.getByte(address + 2);
        let fourthBytes = this.getByte(address + 3);

        return parseInt(firstBytes + secondBytes + thirdBytes + fourthBytes, 16);
    }

    set(address, value, size) {
        switch(size) {
            case Emulator.CODE_LONG :
                this.setLong(address, value);
                break;
            case Emulator.CODE_WORD :
                this.setWord(address, value);
                break;
            case Emulator.CODE_BYTE :
                this.setByte(address, value);
                break;
        }
    }

    // Bitwise OR ( | ) yealds a signed 32 bit integer
    // Value gets converted into exadecimal then gets sliced to 1 byte
    // Example 1: value = 25 --> 0x19 gets saved to the byte
    // Example 2: value = 256 --> 0x00 gets saved to the byte
    setByte(address, value) {

        this.isValidAddress(address);

        address = address | 0 ;
        value = value.toString(16).slice(-2); 
        this.memory[address] = value;
    }
  
    // Performs setByte on the most significant on the provided memory address
    // Then performs setByte on the least significant byte storing it in the next memory address
    setWord(address, value) {
        address = address | 0;

        this.setByte(address + 0, value  >>> 8);
        this.setByte(address + 1, value);
    }

    // Same as setWord but four times
    setLong(address, value) {
        address = address | 0;

        this.setByte(address + 0, value >>> 24);
        this.setByte(address + 1, value >>> 16); 
        this.setByte(address + 2, value >>> 8);
        this.setByte(address + 3, value >>> 0);
    }

    // Checks wether an address is in bounds for memory access ( 4GB )
    isValidAddress(address) {
        address = address | 0;
        if(address < 0x00000000 || address > 0x7fffffff) 
            throw new MemoryError("Address out of memory bound", address);
    }
}

// Custom MemoryError class
class MemoryError extends Error {
    constructor(...params) {
        super(...params);

        if (Error.captureStackTrace) 
            Error.captureStackTrace(this, MemoryError);
        
        this.name = 'MemoryError';
        this.date = new Date();
    }
}