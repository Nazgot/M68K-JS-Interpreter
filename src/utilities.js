'use strict'

// Checks if a given instruction is a branch instruction
export function isBranch(instruction) {

    return [
        "bra",
        "ble",
        "bsr",
        "beq",
        "bge",
        "bgt",
        "ble",
        "blt",
        "bne"
    ].some(
        opt => opt == instruction
    );
}

// Checks if a given instruction is a jump immediate instruction
export function isJumpImmediate(instruction) {

    return [
        "jmp",
        "jsr"
    ].some(
        opt => opt == instruction
    );
}

// Checks if a given instruction is an instruction without operators
export function isNoOPsInstruction(instruction) {
    return [
        "rts"
    ].some(
        opt => opt == instruction
    );
}

// Given a register it zeroes a word
export function eraseWord(register) {
    return register & 0xFFFF0000;
}

// Sleeps for x milliseconds (busy waiting)
// Is there a better method to achieve this?
export function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
}


// The following functions might become deprecated after emulator.js update // 

// Given an instruction size returns what is the shift ceiling in bits
export function getShiftCeiling(size) {
    switch (size) {
        case Emulator.CODE_BYTE:
            return 0x08;
        case Emulator.CODE_WORD:
            return 0x10;
        case Emulator.CODE_LONG:
            return 0x1F;
    }
}

export function getMSBMask(size) {
    switch (size) {
        case Emulator.CODE_BYTE:
            return Emulator.MSB_BYTE_MASK;
        case Emulator.CODE_WORD:
            return Emulator.MSB_WORD_MASK;
        case Emulator.CODE_LONG:
            return Emulator.MSB_LONG_MASK;
    }
}

export function type_to_size(type) {
    switch (type) {
        case Emulator.CODE_BYTE:
            return Emulator.SIZE_BYTE;
        case Emulator.CODE_WORD:
            return Emulator.SIZE_WORD;
        case Emulator.CODE_LONG:
            return Emulator.SIZE_LONG;
    }
}
