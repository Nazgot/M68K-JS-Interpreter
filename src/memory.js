'use strict'

import { MEMORY_OUT_OF_BOUND } from "./strings";
import Emulator from "./emulator";
// Memory is an hashmap that represents RAM cells.
// Every cell is undefined at start, undefined means 0x00
// We do this so the undo stack doesn't get bloated unless the memory is actually used
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

        return this.memory[address] || 0x00;
    }

    // Gets a word from memory
    getWord(address) {

        const firstByte = this.getByte(address + 0);
        const secondByte = this.getByte(address + 1);
        return parseInt(firstByte + secondByte, 16);
    }

    // Gets a long-word from memory
    getLong(address) {

        const firstByte = this.getByte(address + 0);
        const secondByte = this.getByte(address + 1);
        const thirdByte = this.getByte(address + 2);
        const fourthByte = this.getByte(address + 3);

        return parseInt(firstByte + secondByte + thirdByte + fourthByte, 16);
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
  
    // Performs setByte on the most significant byte on the provided memory address
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

    // Checks wether an address is in bounds for memory access
    isValidAddress(address) {
        address = address | 0;
        if(address < 0x00000000 || address > 0x7fffffff) 
            throw new MemoryError(MEMORY_OUT_OF_BOUND + address, address);
    }
}

// Custom MemoryError class
class MemoryError extends Error {
    constructor(...params) {
        super(...params);

        if (Error.captureStackTrace) 
            Error.captureStackTrace(this, MemoryError);
        
        this.name = 'MemoryError';
        //TODO convert to Performance.now() for better accuracy?
        this.date = new Date();
        //this.address = address; //TODO ?
    }
}